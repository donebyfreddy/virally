import { NextResponse } from "next/server"
import { z } from "zod"
import { getJob, saveJob } from "@/lib/generation/job-store"
import { deleteVersion, restoreVersion } from "@/lib/generation/review"

const bodySchema = z.object({ action: z.enum(["restore", "delete"]), version: z.number().int().positive() })

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string; sceneId: string }> }) {
  const { jobId, sceneId } = await params
  try {
    const { action, version } = bodySchema.parse(await request.json().catch(() => ({})))
    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
    const next = action === "restore" ? restoreVersion(job, sceneId, version) : deleteVersion(job, sceneId, version)
    return NextResponse.json({ job: await saveJob(next) })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid version action", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update versions." }, { status: 422 })
  }
}
