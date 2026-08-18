import { describe, expect, it } from "vitest"
import type { StoredGenerationJob, StoredSceneJob } from "./job-store"
import { approvalSummary, approveScene, beginRegeneration, completeRegeneration, deleteVersion, failRegeneration, readyForEdit, rejectScene, restoreVersion } from "./review"

function scene(id: string, order: number, patch: Partial<StoredSceneJob> = {}): StoredSceneJob {
  return {
    sceneId: id, order, durationSeconds: 4, purpose: "value", spokenText: "One idea is enough", onScreenText: "", transition: "hard cut",
    modelId: "kling-3-pro", providerModelId: "fal-ai/kling-video/v3/pro/text-to-video",
    status: "REVIEWING", reviewStatus: "READY_FOR_REVIEW", outputUrl: `https://fal.media/${id}-v1.mp4`,
    currentVersion: 1, versions: [{ version: 1, modelId: "kling-3-pro", providerModelId: "fal-ai/kling-video/v3/pro/text-to-video", outputUrl: `https://fal.media/${id}-v1.mp4`, createdAt: "2026-01-01T00:00:00.000Z" }],
    ...patch,
  }
}

function job(): StoredGenerationJob {
  return {
    id: "00000000-0000-0000-0000-000000000000", idempotencyKey: "key", status: "QUALITY_CHECK", stage: "Ready for review",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", estimatedCredits: 40,
    brief: { topic: "Content systems", platform: "tiktok", durationSeconds: 12, language: "English", audience: "Creators", objective: "followers", format: "Educational", tone: "Direct" },
    settings: { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 },
    scenes: [scene("s1", 0), scene("s2", 1), scene("s3", 2)],
  }
}

describe("scene review state machine", () => {
  it("approves a single scene without touching the others", () => {
    const next = approveScene(job(), "s2")
    expect(next.scenes.find((s) => s.sceneId === "s2")!.reviewStatus).toBe("APPROVED")
    expect(next.scenes.find((s) => s.sceneId === "s1")!.reviewStatus).toBe("READY_FOR_REVIEW")
    expect(next.scenes.find((s) => s.sceneId === "s3")!.reviewStatus).toBe("READY_FOR_REVIEW")
  })

  it("approve is idempotent", () => {
    const once = approveScene(job(), "s1")
    const twice = approveScene(once, "s1")
    expect(twice.scenes.find((s) => s.sceneId === "s1")!.reviewStatus).toBe("APPROVED")
  })

  it("refuses to approve a scene with no asset", () => {
    const draft = { ...job(), scenes: [scene("s1", 0, { outputUrl: undefined, reviewStatus: "GENERATING", versions: [] })] }
    expect(() => approveScene(draft, "s1")).toThrow(/still generating/)
  })

  it("regenerating one scene preserves every other scene's asset and approval", () => {
    let state = approveScene(job(), "s1")
    state = approveScene(state, "s3")
    const before = state.scenes.map((s) => s.outputUrl)
    state = beginRegeneration(state, "s2", { prompt: "A cleaner desk shot" }, "idem-key-1234567890")
    const s2 = state.scenes.find((s) => s.sceneId === "s2")!
    expect(s2.reviewStatus).toBe("REGENERATING")
    expect(s2.prompt).toBe("A cleaner desk shot")
    // Other scenes are untouched.
    expect(state.scenes.find((s) => s.sceneId === "s1")!.reviewStatus).toBe("APPROVED")
    expect(state.scenes.find((s) => s.sceneId === "s1")!.outputUrl).toBe(before[0])
    expect(state.scenes.find((s) => s.sceneId === "s3")!.outputUrl).toBe(before[2])
  })

  it("keeps previous versions when regenerating and can restore them", () => {
    let state = beginRegeneration(job(), "s2", {}, "idem-key-1234567890")
    state = completeRegeneration(state, "s2", { outputUrl: "https://fal.media/s2-v2.mp4", providerRequestId: "req-2" })
    const s2 = state.scenes.find((s) => s.sceneId === "s2")!
    expect(s2.currentVersion).toBe(2)
    expect(s2.versions).toHaveLength(2)
    expect(s2.outputUrl).toBe("https://fal.media/s2-v2.mp4")
    expect(s2.reviewStatus).toBe("READY_FOR_REVIEW")

    const restored = restoreVersion(state, "s2", 1)
    const restoredScene = restored.scenes.find((s) => s.sceneId === "s2")!
    expect(restoredScene.currentVersion).toBe(1)
    expect(restoredScene.outputUrl).toBe("https://fal.media/s2-v1.mp4")
    expect(restoredScene.versions).toHaveLength(2) // history preserved, nothing destroyed
  })

  it("rolls a failed regeneration back to the last good version", () => {
    let state = beginRegeneration(job(), "s2", {}, "idem-key-1234567890")
    state = failRegeneration(state, "s2", "Provider timeout")
    const s2 = state.scenes.find((s) => s.sceneId === "s2")!
    expect(s2.reviewStatus).toBe("READY_FOR_REVIEW")
    expect(s2.outputUrl).toBe("https://fal.media/s2-v1.mp4")
    expect(s2.error).toBe("Provider timeout")
  })

  it("will not delete the version in use, but deletes older ones", () => {
    let state = beginRegeneration(job(), "s2", {}, "idem-key-1234567890")
    state = completeRegeneration(state, "s2", { outputUrl: "https://fal.media/s2-v2.mp4" })
    expect(() => deleteVersion(state, "s2", 2)).toThrow(/currently in use/)
    const pruned = deleteVersion(state, "s2", 1)
    expect(pruned.scenes.find((s) => s.sceneId === "s2")!.versions).toHaveLength(1)
  })

  it("gates the edit until every scene is approved", () => {
    let state = job()
    expect(readyForEdit(state)).toBe(false)
    expect(approvalSummary(state)).toMatchObject({ approved: 0, total: 3, allApproved: false })
    state = approveScene(state, "s1")
    state = approveScene(state, "s2")
    expect(readyForEdit(state)).toBe(false)
    state = approveScene(state, "s3")
    expect(readyForEdit(state)).toBe(true)
    expect(approvalSummary(state)).toMatchObject({ approved: 3, total: 3, allApproved: true })
  })

  it("rejecting a scene blocks the edit", () => {
    let state = job()
    state = approveScene(state, "s1")
    state = approveScene(state, "s2")
    state = rejectScene(state, "s3")
    expect(readyForEdit(state)).toBe(false)
  })
})
