import { summarize } from "./credits"
import type { StoredGenerationJob } from "./job-store"

/**
 * Maps a stored generation job (the Content Project) to a Content Library item.
 * The job table already holds the brief, storyboard, scenes, assets, edit plan
 * and final video, so no duplicate "project" concept is introduced.
 */

export type ContentStatus = "DRAFT" | "GENERATING" | "READY_FOR_REVIEW" | "EDITING" | "COMPLETED" | "FAILED" | "PUBLISHED" | "ARCHIVED"

export type ContentItem = {
  id: string
  title: string
  platform: string
  objective?: string
  durationSeconds: number
  status: ContentStatus
  createdAt: string
  updatedAt: string
  model: string
  creditsUsed: number
  estimatedCredits: number
  sceneCount: number
  approvedScenes: number
  thumbnailUrl?: string
  finalVideoUrl?: string
  campaign?: string
  hasFinalEdit: boolean
  failureReason?: string
}

const PENDING = new Set(["GENERATING", "REGENERATING"])

export function contentStatusForJob(job: StoredGenerationJob): ContentStatus {
  if (job.archived) return "ARCHIVED"
  if (job.published) return "PUBLISHED"
  if (job.status === "DRAFT") return "DRAFT"
  if (job.status === "FAILED" || job.scenes.some((scene) => scene.reviewStatus === "FAILED")) return "FAILED"
  if (job.scenes.some((scene) => PENDING.has(scene.reviewStatus)) || job.scenes.length === 0) return "GENERATING"
  const allApproved = job.scenes.every((scene) => scene.reviewStatus === "APPROVED")
  if (job.editPlan && job.render && job.render.approvedSignature === signatureOf(job)) return "COMPLETED"
  if (job.editPlan) return "EDITING"
  if (allApproved) return "READY_FOR_REVIEW"
  return "READY_FOR_REVIEW"
}

function signatureOf(job: StoredGenerationJob): string {
  return job.scenes.map((scene) => `${scene.sceneId}:${scene.currentVersion}:${scene.outputUrl ?? ""}`).join("|")
}

function primaryModel(job: StoredGenerationJob): string {
  const counts = new Map<string, number>()
  for (const scene of job.scenes) counts.set(scene.modelId, (counts.get(scene.modelId) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
}

export function toContentItem(job: StoredGenerationJob): ContentItem {
  const status = contentStatusForJob(job)
  const durationSeconds = job.editPlan?.durationSeconds ?? job.scenes.reduce((total, scene) => total + (scene.durationSeconds ?? 0), 0)
  const credits = summarize(job.creditLedger)
  const failedScene = job.scenes.find((scene) => scene.reviewStatus === "FAILED" && (scene.providerError || scene.error))
  return {
    id: job.id,
    title: (job.brief?.topic ?? "Untitled project").slice(0, 80),
    platform: job.brief?.platform ?? "tiktok",
    objective: job.brief?.objective,
    durationSeconds,
    status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    model: primaryModel(job),
    creditsUsed: credits.actual || (status === "COMPLETED" || status === "PUBLISHED" ? job.estimatedCredits : 0),
    estimatedCredits: job.estimatedCredits,
    sceneCount: job.scenes.length,
    approvedScenes: job.scenes.filter((scene) => scene.reviewStatus === "APPROVED").length,
    thumbnailUrl: job.scenes.find((scene) => scene.outputUrl)?.outputUrl,
    finalVideoUrl: job.render?.outputUrl,
    campaign: undefined,
    hasFinalEdit: Boolean(job.editPlan),
    failureReason: failedScene?.providerError?.message ?? failedScene?.error,
  }
}
