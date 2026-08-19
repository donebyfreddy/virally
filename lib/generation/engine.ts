import type { CostEstimate, GenerationSettings, PlanRequest, ScenePlan } from "./domain"
import { getModel, listAvailableModels, type ModelDefinition } from "./model-registry"

export const CREDIT_CONFIG = { creditsPerDollar: 20, markup: 1.35, minimumCharge: 1, rounding: "ceil" as const }
const presetCandidates = { fast: 1, quality: 1, cinematic: 1, ultra: 2 } as const
const presetRetries = { fast: 0, quality: 1, cinematic: 1, ultra: 2 } as const

export function providerUsdToCredits(usd: number) {
  return Math.max(CREDIT_CONFIG.minimumCharge, Math.ceil(usd * CREDIT_CONFIG.markup * CREDIT_CONFIG.creditsPerDollar))
}

/**
 * A programmatic scene describes the desired editing treatment, but this app
 * does not have a programmatic renderer. Submit it as a real text-to-video
 * request so every generated scene is backed by a provider asset.
 */
export function providerGenerationMethod(method: ScenePlan["generationMethod"]) {
  return method === "programmatic" ? "text_to_video" : method
}

function supports(model: ModelDefinition, scene: ScenePlan, settings: GenerationSettings) {
  return model.modes.includes(providerGenerationMethod(scene.generationMethod)) && model.resolutions.includes(settings.resolution) && model.aspectRatios.includes(settings.aspectRatio) && (!model.duration || (scene.durationSeconds >= model.duration.min && scene.durationSeconds <= model.duration.max)) && (scene.referenceUrls.length === 0 || model.referenceImages)
}

export function routeScene(scene: ScenePlan, settings: GenerationSettings): ModelDefinition {
  const override = scene.modelOverride ?? (scene.generationMethod === "text_to_image" ? settings.imageModel : settings.videoModel)
  if (override) {
    const model = getModel(override)
    if (!model) throw new Error(`Unknown model: ${override}`)
    if (!supports(model, scene, settings)) throw new Error(`${model.label} does not support this scene's method, duration, resolution, aspect ratio, or references`)
    return model
  }
  if (scene.generationMethod === "text_to_image") return getModel("flux-2-pro")!
  const candidates = listAvailableModels("video").filter((model) => supports(model, scene, settings))
  const ranked = candidates.sort((a, b) => {
    if (settings.preset === "fast") return a.pricing.usd - b.pricing.usd
    if (settings.preset === "cinematic" || settings.preset === "ultra") return Number(b.qualityTier === "cinematic") - Number(a.qualityTier === "cinematic")
    return Number(b.id === "kling-3-pro") - Number(a.id === "kling-3-pro")
  })
  if (!ranked[0]) throw new Error(`No enabled model supports scene ${scene.id}`)
  return ranked[0]
}

/** Enabled video models that can render this scene, best quality first. Used for fallback routing. */
export function compatibleVideoModels(scene: ScenePlan, settings: GenerationSettings): ModelDefinition[] {
  return listAvailableModels("video")
    .filter((model) => supports(model, scene, settings))
    .sort((a, b) => Number(b.qualityTier === "cinematic") - Number(a.qualityTier === "cinematic"))
}

function modelCost(model: ModelDefinition, scene: ScenePlan, settings: GenerationSettings) {
  const base = model.pricing.unit === "second" ? (settings.audio === "native" && model.pricing.audioUsd ? model.pricing.audioUsd : model.pricing.usd) * scene.durationSeconds : model.pricing.usd
  return base * (model.pricing.resolutionMultiplier?.[settings.resolution] ?? 1)
}

export function estimateGeneration(request: PlanRequest): CostEstimate {
  const multiplier = presetCandidates[request.settings.preset]
  const items = request.scenes.map((scene) => {
    const model = routeScene(scene, request.settings)
    const providerCostUsd = modelCost(model, scene, request.settings) * multiplier
    return { sceneId: scene.id, label: `Scene ${scene.order + 1}`, modelId: model.id, providerCostUsd, credits: providerUsdToCredits(providerCostUsd) }
  })
  const providerCostUsd = items.reduce((sum, item) => sum + item.providerCostUsd, 0)
  const min = request.settings.preset === "fast" ? 60 : request.settings.preset === "quality" ? 120 : 240
  return { providerCostUsd, credits: items.reduce((sum, item) => sum + item.credits, 0), estimatedSeconds: { min, max: min * (request.settings.preset === "ultra" ? 3 : 2.5) }, lineItems: items, disclaimer: "Estimate only. The server must reserve credits atomically before submission and settle against actual provider usage." }
}

export function buildMediaPrompt(scene: ScenePlan, brief: PlanRequest["brief"]) {
  const constraints = ["no watermarks", "no unwanted logos", "no embedded captions", "stable identity", "coherent anatomy", "no flicker", "no unwanted scene cuts"]
  return [`SUBJECT & ACTION:\n${scene.visualDescription}`, `CAMERA:\n${scene.shotType}; ${scene.cameraMovement}`, `ENVIRONMENT & STYLE:\n${brief.tone}; optimized for ${brief.platform}`, `TIMING:\n${scene.durationSeconds} seconds; purpose: ${scene.purpose}`, `MOTION:\n${scene.spokenText || "Natural motion supporting the scene purpose."}`, `CONSTRAINTS:\n${constraints.join(", ")}`].join("\n\n")
}

export function retryPolicy(preset: GenerationSettings["preset"]) {
  return { maxAutomaticRetries: presetRetries[preset], candidates: presetCandidates[preset], requireUserConsentForHigherCostFallback: true }
}

export function validateStoryboardTiming(request: PlanRequest) {
  const actual = request.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0)
  return { valid: actual === request.brief.durationSeconds, actualSeconds: actual, targetSeconds: request.brief.durationSeconds, deltaSeconds: actual - request.brief.durationSeconds }
}

export function createGenerationPlan(request: PlanRequest) {
  const timing = validateStoryboardTiming(request)
  if (!timing.valid) throw new Error(`Storyboard duration is ${timing.actualSeconds}s but the brief targets ${timing.targetSeconds}s`)
  const estimate = estimateGeneration(request)
  return { status: "READY" as const, timing, estimate, retry: retryPolicy(request.settings.preset), scenes: request.scenes.map((scene) => { const model = routeScene(scene, request.settings); return { sceneId: scene.id, modelId: model.id, providerModelId: model.providerModelId, generationMethod: providerGenerationMethod(scene.generationMethod), prompt: buildMediaPrompt(scene, request.brief) } }) }
}
