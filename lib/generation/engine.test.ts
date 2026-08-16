import { describe, expect, it } from "vitest"
import { planRequestSchema, type PlanRequest } from "./domain"
import { buildMediaPrompt, createGenerationPlan, estimateGeneration, providerGenerationMethod, providerUsdToCredits, retryPolicy, routeScene, validateStoryboardTiming } from "./engine"

const request: PlanRequest = planRequestSchema.parse({
  brief: { topic: "Turn one idea into a content week", platform: "tiktok", durationSeconds: 10, language: "English", audience: "Solo creators", objective: "followers", format: "Educational", tone: "Direct", cta: "Follow" },
  scenes: [
    { id: "s1", order: 0, durationSeconds: 3, purpose: "hook", spokenText: "Stop chasing ideas", onScreenText: "One idea is enough", visualDescription: "Creator closes a crowded notes app", shotType: "close up", cameraMovement: "push in", generationMethod: "programmatic", referenceUrls: [], transition: "hard cut" },
    { id: "s2", order: 1, durationSeconds: 7, purpose: "value", spokenText: "Build a repeatable system", onScreenText: "Hook, story, CTA", visualDescription: "Creator maps three content cards", shotType: "medium", cameraMovement: "slow dolly", generationMethod: "image_to_video", referenceUrls: [], transition: "match cut" },
  ],
  settings: { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 },
})

describe("generation engine", () => {
  it("routes programmatic treatments through a real video provider", () => {
    expect(routeScene(request.scenes[0], request.settings).type).toBe("video")
    expect(providerGenerationMethod(request.scenes[0].generationMethod)).toBe("text_to_video")
    expect(routeScene(request.scenes[1], request.settings).type).toBe("video")
  })
  it("rejects an incompatible manual model override", () => {
    expect(() => routeScene({ ...request.scenes[1], modelOverride: "flux-2-pro" }, request.settings)).toThrow(/does not support/)
  })
  it("estimates provider cost through centralized credit configuration", () => {
    const estimate = estimateGeneration(request)
    expect(estimate.providerCostUsd).toBeGreaterThan(0)
    expect(estimate.credits).toBeGreaterThanOrEqual(providerUsdToCredits(estimate.providerCostUsd))
    expect(estimate.lineItems).toHaveLength(2)
  })
  it("applies bounded retry policies", () => {
    expect(retryPolicy("fast").maxAutomaticRetries).toBe(0)
    expect(retryPolicy("ultra")).toMatchObject({ maxAutomaticRetries: 2, candidates: 2 })
  })
  it("validates exact storyboard timing", () => {
    expect(validateStoryboardTiming(request)).toMatchObject({ valid: true, actualSeconds: 10 })
    expect(validateStoryboardTiming({ ...request, scenes: request.scenes.slice(0, 1) }).valid).toBe(false)
  })
  it("builds structured scene prompts without model-rendered captions", () => {
    const prompt = buildMediaPrompt(request.scenes[1], request.brief)
    expect(prompt).toContain("SUBJECT & ACTION")
    expect(prompt).toContain("no embedded captions")
  })
  it("creates a ready plan only for valid timing", () => {
    expect(createGenerationPlan(request).status).toBe("READY")
    expect(() => createGenerationPlan({ ...request, scenes: request.scenes.slice(0, 1) })).toThrow(/targets 10s/)
  })
})
