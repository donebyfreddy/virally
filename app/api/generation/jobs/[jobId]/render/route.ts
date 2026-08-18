import { NextResponse } from "next/server"
import { editPlanIsStale } from "@/lib/generation/compose"
import { getJob, saveJob, type StoredGenerationJob } from "@/lib/generation/job-store"
import { getRenderProvider, isMp4ExportConfigured } from "@/lib/generation/render-provider"

// MP4 export polls the Lambda render to completion; give it room for short clips.
export const runtime = "nodejs"
export const maxDuration = 300

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = await getJob(jobId)
  if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
  return NextResponse.json({ render: job.render ?? null, mp4ExportConfigured: isMp4ExportConfigured() })
}

/**
 * Exports the finished edit to a downloadable MP4 via the render worker.
 * Deterministic re-renders (caption/music/CTA/order changes) cost no AI credits.
 * When no render worker is configured this returns 501 rather than a fake file.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = await getJob(jobId)
  if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
  if (!job.editPlan || !job.render) return NextResponse.json({ error: "Build the edit before exporting a video." }, { status: 409 })
  if (editPlanIsStale(job)) return NextResponse.json({ error: "The approved scenes changed. Rebuild the edit before exporting." }, { status: 409 })

  const provider = getRenderProvider()
  if (!provider) {
    return NextResponse.json({ error: "MP4 export requires a configured render worker (VIRALLY_RENDER_WORKER_URL). The in-app preview plays the full edit in the meantime.", mp4ExportConfigured: false }, { status: 501 })
  }

  const baseRender = job.render
  const exporting: StoredGenerationJob = { ...job, render: { ...baseRender, status: "EXPORTING", stage: "Exporting MP4", updatedAt: new Date().toISOString() } }
  await saveJob(exporting)
  try {
    const result = await provider.export({ jobId, plan: job.editPlan })
    const next: StoredGenerationJob = { ...exporting, render: { ...baseRender, status: result.status === "COMPLETED" ? "COMPLETED" : "FAILED", stage: result.status === "COMPLETED" ? "MP4 ready" : "Export failed", outputUrl: result.outputUrl, error: result.error, updatedAt: new Date().toISOString() } }
    const saved = await saveJob(next)
    return NextResponse.json({ render: saved.render }, { status: result.status === "COMPLETED" ? 200 : 502 })
  } catch (error) {
    const next: StoredGenerationJob = { ...exporting, render: { ...baseRender, status: "FAILED", stage: "Export failed", error: error instanceof Error ? error.message : "Render export failed", updatedAt: new Date().toISOString() } }
    await saveJob(next)
    return NextResponse.json({ error: "The final render failed. Your scenes are safe.", render: next.render }, { status: 502 })
  }
}
