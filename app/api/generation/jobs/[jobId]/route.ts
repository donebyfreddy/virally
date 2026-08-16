import { NextResponse } from "next/server"
import { FalQueueProvider } from "@/lib/generation/fal-provider"
import { getJob, saveJob } from "@/lib/generation/job-store"

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = getJob(jobId)
  if (!job) return NextResponse.json({ error: "Generation job was not found or the temporary server process restarted." }, { status: 404 })
  if (!process.env.FAL_KEY || job.status === "COMPLETED" || job.status === "FAILED") return NextResponse.json({ job })
  const provider = new FalQueueProvider()
  for (const scene of job.scenes.filter(({ status, providerRequestId }) => (status === "QUEUED" || status === "GENERATING") && providerRequestId)) {
    try {
      const status = await provider.getStatus({ modelId: scene.modelId, providerModelId: scene.providerModelId, providerRequestId: scene.providerRequestId! }) as { status?: string }
      if (status.status === "COMPLETED") {
        const result = await provider.getResult({ modelId: scene.modelId, providerModelId: scene.providerModelId, providerRequestId: scene.providerRequestId! }) as { data?: { video?: { url?: string }; images?: Array<{ url?: string }> } }
        scene.outputUrl = result.data?.video?.url ?? result.data?.images?.[0]?.url
        scene.status = "REVIEWING"
      } else if (status.status === "IN_PROGRESS") scene.status = "GENERATING"
    } catch (error) {
      scene.status = "FAILED"
      scene.error = error instanceof Error ? error.message : "Unable to read provider status"
    }
  }
  if (job.scenes.some(({ status }) => status === "FAILED")) { job.status = "FAILED"; job.stage = "A scene needs attention" }
  else if (job.scenes.every(({ status }) => status === "APPROVED" || status === "REVIEWING")) { job.status = "QUALITY_CHECK"; job.stage = "Quality review" }
  else { job.status = "GENERATING_VIDEO"; job.stage = `Generating scene ${Math.max(1, job.scenes.findIndex(({ status }) => status === "GENERATING" || status === "QUEUED") + 1)} of ${job.scenes.length}` }
  return NextResponse.json({ job: saveJob(job) })
}
