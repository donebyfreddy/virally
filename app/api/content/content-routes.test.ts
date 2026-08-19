import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StoredGenerationJob, StoredSceneJob } from "@/lib/generation/job-store"

const store = new Map<string, StoredGenerationJob>()
vi.mock("@/lib/generation/job-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/generation/job-store")>()
  return {
    ...actual,
    listJobs: async () => [...store.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    getJob: async (id: string) => store.get(id),
    createJob: async (job: StoredGenerationJob) => { store.set(job.id, job); return job },
    deleteJob: async (id: string) => store.delete(id),
  }
})

import { GET as listContent } from "./route"
import { POST as duplicate } from "./[id]/duplicate/route"
import { DELETE as deleteJobRoute } from "../generation/jobs/[jobId]/route"

function scene(id: string): StoredSceneJob {
  return { sceneId: id, order: 0, durationSeconds: 4, purpose: "", spokenText: "", onScreenText: "", transition: "hard cut", modelId: "kling-3-pro", providerModelId: "fal-ai/kling", status: "REVIEWING", reviewStatus: "READY_FOR_REVIEW", outputUrl: `https://fal.media/${id}.mp4`, currentVersion: 1, versions: [] }
}
function seed(id: string, topic: string): StoredGenerationJob {
  return {
    id, idempotencyKey: `k-${id}`, status: "QUALITY_CHECK", stage: "", createdAt: `2026-01-0${id.at(-1)}T00:00:00.000Z`, updatedAt: "2026-01-01T00:00:00.000Z", estimatedCredits: 40,
    brief: { topic, platform: "tiktok", durationSeconds: 8, language: "English", audience: "Creators", objective: "followers", format: "Educational", tone: "Direct" },
    settings: { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 },
    scenes: [scene(`${id}-a`), scene(`${id}-b`)],
  }
}

describe("content library routes", () => {
  beforeEach(() => { store.clear(); store.set("job1", seed("job1", "Idea one")); store.set("job2", seed("job2", "Idea two")) })

  it("lists every project as a content item, newest first", async () => {
    const response = await listContent()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.items).toHaveLength(2)
    expect(body.items[0].title).toBe("Idea two")
    expect(body.items[0]).toMatchObject({ platform: "tiktok", sceneCount: 2, status: "READY_FOR_REVIEW" })
  })

  it("duplicates a project into an independent copy with no credits charged", async () => {
    const response = await duplicate(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ id: "job1" }) })
    const body = await response.json()
    expect(response.status).toBe(201)
    expect(body.id).not.toBe("job1")
    const copy = store.get(body.id)!
    expect(copy.brief!.topic).toBe("Idea one (copy)")
    expect(copy.creditLedger).toEqual([])
    expect(store.size).toBe(3)
  })

  it("deletes a project", async () => {
    const response = await deleteJobRoute(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ jobId: "job1" }) })
    expect(response.status).toBe(200)
    expect(store.has("job1")).toBe(false)
    const missing = await deleteJobRoute(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ jobId: "nope" }) })
    expect(missing.status).toBe(404)
  })
})
