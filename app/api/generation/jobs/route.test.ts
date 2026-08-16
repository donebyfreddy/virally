import { beforeEach, describe, expect, it, vi } from "vitest"

const submitMock = vi.fn(async () => ({ providerRequestId: "fal-request-1", modelId: "kling-3-pro", providerModelId: "fal-ai/kling-video/v3/pro/text-to-video", submittedAt: new Date().toISOString() }))

vi.mock("@/lib/generation/fal-provider", () => ({
  FalQueueProvider: class {
    submit = submitMock
  },
}))

import { POST } from "./route"

const input = {
  brief: { topic: "A creator workflow", platform: "tiktok", durationSeconds: 5, language: "English", audience: "Solo creators", objective: "followers", format: "Educational", tone: "Direct" },
  scenes: [{ id: "scene-1", order: 0, durationSeconds: 5, purpose: "hook", spokenText: "One idea is enough", onScreenText: "One idea", visualDescription: "Creator closes a notes app", shotType: "close up", cameraMovement: "push in", generationMethod: "text_to_video", referenceUrls: [], transition: "hard cut" }],
  settings: { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "none", variants: 1 },
}

describe("generation job submission", () => {
  beforeEach(() => { vi.stubEnv("FAL_KEY", "test-key"); submitMock.mockClear() })

  it("submits a mocked fal queue job and deduplicates retries", async () => {
    const idempotencyKey = `test-${crypto.randomUUID()}`
    const makeRequest = () => new Request("http://localhost/api/generation/jobs", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) })
    const first = await POST(makeRequest())
    const firstBody = await first.json()
    expect(first.status).toBe(202)
    expect(firstBody.job.scenes[0]).toMatchObject({ status: "QUEUED", providerRequestId: "fal-request-1" })
    const duplicate = await POST(makeRequest())
    expect(await duplicate.json()).toMatchObject({ duplicate: true })
    expect(submitMock).toHaveBeenCalledTimes(1)
  })
})
