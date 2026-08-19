import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { reserve } from "@/lib/generation/credits"
import { regenerationOverridesSchema } from "@/lib/generation/domain"
import { compatibleModelsForScene, estimateSceneRegeneration } from "@/lib/generation/edit-engine"
import { FalQueueProvider } from "@/lib/generation/fal-provider"
import { getModel } from "@/lib/generation/model-registry"
import { getJob, saveJob } from "@/lib/generation/job-store"
import { ProviderError } from "@/lib/generation/provider-error"
import { beginRegeneration, findScene, scenePrompt } from "@/lib/generation/review"
import { submitSceneWithFallback } from "@/lib/generation/submit"

const requestSchema = z.object({ overrides: regenerationOverridesSchema.optional() })

// GET returns a server-side credit estimate + compatible models for the dialog.
export async function GET(request: Request, { params }: { params: Promise<{ jobId: string; sceneId: string }> }) {
  const { jobId, sceneId } = await params
  try {
    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
    const scene = findScene(job, sceneId)
    const url = new URL(request.url)
    const overrides = regenerationOverridesSchema.parse({
      modelId: url.searchParams.get("modelId") ?? undefined,
      preset: url.searchParams.get("preset") ?? undefined,
      durationSeconds: url.searchParams.get("durationSeconds") ? Number(url.searchParams.get("durationSeconds")) : undefined,
    })
    const settings = job.settings ?? { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 }
    const estimate = estimateSceneRegeneration({ scene: { durationSeconds: scene.durationSeconds, modelId: scene.modelId }, settings, overrides })
    return NextResponse.json({ estimate, models: compatibleModelsForScene(), prompt: scenePrompt(scene, job), currentModelId: scene.modelId })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid estimate request", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to estimate regeneration." }, { status: 422 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string; sceneId: string }> }) {
  const { jobId, sceneId } = await params
  try {
    if (!process.env.FAL_KEY) return NextResponse.json({ error: "FAL_KEY is not configured on the server." }, { status: 503 })
    const idempotencyKey = request.headers.get("Idempotency-Key")
    if (!idempotencyKey || idempotencyKey.length < 16) return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 })

    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
    const existing = findScene(job, sceneId)
    // Idempotency: a repeated request with the same key returns the in-flight regeneration.
    if (existing.regenerationKey === idempotencyKey && existing.reviewStatus === "REGENERATING") {
      return NextResponse.json({ job, scene: existing, duplicate: true })
    }
    if (existing.reviewStatus === "REGENERATING") return NextResponse.json({ error: "This scene is already regenerating." }, { status: 409 })

    const { overrides } = requestSchema.parse(await request.json().catch(() => ({})))
    const settings = job.settings ?? { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 }

    // Prepare the scene (snapshots current output into version history) BEFORE submitting.
    let next = beginRegeneration(job, sceneId, overrides ?? {}, idempotencyKey)
    const scene = findScene(next, sceneId)
    const model = getModel(scene.modelId)
    if (!model) return NextResponse.json({ error: `Unknown model: ${scene.modelId}` }, { status: 422 })

    const prompt = overrides?.prompt ?? scenePrompt(scene, next)
    const referenceUrl = overrides?.referenceUrls?.[0]
    const generationMethod = model.type === "image" ? "text_to_image" : referenceUrl ? "image_to_video" : "text_to_video"
    const estimate = estimateSceneRegeneration({ scene: { durationSeconds: scene.durationSeconds, modelId: scene.modelId }, settings, overrides })

    try {
      const provider = new FalQueueProvider()
      const { submission, modelId } = await submitSceneWithFallback(provider, scene.modelId, settings, {
        durationSeconds: scene.durationSeconds, generationMethod, referenceUrls: referenceUrl ? [referenceUrl] : [], prompt,
      })
      next = { ...next, creditLedger: reserve(next.creditLedger ?? [], estimate.credits, sceneId, "scene regeneration"), scenes: next.scenes.map((candidate) => candidate.sceneId === sceneId ? { ...candidate, providerRequestId: submission.providerRequestId, providerModelId: submission.providerModelId, modelId, prompt, providerError: undefined } : candidate) }
      next.status = "GENERATING_VIDEO"
      next.stage = `Regenerating scene ${scene.order + 1}`
    } catch (error) {
      // Submission failed — restore the scene to its previous good version; approved work is safe.
      const details = error instanceof ProviderError ? error.details : undefined
      const message = details?.message ?? (error instanceof Error ? error.message : "Provider submission failed")
      next = { ...next, scenes: next.scenes.map((candidate) => {
        if (candidate.sceneId !== sceneId) return candidate
        const previous = candidate.versions.at(-1)
        return { ...candidate, reviewStatus: previous?.outputUrl ? "READY_FOR_REVIEW" as const : "FAILED" as const, status: previous?.outputUrl ? "REVIEWING" as const : "FAILED" as const, outputUrl: previous?.outputUrl ?? candidate.outputUrl, error: message, providerError: details }
      }) }
      await saveJob(next)
      return NextResponse.json({ error: "Scene regeneration could not be submitted. Your approved scenes are safe.", providerError: details, detail: message }, { status: 502 })
    }

    const saved = await saveJob(next)
    return NextResponse.json({ job: saved, scene: findScene(saved, sceneId) }, { status: 202 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid regeneration request", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to regenerate the scene." }, { status: 422 })
  }
}
