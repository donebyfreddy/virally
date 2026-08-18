import { z } from "zod"

export const platformSchema = z.enum(["tiktok", "instagram_reels", "youtube_shorts", "facebook_reels", "linkedin"])
export const objectiveSchema = z.enum(["views", "reach", "followers", "engagement", "comments", "shares", "saves", "leads", "website_traffic", "sign_ups", "sales", "authority", "brand_awareness"])
export const presetSchema = z.enum(["fast", "quality", "cinematic", "ultra"])
export const aspectRatioSchema = z.enum(["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"])
export const resolutionSchema = z.enum(["480p", "720p", "1080p", "4k"])

export const creativeBriefSchema = z.object({
  topic: z.string().trim().min(3).max(1_000),
  product: z.string().trim().max(500).optional(),
  platform: platformSchema,
  durationSeconds: z.number().int().min(5).max(60),
  language: z.string().trim().min(2).max(50).default("English"),
  audience: z.string().trim().min(3).max(1_000),
  objective: objectiveSchema,
  format: z.string().trim().min(2).max(100),
  tone: z.string().trim().min(2).max(100),
  cta: z.string().trim().max(300).optional(),
})

export const scenePlanSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  durationSeconds: z.number().int().min(1).max(30),
  purpose: z.string().min(1),
  spokenText: z.string(),
  onScreenText: z.string(),
  visualDescription: z.string().min(3),
  shotType: z.string().min(1),
  cameraMovement: z.string().min(1),
  generationMethod: z.enum(["programmatic", "text_to_image", "image_to_video", "text_to_video", "reference_to_video"]),
  referenceUrls: z.array(z.url()).max(12).default([]),
  modelOverride: z.string().optional(),
  transition: z.string().min(1),
})

export const generationSettingsSchema = z.object({
  preset: presetSchema.default("quality"),
  aspectRatio: aspectRatioSchema.default("9:16"),
  resolution: resolutionSchema.default("720p"),
  audio: z.enum(["native", "voiceover", "music", "voiceover_music", "none"]).default("voiceover_music"),
  variants: z.number().int().min(1).max(3).default(1),
  imageModel: z.string().optional(),
  videoModel: z.string().optional(),
})

export const planRequestSchema = z.object({
  brief: creativeBriefSchema,
  scenes: z.array(scenePlanSchema).min(1).max(30),
  settings: generationSettingsSchema,
})

export type CreativeBrief = z.infer<typeof creativeBriefSchema>
export type ScenePlan = z.infer<typeof scenePlanSchema>
export type GenerationSettings = z.infer<typeof generationSettingsSchema>
export type PlanRequest = z.infer<typeof planRequestSchema>

export type GenerationJobStatus = "DRAFT" | "PLANNING" | "READY" | "QUEUED" | "GENERATING_KEYFRAMES" | "GENERATING_VIDEO" | "QUALITY_CHECK" | "REGENERATING" | "COMPOSING" | "RENDERING" | "COMPLETED" | "FAILED" | "CANCELLED"
export type SceneJobStatus = "PENDING" | "QUEUED" | "GENERATING" | "REVIEWING" | "APPROVED" | "FAILED" | "REGENERATING"

/**
 * Review status is the human-facing state of a generated scene. It is tracked
 * separately from the provider lifecycle (`SceneJobStatus`) so that approving or
 * regenerating a single scene never disturbs the underlying generation records.
 */
export type SceneReviewStatus = "GENERATING" | "READY_FOR_REVIEW" | "APPROVED" | "REJECTED" | "REGENERATING" | "FAILED"

export const sceneQaReportSchema = z.object({
  visualQuality: z.enum(["good", "fair", "poor", "unknown"]),
  promptAdherence: z.enum(["high", "medium", "low", "unknown"]),
  artifactRisk: z.enum(["low", "medium", "high"]),
  textArtifact: z.boolean(),
  notes: z.array(z.string()).max(12).default([]),
  assessedAt: z.string(),
})
export type SceneQaReport = z.infer<typeof sceneQaReportSchema>

/** Overrides a user may apply when regenerating a single scene. */
export const regenerationOverridesSchema = z.object({
  modelId: z.string().min(1).optional(),
  prompt: z.string().trim().min(3).max(5_000).optional(),
  preset: presetSchema.optional(),
  durationSeconds: z.number().int().min(1).max(30).optional(),
  referenceUrls: z.array(z.url()).max(12).optional(),
}).default({})
export type RegenerationOverrides = z.infer<typeof regenerationOverridesSchema>

/** Distinguishes cheap deterministic re-render edits from expensive AI regeneration. */
export type ChangeKind = "render_only" | "generative"

export type CostEstimate = {
  providerCostUsd: number
  credits: number
  estimatedSeconds: { min: number; max: number }
  lineItems: Array<{ sceneId?: string; label: string; modelId: string; providerCostUsd: number; credits: number }>
  disclaimer: string
}
