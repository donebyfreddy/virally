import "server-only"
import type { EditPlan } from "./edit-engine"
import { exportViaLambda, isLambdaConfigured } from "./remotion-lambda"

/**
 * Render provider seam for exporting an EditPlan to a downloadable MP4.
 *
 * The authoritative preview is the in-browser Remotion composition, which plays
 * the exact deterministic edit described by the EditPlan. A server-side MP4
 * export runs the SAME composition through Remotion Lambda (or a custom HTTP
 * render worker). Both are gated behind configuration, exactly like live
 * generation is gated behind FAL_KEY: when nothing is configured we say so
 * rather than returning a fake file.
 */
export interface RenderProvider {
  export(input: { jobId: string; plan: EditPlan }): Promise<{ status: "COMPLETED" | "FAILED"; outputUrl?: string; error?: string }>
}

function httpWorkerProvider(): RenderProvider | null {
  const endpoint = process.env.VIRALLY_RENDER_WORKER_URL
  const token = process.env.VIRALLY_RENDER_WORKER_TOKEN
  if (!endpoint || !token) return null
  return {
    async export({ jobId, plan }) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, plan }),
      })
      const body = await response.json().catch(() => ({})) as { outputUrl?: string; error?: string }
      if (!response.ok || !body.outputUrl) return { status: "FAILED", error: body.error ?? "Render worker failed to export the video." }
      return { status: "COMPLETED", outputUrl: body.outputUrl }
    },
  }
}

export function getRenderProvider(): RenderProvider | null {
  // Prefer the real Remotion Lambda backend; fall back to a custom HTTP worker.
  if (isLambdaConfigured()) return { export: exportViaLambda }
  return httpWorkerProvider()
}

export function isMp4ExportConfigured(): boolean {
  return isLambdaConfigured() || Boolean(process.env.VIRALLY_RENDER_WORKER_URL && process.env.VIRALLY_RENDER_WORKER_TOKEN)
}
