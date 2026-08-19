import { describe, expect, it } from "vitest"
import { reserve, settle } from "./credits"
import type { StoredGenerationJob, StoredSceneJob } from "./job-store"
import { contentStatusForJob, toContentItem } from "./content"

function scene(id: string, patch: Partial<StoredSceneJob> = {}): StoredSceneJob {
  return {
    sceneId: id, order: 0, durationSeconds: 4, purpose: "value", spokenText: "", onScreenText: "", transition: "hard cut",
    modelId: "kling-3-pro", providerModelId: "fal-ai/kling", status: "REVIEWING", reviewStatus: "READY_FOR_REVIEW",
    outputUrl: `https://fal.media/${id}.mp4`, currentVersion: 1, versions: [], ...patch,
  }
}

function job(patch: Partial<StoredGenerationJob> = {}): StoredGenerationJob {
  return {
    id: "job-1", idempotencyKey: "k", status: "QUALITY_CHECK", stage: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    estimatedCredits: 40,
    brief: { topic: "Turn one idea into a content week", platform: "tiktok", durationSeconds: 8, language: "English", audience: "Creators", objective: "followers", format: "Educational", tone: "Direct" },
    settings: { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 },
    scenes: [scene("s1"), scene("s2")],
    ...patch,
  }
}

describe("content status mapping", () => {
  it("is GENERATING while a scene is still generating", () => {
    expect(contentStatusForJob(job({ scenes: [scene("s1", { reviewStatus: "GENERATING", outputUrl: undefined })] }))).toBe("GENERATING")
  })
  it("is FAILED when any scene failed", () => {
    expect(contentStatusForJob(job({ scenes: [scene("s1", { reviewStatus: "FAILED", outputUrl: undefined })] }))).toBe("FAILED")
  })
  it("is READY_FOR_REVIEW when scenes are ready but no edit exists", () => {
    expect(contentStatusForJob(job())).toBe("READY_FOR_REVIEW")
  })
  it("is COMPLETED when an up-to-date edit exists", () => {
    const scenes = [scene("s1", { reviewStatus: "APPROVED" }), scene("s2", { reviewStatus: "APPROVED" })]
    const approvedSignature = scenes.map((s) => `${s.sceneId}:${s.currentVersion}:${s.outputUrl ?? ""}`).join("|")
    const built = job({
      scenes,
      editPlan: { version: 1 } as unknown as StoredGenerationJob["editPlan"],
      render: { id: "r", status: "READY", stage: "", steps: [], approvedSignature, createdAt: "", updatedAt: "" },
    })
    expect(contentStatusForJob(built)).toBe("COMPLETED")
  })
  it("respects archived and published flags", () => {
    expect(contentStatusForJob(job({ archived: true }))).toBe("ARCHIVED")
    expect(contentStatusForJob(job({ published: true }))).toBe("PUBLISHED")
  })
})

describe("content item mapping", () => {
  it("derives a library card from the job and credit ledger", () => {
    let ledger = reserve([], 20, "s1")
    ledger = settle(ledger, 20, "s1")
    const item = toContentItem(job({ creditLedger: ledger }))
    expect(item.title).toBe("Turn one idea into a content week")
    expect(item.platform).toBe("tiktok")
    expect(item.durationSeconds).toBe(8)
    expect(item.sceneCount).toBe(2)
    expect(item.creditsUsed).toBe(20)
    expect(item.thumbnailUrl).toBe("https://fal.media/s1.mp4")
  })
  it("surfaces the failure reason for failed projects", () => {
    const item = toContentItem(job({ status: "FAILED", scenes: [scene("s1", { reviewStatus: "FAILED", outputUrl: undefined, providerError: { code: "403", message: "The selected model is unavailable for this account.", timestamp: "t", forbidden: true, retryable: true } })] }))
    expect(item.status).toBe("FAILED")
    expect(item.failureReason).toMatch(/unavailable for this account/)
  })
})
