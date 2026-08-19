import { NextResponse } from "next/server"
import { toContentItem } from "@/lib/generation/content"
import { listJobs } from "@/lib/generation/job-store"

// The Content Library: every generation project, newest first.
export async function GET() {
  try {
    const jobs = await listJobs(100)
    return NextResponse.json({ items: jobs.map(toContentItem) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load your content library." }, { status: 500 })
  }
}
