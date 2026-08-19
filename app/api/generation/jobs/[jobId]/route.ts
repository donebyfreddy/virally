import { NextResponse } from "next/server"
import { outstandingForScene, refundScene, settle } from "@/lib/generation/credits"
import { FalQueueProvider } from "@/lib/generation/fal-provider"
import { deleteJob, getJob, saveJob, type StoredGenerationJob } from "@/lib/generation/job-store"
import { describeProviderError, ProviderError } from "@/lib/generation/provider-error"
import { assessScene } from "@/lib/generation/qa"
import { completeRegeneration } from "@/lib/generation/review"

function deriveJobStatus(job: StoredGenerationJob) {
  if (job.scenes.some((scene) => scene.reviewStatus === "FAILED")) return { status: "FAILED" as const, stage: "A scene needs attention" }
  const active = job.scenes.filter((scene) => scene.reviewStatus === "GENERATING" || scene.reviewStatus === "REGENERATING")
  if (active.length === 0) return { status: "QUALITY_CHECK" as const, stage: "Ready for review" }
  const index = job.scenes.findIndex((scene) => scene.reviewStatus === "GENERATING" || scene.reviewStatus === "REGENERATING")
  return { status: "GENERATING_VIDEO" as const, stage: `Generating scene ${Math.max(1, index + 1)} of ${job.scenes.length}` }
}

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  let job = await getJob(jobId)
  if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })

  let hasLegacyPlaceholder = false
  job = { ...job, scenes: job.scenes.map((scene) => {
    if (scene.modelId === "virally-motion" && !scene.outputUrl) {
      hasLegacyPlaceholder = true
      return { ...scene, status: "FAILED" as const, reviewStatus: "FAILED" as const, error: "This legacy placeholder was not sent to a video provider. Regenerate the project to create a real scene asset." }
    }
    return scene
  }) }
  if (hasLegacyPlaceholder) {
    job.status = "FAILED"
    job.stage = "A legacy scene needs regeneration"
    return NextResponse.json({ job: await saveJob(job) })
  }

  const stillPolling = job.scenes.some((scene) => (scene.status === "QUEUED" || scene.status === "GENERATING") && scene.providerRequestId)
  if (!process.env.FAL_KEY || !stillPolling || job.status === "COMPLETED") return NextResponse.json({ job })

  const provider = new FalQueueProvider()
  for (const scene of job.scenes.filter(({ status, providerRequestId }) => (status === "QUEUED" || status === "GENERATING") && providerRequestId)) {
    try {
      const status = await provider.getStatus({ modelId: scene.modelId, providerModelId: scene.providerModelId, providerRequestId: scene.providerRequestId! }) as { status?: string }
      if (status.status === "COMPLETED") {
        const result = await provider.getResult({ modelId: scene.modelId, providerModelId: scene.providerModelId, providerRequestId: scene.providerRequestId! }) as { data?: { video?: { url?: string }; images?: Array<{ url?: string }> } }
        const outputUrl = result.data?.video?.url ?? result.data?.images?.[0]?.url
        if (!outputUrl) { throw new Error("Provider completed without returning an asset URL.") }
        const qa = assessScene({ modelId: scene.modelId, durationSeconds: scene.durationSeconds, onScreenText: scene.onScreenText, spokenText: scene.spokenText })
        if (scene.reviewStatus === "REGENERATING") {
          job = completeRegeneration(job, scene.sceneId, { outputUrl, providerRequestId: scene.providerRequestId, providerModelId: scene.providerModelId, modelId: scene.modelId })
          job = { ...job, scenes: job.scenes.map((candidate) => candidate.sceneId === scene.sceneId ? { ...candidate, qa, providerError: undefined, versions: candidate.versions.map((version) => version.version === candidate.currentVersion ? { ...version, qa } : version) } : candidate) }
        } else {
          const version = { version: 1, modelId: scene.modelId, providerModelId: scene.providerModelId, providerRequestId: scene.providerRequestId, outputUrl, prompt: scene.prompt, createdAt: new Date().toISOString(), qa }
          job = { ...job, scenes: job.scenes.map((candidate) => candidate.sceneId === scene.sceneId ? { ...candidate, outputUrl, status: "REVIEWING" as const, reviewStatus: "READY_FOR_REVIEW" as const, currentVersion: 1, versions: [version], qa, providerError: undefined } : candidate) }
        }
        // Settle the credits reserved for this scene now that it produced an asset.
        job = { ...job, creditLedger: settle(job.creditLedger ?? [], outstandingForScene(job.creditLedger ?? [], scene.sceneId), scene.sceneId, "scene completed") }
      } else if (status.status === "IN_PROGRESS") {
        job = { ...job, scenes: job.scenes.map((candidate) => candidate.sceneId === scene.sceneId ? { ...candidate, status: "GENERATING" as const } : candidate) }
      }
    } catch (error) {
      const details = error instanceof ProviderError ? error.details : describeProviderError(error)
      // Regeneration failures roll back to the last good version; the credits reserved
      // for the failed attempt are refunded so a retry never double-charges.
      const canRollBack = scene.reviewStatus === "REGENERATING"
      job = { ...job, creditLedger: refundScene(job.creditLedger ?? [], scene.sceneId, "scene failed"), scenes: job.scenes.map((candidate) => {
        if (candidate.sceneId !== scene.sceneId) return candidate
        const previous = candidate.versions.at(-1)
        const rolledBack = canRollBack && previous?.outputUrl
        return { ...candidate, status: "FAILED" as const, reviewStatus: rolledBack ? "READY_FOR_REVIEW" as const : "FAILED" as const, error: details.message, providerError: details }
      }) }
    }
  }

  const derived = deriveJobStatus(job)
  job.status = derived.status
  job.stage = derived.stage
  return NextResponse.json({ job: await saveJob(job) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const deleted = await deleteJob(jobId)
  if (!deleted) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
  return NextResponse.json({ deleted: true })
}
