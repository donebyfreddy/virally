import { describe, expect, it } from "vitest"
import type { CreativeBrief, GenerationSettings } from "./domain"
import { approvedSignature, buildCaptionCues, buildEditPlan, classifyChange, deriveEditStyle, detectEmphasis, editPlanSchema, estimateSceneRegeneration, safeAreaFor, selectCaptionStyle, type EditableScene } from "./edit-engine"

const brief: CreativeBrief = { topic: "Turn one idea into a week of content", platform: "tiktok", durationSeconds: 12, language: "English", audience: "Creators", objective: "followers", format: "Educational", tone: "Direct", cta: "Follow for more" }
const settings: GenerationSettings = { preset: "quality", aspectRatio: "9:16", resolution: "720p", audio: "voiceover_music", variants: 1 }

function editableScenes(): EditableScene[] {
  return [
    { sceneId: "s1", order: 0, durationSeconds: 3, purpose: "hook", spokenText: "You don't need MORE ideas", onScreenText: "One idea", transition: "hard cut", outputUrl: "https://fal.media/s1.mp4" },
    { sceneId: "s2", order: 1, durationSeconds: 5, purpose: "value", spokenText: "You need a repeatable system to win", onScreenText: "", transition: "match cut", outputUrl: "https://fal.media/s2.mp4" },
    { sceneId: "s3", order: 2, durationSeconds: 4, purpose: "cta", spokenText: "Follow for more creator systems", onScreenText: "", transition: "fade", outputUrl: "https://fal.media/s3.mp4" },
  ]
}

describe("edit engine", () => {
  it("derives a content-adaptive style rather than one style for everything", () => {
    expect(deriveEditStyle(brief)).toBe("educational")
    expect(deriveEditStyle({ ...brief, format: "UGC" })).toBe("ugc")
    expect(deriveEditStyle({ ...brief, tone: "Luxury, elegant" })).toBe("premium")
    expect(deriveEditStyle({ ...brief, format: "Founder story", tone: "Cinematic" })).toBe("cinematic")
    expect(deriveEditStyle({ ...brief, format: "Contrarian", tone: "Bold, high energy" })).toBe("high_energy")
    expect(selectCaptionStyle("high_energy")).toBe("Karaoke")
  })

  it("detects emphasis words (uppercase, numbers, key lexicon)", () => {
    expect(detectEmphasis("You need a SYSTEM now")).toEqual(expect.arrayContaining(["SYSTEM", "now"]))
    expect(detectEmphasis("Save 3 hours every week")).toEqual(expect.arrayContaining(["3", "Save"]))
  })

  it("splits spoken lines into timed caption cues inside the scene duration", () => {
    const cues = buildCaptionCues("You need a repeatable system to win now", 6)
    expect(cues.length).toBeGreaterThan(1)
    expect(cues[0].startSeconds).toBe(0)
    expect(cues.at(-1)!.endSeconds).toBeCloseTo(6, 5)
    for (const cue of cues) expect(cue.endSeconds).toBeLessThanOrEqual(6.0001)
  })

  it("builds a valid, schema-checked EditPlan from approved scenes", () => {
    const plan = buildEditPlan({ brief, settings, scenes: editableScenes() })
    expect(() => editPlanSchema.parse(plan)).not.toThrow()
    expect(plan.durationSeconds).toBe(12)
    expect(plan.width).toBe(1080)
    expect(plan.height).toBe(1920)
    expect(plan.scenes).toHaveLength(3)
    // Scenes are laid out end to end.
    expect(plan.scenes[0].startSeconds).toBe(0)
    expect(plan.scenes[1].startSeconds).toBe(3)
    expect(plan.scenes[2].startSeconds).toBe(8)
    // First scene gets special hook treatment (motion), first transition is a hard cut.
    expect(plan.scenes[0].transitionIn).toBe("hard_cut")
    expect(plan.scenes[0].motion).not.toBe("none")
    expect(plan.cta?.text).toBe("Follow for more")
  })

  it("adapts the edit: premium is calmer than high-energy", () => {
    const premium = buildEditPlan({ brief: { ...brief, tone: "Luxury, elegant" }, settings, scenes: editableScenes() })
    const energetic = buildEditPlan({ brief: { ...brief, format: "Contrarian", tone: "Bold, high energy" }, settings, scenes: editableScenes() })
    expect(premium.soundEffects.length).toBeLessThanOrEqual(energetic.soundEffects.length)
    expect(premium.captionStyle).toBe("Premium")
  })

  it("throws when there are no approved scenes", () => {
    expect(() => buildEditPlan({ brief, settings, scenes: [] })).toThrow(/at least one/)
  })

  it("classifies render-only vs generative changes", () => {
    expect(classifyChange("caption")).toBe("render_only")
    expect(classifyChange("music")).toBe("render_only")
    expect(classifyChange("order")).toBe("render_only")
    expect(classifyChange("replaceVisual")).toBe("generative")
    expect(classifyChange("prompt")).toBe("generative")
  })

  it("estimates single-scene regeneration cost from the model registry (never hardcoded)", () => {
    const base = estimateSceneRegeneration({ scene: { durationSeconds: 4, modelId: "kling-3-pro" }, settings })
    expect(base.credits).toBeGreaterThan(0)
    expect(base.changeKind).toBe("generative")
    // A pricier model costs more credits for the same duration.
    const veo = estimateSceneRegeneration({ scene: { durationSeconds: 4, modelId: "kling-3-pro" }, settings, overrides: { modelId: "veo-3.1" } })
    expect(veo.credits).toBeGreaterThan(base.credits)
    // A longer scene costs more.
    const longer = estimateSceneRegeneration({ scene: { durationSeconds: 8, modelId: "kling-3-pro" }, settings })
    expect(longer.credits).toBeGreaterThan(base.credits)
  })

  it("produces a stable approved signature that changes when a version changes", () => {
    const a = approvedSignature([{ sceneId: "s1", outputUrl: "u1", currentVersion: 1 }])
    const b = approvedSignature([{ sceneId: "s1", outputUrl: "u1", currentVersion: 2 }])
    expect(a).not.toBe(b)
  })

  it("keeps captions within platform safe areas per platform", () => {
    expect(safeAreaFor("tiktok").bottom).toBeGreaterThan(safeAreaFor("linkedin").bottom)
  })
})
