import type { ScenePlan } from "./domain"

export type ModelDefinition = {
  id: string
  label: string
  provider: "fal" | "virally"
  providerModelId: string
  type: "image" | "video" | "programmatic"
  modes: ScenePlan["generationMethod"][]
  resolutions: readonly string[]
  aspectRatios: readonly string[]
  duration: { min: number; max: number } | null
  audio: boolean
  referenceImages: boolean
  referenceVideos: boolean
  qualityTier: "fast" | "quality" | "cinematic"
  pricing: { unit: "image" | "second" | "programmatic"; usd: number; audioUsd?: number; resolutionMultiplier?: Partial<Record<string, number>> }
  status: "enabled" | "beta" | "disabled" | "deprecated"
  schemaVerifiedAt: string
}

export const MODEL_REGISTRY = {
  "flux-2-pro": {
    id: "flux-2-pro", label: "FLUX.2 Pro", provider: "fal", providerModelId: "fal-ai/flux-2-pro", type: "image",
    modes: ["text_to_image"], resolutions: ["720p", "1080p"], aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"], duration: null, audio: false, referenceImages: false, referenceVideos: false, qualityTier: "quality",
    pricing: { unit: "image", usd: 0.03, resolutionMultiplier: { "1080p": 1.5 } }, status: "enabled", schemaVerifiedAt: "2026-08-16",
  },
  "kling-3-pro": {
    id: "kling-3-pro", label: "Kling 3 Pro", provider: "fal", providerModelId: "fal-ai/kling-video/v3/pro/image-to-video", type: "video",
    modes: ["image_to_video", "text_to_video"], resolutions: ["720p", "1080p"], aspectRatios: ["9:16", "16:9", "1:1"], duration: { min: 3, max: 15 }, audio: true, referenceImages: true, referenceVideos: true, qualityTier: "cinematic",
    pricing: { unit: "second", usd: 0.112, audioUsd: 0.168 }, status: "enabled", schemaVerifiedAt: "2026-08-16",
  },
  "veo-3.1": {
    id: "veo-3.1", label: "Veo 3.1", provider: "fal", providerModelId: "fal-ai/veo3.1/image-to-video", type: "video",
    modes: ["image_to_video"], resolutions: ["720p", "1080p", "4k"], aspectRatios: ["9:16", "16:9", "1:1"], duration: { min: 4, max: 8 }, audio: true, referenceImages: true, referenceVideos: false, qualityTier: "cinematic",
    pricing: { unit: "second", usd: 0.2, audioUsd: 0.4, resolutionMultiplier: { "4k": 1.5 } }, status: "enabled", schemaVerifiedAt: "2026-08-16",
  },
  "seedance-2": {
    id: "seedance-2", label: "Seedance 2", provider: "fal", providerModelId: "bytedance/seedance-2.0/image-to-video", type: "video",
    modes: ["image_to_video", "text_to_video", "reference_to_video"], resolutions: ["480p", "720p", "1080p"], aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"], duration: { min: 4, max: 15 }, audio: true, referenceImages: true, referenceVideos: true, qualityTier: "quality",
    pricing: { unit: "second", usd: 0.3034, audioUsd: 0.3034, resolutionMultiplier: { "480p": 0.45, "1080p": 2.248 } }, status: "beta", schemaVerifiedAt: "2026-08-16",
  },
} as const satisfies Record<string, ModelDefinition>

export type ModelId = keyof typeof MODEL_REGISTRY

export function getModel(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY[id as ModelId]
}

export function listAvailableModels(type?: ModelDefinition["type"]) {
  return (Object.values(MODEL_REGISTRY) as ModelDefinition[]).filter((model) => model.status !== "disabled" && model.status !== "deprecated" && (!type || model.type === type))
}
