import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StoredGenerationJob, StoredSceneJob } from "@/lib/generation/job-store"

const submitMock = vi.fn(async () => ({ providerRequestId: "fal-regen-1", modelId: "kling-3-pro", providerModelId: "fal-ai/kling-video/v3/pro/text-to-video", submittedAt: new Date().toISOString() }))
vi.mock("@/lib/generation/fal-provider", () => ({ FalQueueProvider: class { submit = submitMock } }))

const store = new Map<string, StoredGenerationJob>()
vi.mock("@/lib/generation/job-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/generation/job-store")>()
  return {
    ...actual,
    getJob: async (id: string) => store.get(id),
    saveJob: async (job: StoredGenerationJob) => { store.set(job.id, job); return job },
  }
})

import { POST as reviewPost } from "./jobs/[jobId]/scenes/[sceneId]/review/route"
import { GET as regenGet, POST as regenPost } from "./jobs/[jobId]/scenes/[sceneId]/regenerate/route"
import { POST as editPost } from "./jobs/[jobId]/edit/route"

const JOB_ID = "11111111-1111-1111-1111-111111111111"

function scene(id: string, order: number): StoredSceneJob {
  return {
    sceneId: id, order, durationSeconds: 4, purpose: "value", spokenText: "One idea is enough", onScreenText: "", transition: "hard cut",
    modelId: "kling-3-pro", providerModelId: "fal-ai/kling-video/v3/pro/text-to-video",
    status: "REVIEWING", reviewStatus: "READY_FOR_REVIEW", outputUrl: `https://fal.media/${id}-v1.mp4`,
    currentVersion: 1, versions: [{ version: 1, modelId: "kling-3-pro", providerModelId: "fal-ai/kling-video/v3/pro/text-to-video", outputUrl: `https://fal.media/${id}-v1.mp4`, createdAt: "2026-01-01T00:00:00.000Z" }],
  }
}

function seedJob() {
  store.clear()
  store.set(JOB_ID, {
    id: JOB_ID, idempotencyKey: "seed", status: "QUALITY_CHECK", stage: "Ready for review", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", estimatedCredits: 40,
    brief: { topic: "Content systems", platform: "tiktok", durationSeconds: 12, language: "English", audience: "Creators", objective: "followers", format: "Educational", tone: "Direct", cta: "Follow for more" },
    settings: { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 },
    scenes: [scene("s1", 0), scene("s2", 1), scene("s3", 2)],
  })
}

const params = (sceneId: string) => ({ params: Promise.resolve({ jobId: JOB_ID, sceneId }) })
const jobParams = { params: Promise.resolve({ jobId: JOB_ID }) }

describe("scene review routes", () => {
  beforeEach(() => { seedJob(); submitMock.mockClear(); vi.stubEnv("FAL_KEY", "test-key") })

  it("approves a scene and reports approval progress", async () => {
    const response = await reviewPost(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "approve" }) }), params("s1"))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.approval).toMatchObject({ approved: 1, total: 3, allApproved: false })
    expect(body.job.scenes.find((s: StoredSceneJob) => s.sceneId === "s1").reviewStatus).toBe("APPROVED")
  })

  it("returns a server-side regeneration estimate from the model registry", async () => {
    const response = await regenGet(new Request(`http://x?modelId=veo-3.1`), params("s2"))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.estimate.credits).toBeGreaterThan(0)
    expect(body.estimate.modelId).toBe("veo-3.1")
    expect(body.models.length).toBeGreaterThan(0)
  })

  it("regenerates only the targeted scene and preserves the others", async () => {
    const before = store.get(JOB_ID)!.scenes.map((s) => s.outputUrl)
    const response = await regenPost(new Request("http://x", { method: "POST", headers: { "Idempotency-Key": "regen-key-1234567890" }, body: JSON.stringify({ overrides: { prompt: "cleaner shot" } }) }), params("s2"))
    const body = await response.json()
    expect(response.status).toBe(202)
    expect(submitMock).toHaveBeenCalledTimes(1)
    const saved = store.get(JOB_ID)!
    expect(saved.scenes.find((s) => s.sceneId === "s2")!.reviewStatus).toBe("REGENERATING")
    expect(saved.scenes.find((s) => s.sceneId === "s2")!.providerRequestId).toBe("fal-regen-1")
    // Other scenes untouched.
    expect(saved.scenes.find((s) => s.sceneId === "s1")!.outputUrl).toBe(before[0])
    expect(saved.scenes.find((s) => s.sceneId === "s3")!.outputUrl).toBe(before[2])
    void body
  })

  it("deduplicates a repeated regeneration with the same idempotency key", async () => {
    const make = () => regenPost(new Request("http://x", { method: "POST", headers: { "Idempotency-Key": "regen-key-abcdef123456" }, body: JSON.stringify({}) }), params("s2"))
    await make()
    const second = await make()
    const body = await second.json()
    expect(body.duplicate).toBe(true)
    expect(submitMock).toHaveBeenCalledTimes(1)
  })

  it("refuses to build the edit until all scenes are approved, then builds a valid plan", async () => {
    const blocked = await editPost(new Request("http://x", { method: "POST", body: "{}" }), jobParams)
    expect(blocked.status).toBe(409)

    for (const id of ["s1", "s2", "s3"]) {
      await reviewPost(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "approve" }) }), params(id))
    }
    const built = await editPost(new Request("http://x", { method: "POST", body: "{}" }), jobParams)
    const body = await built.json()
    expect(built.status).toBe(201)
    expect(body.editPlan.scenes).toHaveLength(3)
    expect(body.editPlan.durationSeconds).toBe(12)
    expect(body.render.status).toBe("READY")

    // Idempotent second call returns the same plan.
    const again = await editPost(new Request("http://x", { method: "POST", body: "{}" }), jobParams)
    expect((await again.json()).duplicate).toBe(true)
  })
})
