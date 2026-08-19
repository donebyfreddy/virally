import { NextResponse } from "next/server"
import { createJob, getJob, type StoredGenerationJob } from "@/lib/generation/job-store"

/**
 * Duplicates a content project into an independent copy (new id) — assets, edit
 * plan and scenes included — so the user can iterate without regenerating. The
 * credit ledger is reset to empty: copying existing assets costs no AI credits.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const source = await getJob(id)
    if (!source) return NextResponse.json({ error: "Content project was not found." }, { status: 404 })
    const now = new Date().toISOString()
    const copy: StoredGenerationJob = {
      ...source,
      id: crypto.randomUUID(),
      idempotencyKey: `duplicate-${crypto.randomUUID()}`,
      brief: source.brief ? { ...source.brief, topic: `${source.brief.topic} (copy)` } : source.brief,
      creditLedger: [],
      archived: false,
      published: false,
      createdAt: now,
      updatedAt: now,
    }
    const created = await createJob(copy)
    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to duplicate this project." }, { status: 422 })
  }
}
