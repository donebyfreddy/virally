import { NextResponse } from "next/server"
import { z } from "zod"
import { getJob, saveJob } from "@/lib/generation/job-store"
import { approvalSummary, approveScene, rejectScene } from "@/lib/generation/review"

const bodySchema = z.object({ action: z.enum(["approve", "reject"]) })

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string; sceneId: string }> }) {
  const { jobId, sceneId } = await params
  try {
    const { action } = bodySchema.parse(await request.json().catch(() => ({})))
    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
    const next = action === "approve" ? approveScene(job, sceneId) : rejectScene(job, sceneId)
    const saved = await saveJob(next)
    return NextResponse.json({ job: saved, approval: approvalSummary(saved) })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid review action", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update the scene." }, { status: 422 })
  }
}
