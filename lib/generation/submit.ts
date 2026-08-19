import "server-only"
import type { GenerationSettings, ScenePlan } from "./domain"
import { compatibleVideoModels, providerGenerationMethod } from "./engine"
import type { ProviderSubmission, VideoGenerationProvider } from "./fal-provider"
import { ProviderError } from "./provider-error"

/**
 * Submits one scene to the provider, with optional automatic fallback to another
 * compatible model when the primary model is forbidden/unavailable for the
 * account (the Kling "Forbidden" case). Fallback only happens when explicitly
 * enabled with VIRALLY_ENABLE_MODEL_FALLBACK=true, and only on availability
 * errors — never on bad input.
 */

export type SceneSubmitInput = {
  durationSeconds: number
  generationMethod: ScenePlan["generationMethod"]
  referenceUrls: string[]
  prompt: string
}

function fallbackEnabled() {
  return process.env.VIRALLY_ENABLE_MODEL_FALLBACK === "true"
}

function fallbackModelIds(primaryModelId: string, scene: SceneSubmitInput, settings: GenerationSettings): string[] {
  if (!fallbackEnabled()) return []
  const pseudoScene: ScenePlan = {
    id: "fallback", order: 0, durationSeconds: scene.durationSeconds, purpose: "", spokenText: "", onScreenText: "",
    visualDescription: scene.prompt || "scene", shotType: "medium", cameraMovement: "subtle", generationMethod: scene.generationMethod,
    referenceUrls: scene.referenceUrls, transition: "hard cut",
  }
  return compatibleVideoModels(pseudoScene, settings).map((model) => model.id).filter((id) => id !== primaryModelId)
}

export type SceneSubmitResult = { submission: ProviderSubmission; modelId: string; usedFallback: boolean }

export async function submitSceneWithFallback(
  provider: VideoGenerationProvider,
  primaryModelId: string,
  settings: GenerationSettings,
  scene: SceneSubmitInput,
): Promise<SceneSubmitResult> {
  const generationMethod = providerGenerationMethod(scene.generationMethod)
  const providerInput: Record<string, unknown> = {
    prompt: scene.prompt,
    duration: String(scene.durationSeconds),
    aspect_ratio: settings.aspectRatio,
    generate_audio: settings.audio === "native",
  }
  if (scene.referenceUrls[0]) providerInput.start_image_url = scene.referenceUrls[0]

  const order = [primaryModelId, ...fallbackModelIds(primaryModelId, scene, settings)]
  let lastError: unknown
  for (let index = 0; index < order.length; index++) {
    try {
      const submission = await provider.submit({ modelId: order[index], generationMethod, providerInput })
      return { submission, modelId: order[index], usedFallback: index > 0 }
    } catch (error) {
      lastError = error
      // Only advance to a fallback model on availability/authorization errors.
      if (!(error instanceof ProviderError && error.details.forbidden)) break
    }
  }
  throw lastError
}
