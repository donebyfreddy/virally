import type { RegenerationOverrides } from "./domain"
import { buildMediaPrompt } from "./engine"
import type { StoredGenerationJob, StoredSceneJob, StoredSceneVersion } from "./job-store"

/**
 * Pure scene-review state machine. Every function returns a NEW job object and
 * mutates only the target scene — approving or regenerating one scene never
 * touches any other scene. Routes call these, then persist the result.
 */

export function findScene(job: StoredGenerationJob, sceneId: string): StoredSceneJob {
  const scene = job.scenes.find((candidate) => candidate.sceneId === sceneId)
  if (!scene) throw new Error(`Scene ${sceneId} was not found in this project.`)
  return scene
}

function withScene(job: StoredGenerationJob, sceneId: string, update: (scene: StoredSceneJob) => StoredSceneJob): StoredGenerationJob {
  return { ...job, scenes: job.scenes.map((scene) => scene.sceneId === sceneId ? update(scene) : scene) }
}

/** Records the currently displayed output as a version if it is not already stored. */
function ensureCurrentVersioned(scene: StoredSceneJob): StoredSceneVersion[] {
  if (!scene.outputUrl) return scene.versions
  if (scene.versions.some((version) => version.version === scene.currentVersion && version.outputUrl === scene.outputUrl)) return scene.versions
  const nextVersion = (scene.versions.at(-1)?.version ?? 0) + 1
  return [...scene.versions, { version: nextVersion, modelId: scene.modelId, providerModelId: scene.providerModelId, providerRequestId: scene.providerRequestId, outputUrl: scene.outputUrl, prompt: scene.prompt, createdAt: new Date().toISOString(), qa: scene.qa }]
}

export function approveScene(job: StoredGenerationJob, sceneId: string): StoredGenerationJob {
  const scene = findScene(job, sceneId)
  if (scene.reviewStatus === "APPROVED") return job // idempotent
  if (scene.reviewStatus === "GENERATING" || scene.reviewStatus === "REGENERATING") throw new Error("This scene is still generating. Wait for it to be ready for review.")
  if (!scene.outputUrl) throw new Error("This scene has no rendered asset to approve.")
  return withScene(job, sceneId, (current) => ({ ...current, reviewStatus: "APPROVED", status: "APPROVED", versions: ensureCurrentVersioned(current) }))
}

export function rejectScene(job: StoredGenerationJob, sceneId: string): StoredGenerationJob {
  const scene = findScene(job, sceneId)
  if (scene.reviewStatus === "REJECTED") return job // idempotent
  return withScene(job, sceneId, (current) => ({ ...current, reviewStatus: "REJECTED", status: "REVIEWING", versions: ensureCurrentVersioned(current) }))
}

/**
 * Prepares a scene for regeneration: snapshots the current output into version
 * history, applies overrides, and marks it REGENERATING. The caller is
 * responsible for the provider submission and then calling completeRegeneration.
 * Returns the mutated scene alongside the job so the route can build the request.
 */
export function beginRegeneration(job: StoredGenerationJob, sceneId: string, overrides: RegenerationOverrides, regenerationKey: string): StoredGenerationJob {
  const scene = findScene(job, sceneId)
  const versions = ensureCurrentVersioned(scene)
  const nextPrompt = overrides.prompt ?? scene.prompt
  const nextModelId = overrides.modelId && overrides.modelId !== "auto" ? overrides.modelId : scene.modelId
  return withScene(job, sceneId, (current) => ({
    ...current,
    versions,
    prompt: nextPrompt,
    modelId: nextModelId,
    durationSeconds: overrides.durationSeconds ?? current.durationSeconds,
    reviewStatus: "REGENERATING",
    status: "QUEUED",
    error: undefined,
    regenerationKey,
  }))
}

