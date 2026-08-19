import { afterEach, describe, expect, it, vi } from "vitest"
import type { GenerationSettings } from "./domain"
import type { VideoGenerationProvider } from "./fal-provider"
import { describeProviderError, ProviderError } from "./provider-error"
import { submitSceneWithFallback } from "./submit"

const settings: GenerationSettings = { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 }
const scene = { durationSeconds: 5, generationMethod: "text_to_video" as const, referenceUrls: [] as string[], prompt: "A creator at a desk" }

function providerThatForbids(forbiddenModelId: string) {
  const submit = vi.fn(async ({ modelId }: { modelId: string }) => {
    if (modelId === forbiddenModelId) throw new ProviderError(describeProviderError({ status: 403, message: "Forbidden" }))
    return { providerRequestId: "req-1", modelId, providerModelId: "provider/model", submittedAt: "2026-01-01T00:00:00.000Z" }
  })
  return { submit, getStatus: vi.fn(), getResult: vi.fn() } as unknown as VideoGenerationProvider & { submit: typeof submit }
}

describe("submitSceneWithFallback", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("does NOT fall back when fallback is disabled — surfaces the forbidden error", async () => {
    vi.stubEnv("VIRALLY_ENABLE_MODEL_FALLBACK", "")
    const provider = providerThatForbids("kling-3-pro")
    await expect(submitSceneWithFallback(provider, "kling-3-pro", settings, scene)).rejects.toBeInstanceOf(ProviderError)
    expect(provider.submit).toHaveBeenCalledTimes(1)
  })

  it("falls back to another compatible model when enabled and the primary is forbidden", async () => {
    vi.stubEnv("VIRALLY_ENABLE_MODEL_FALLBACK", "true")
    const provider = providerThatForbids("kling-3-pro")
    const result = await submitSceneWithFallback(provider, "kling-3-pro", settings, scene)
    expect(result.usedFallback).toBe(true)
    expect(result.modelId).not.toBe("kling-3-pro")
    expect(provider.submit.mock.calls[0][0].modelId).toBe("kling-3-pro")
  })

  it("never falls back on a non-availability error (e.g. bad input)", async () => {
    vi.stubEnv("VIRALLY_ENABLE_MODEL_FALLBACK", "true")
    const submit = vi.fn(async () => { throw new ProviderError(describeProviderError({ status: 422, body: { detail: "bad duration" } })) })
    const provider = { submit, getStatus: vi.fn(), getResult: vi.fn() } as unknown as VideoGenerationProvider
    await expect(submitSceneWithFallback(provider, "kling-3-pro", settings, scene)).rejects.toBeInstanceOf(ProviderError)
    expect(submit).toHaveBeenCalledTimes(1)
  })
})
