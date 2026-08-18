import { NextResponse } from "next/server"
import { z } from "zod"
import { composeEditForJob, editPlanIsStale } from "@/lib/generation/compose"
import { getJob, saveJob } from "@/lib/generation/job-store"
import { approvalSummary } from "@/lib/generation/review"
import { isMp4ExportConfigured } from "@/lib/generation/render-provider"

const bodySchema = z.object({
  branding: z.object({ primaryColor: z.string().optional(), accentColor: z.string().optional(), fontFamily: z.string().optional(), handle: z.string().optional(), logoUrl: z.string().optional() }).optional(),
  hookText: z.string().optional(),
}).default({})

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = await getJob(jobId)
  if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })
  return NextResponse.json({ editPlan: job.editPlan ?? null, render: job.render ?? null, approval: approvalSummary(job), stale: editPlanIsStale(job), mp4ExportConfigured: isMp4ExportConfigured() })
}

/** "Continue to edit": runs the deterministic auto-edit pipeline and persists the EditPlan. Idempotent. */
export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  try {
    const { branding, hookText } = bodySchema.parse(await request.json().catch(() => ({})))
    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: "Generation job was not found." }, { status: 404 })

    const approval = approvalSummary(job)
    if (!approval.allApproved) return NextResponse.json({ error: `Approve every scene first (${approval.approved}/${approval.total} approved).` }, { status: 409 })

    // Idempotent: if a fresh plan already exists for the current approved set, return it.
    if (job.editPlan && job.render && !editPlanIsStale(job)) {
      return NextResponse.json({ editPlan: job.editPlan, render: job.render, duplicate: true })
    }

    const { plan, render } = composeEditForJob(job, { branding, hookText })
    const next = { ...job, editPlan: plan, render, status: "COMPLETED" as const, stage: "Final video ready" }
    const saved = await saveJob(next)
    return NextResponse.json({ editPlan: saved.editPlan, render: saved.render, mp4ExportConfigured: isMp4ExportConfigured() }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid edit request", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to build the edit." }, { status: 422 })
  }
}