/** Records a freshly generated asset as a new current version and marks it ready for review. */
export function completeRegeneration(job: StoredGenerationJob, sceneId: string, result: { outputUrl: string; providerRequestId?: string; providerModelId?: string; modelId?: string }): StoredGenerationJob {
  return withScene(job, sceneId, (current) => {
    const nextVersion = (current.versions.at(-1)?.version ?? 0) + 1
    const version: StoredSceneVersion = {
      version: nextVersion,
      modelId: result.modelId ?? current.modelId,
      providerModelId: result.providerModelId ?? current.providerModelId,
      providerRequestId: result.providerRequestId,
      outputUrl: result.outputUrl,
      prompt: current.prompt,
      createdAt: new Date().toISOString(),
    }
    return {
      ...current,
      versions: [...current.versions, version],
      currentVersion: nextVersion,
      outputUrl: result.outputUrl,
      modelId: version.modelId,
      providerModelId: version.providerModelId,
      providerRequestId: version.providerRequestId,
      reviewStatus: "READY_FOR_REVIEW",
      status: "REVIEWING",
      error: undefined,
    }
  })
}

export function failRegeneration(job: StoredGenerationJob, sceneId: string, message: string): StoredGenerationJob {
  return withScene(job, sceneId, (current) => {
    // Roll back to the last good version so approved/previous work is never lost.
    const previous = current.versions.at(-1)
    return {
      ...current,
      reviewStatus: previous?.outputUrl ? "READY_FOR_REVIEW" : "FAILED",
      status: previous?.outputUrl ? "REVIEWING" : "FAILED",
      outputUrl: previous?.outputUrl ?? current.outputUrl,
      currentVersion: previous?.version ?? current.currentVersion,
      error: message,
    }
  })
}

/** Points the scene back at a previous version without destroying any history. */
export function restoreVersion(job: StoredGenerationJob, sceneId: string, version: number): StoredGenerationJob {
  const scene = findScene(job, sceneId)
  const target = scene.versions.find((candidate) => candidate.version === version)
  if (!target) throw new Error(`Version ${version} was not found for this scene.`)
  if (!target.outputUrl) throw new Error("That version has no asset to restore.")
  return withScene(job, sceneId, (current) => ({
    ...current,
    currentVersion: target.version,
    outputUrl: target.outputUrl,
    modelId: target.modelId,
    providerModelId: target.providerModelId,
    providerRequestId: target.providerRequestId,
    prompt: target.prompt ?? current.prompt,
    reviewStatus: "READY_FOR_REVIEW",
    status: "REVIEWING",
    error: undefined,
  }))
}

export function deleteVersion(job: StoredGenerationJob, sceneId: string, version: number): StoredGenerationJob {
  const scene = findScene(job, sceneId)
  if (scene.currentVersion === version) throw new Error("You cannot delete the version currently in use.")
  if (scene.versions.length <= 1) throw new Error("A scene must keep at least one version.")
  return withScene(job, sceneId, (current) => ({ ...current, versions: current.versions.filter((candidate) => candidate.version !== version) }))
}

export function approvalSummary(job: StoredGenerationJob) {
  const total = job.scenes.length
  const approved = job.scenes.filter((scene) => scene.reviewStatus === "APPROVED").length
  return { approved, total, allApproved: total > 0 && approved === total }
}

export function readyForEdit(job: StoredGenerationJob): boolean {
  return approvalSummary(job).allApproved
}

/** Builds the provider prompt for a scene, honoring an edited prompt override. */
export function scenePrompt(scene: StoredSceneJob, job: StoredGenerationJob): string {
  if (scene.prompt) return scene.prompt
  if (!job.brief) return scene.spokenText || scene.purpose || "Generate the planned scene."
  return buildMediaPrompt({
    id: scene.sceneId,
    order: scene.order,
    durationSeconds: scene.durationSeconds,
    purpose: scene.purpose,
    spokenText: scene.spokenText,
    onScreenText: "",
    visualDescription: scene.spokenText || scene.purpose || "Scene visual",
    shotType: "medium",
    cameraMovement: "subtle motion",
    generationMethod: "text_to_video",
    referenceUrls: [],
    transition: scene.transition,
  }, job.brief)
}
