import { z } from "zod"
import type { ChangeKind, CreativeBrief, GenerationSettings, RegenerationOverrides } from "./domain"
import { CREDIT_CONFIG, providerUsdToCredits } from "./engine"
import { getModel, listAvailableModels, type ModelDefinition } from "./model-registry"

/**
 * The edit engine turns approved AI scenes into a deterministic, professionally
 * styled short-form edit. It never calls a model: captions, motion, transitions,
 * emphasis, music, CTA and branding are all decided here so the final video reads
 * as one intentional edit rather than concatenated clips.
 */

export const editStyleSchema = z.enum(["educational", "ugc", "cinematic", "high_energy", "premium", "clean", "minimal", "creator"])
export const captionStyleSchema = z.enum(["Creator", "Bold", "Minimal", "Premium", "Karaoke", "Clean"])
export type EditStyle = z.infer<typeof editStyleSchema>
export type CaptionStyle = z.infer<typeof captionStyleSchema>

export const editPlanSchema = z.object({
  version: z.literal(1),
  platform: z.string(),
  style: editStyleSchema,
  captionStyle: captionStyleSchema,
  durationSeconds: z.number().positive(),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  safeArea: z.object({ top: z.number(), bottom: z.number(), left: z.number(), right: z.number() }),
  hook: z.object({ text: z.string(), treatment: z.string(), emphasis: z.array(z.string()) }),
  scenes: z.array(z.object({
    sceneId: z.string(),
    order: z.number().int().nonnegative(),
    sourceUrl: z.string(),
    startSeconds: z.number().nonnegative(),
    durationSeconds: z.number().positive(),
    motion: z.enum(["none", "punch_in", "punch_out", "pan_left", "pan_right", "slow_scale"]),
    transitionIn: z.enum(["hard_cut", "crossfade", "swipe", "push", "zoom", "blur", "flash", "mask", "match_cut"]),
    captions: z.array(z.object({
      text: z.string(),
      startSeconds: z.number().nonnegative(),
      endSeconds: z.number().nonnegative(),
      emphasis: z.array(z.string()),
    })),
  })),
  music: z.object({ mode: z.enum(["auto", "none", "user", "brand"]), mood: z.string(), duckUnderVoice: z.boolean() }),
  soundEffects: z.array(z.object({ atSeconds: z.number().nonnegative(), type: z.enum(["whoosh", "pop", "click", "impact", "notification", "transition"]) })),
  audioMix: z.object({ voice: z.number(), music: z.number(), sfx: z.number(), nativeScene: z.number() }),
  cta: z.object({ text: z.string(), treatment: z.string(), handle: z.string().optional(), startSeconds: z.number().nonnegative() }).nullable(),
  branding: z.object({ primaryColor: z.string(), accentColor: z.string(), fontFamily: z.string(), handle: z.string().optional(), logoUrl: z.string().optional() }),
  disclaimer: z.string(),
})
export type EditPlan = z.infer<typeof editPlanSchema>

export type EditableScene = {
  sceneId: string
  order: number
  durationSeconds: number
  purpose: string
  spokenText: string
  onScreenText: string
  transition: string
  outputUrl: string
}

export type Branding = { primaryColor?: string; accentColor?: string; fontFamily?: string; handle?: string; logoUrl?: string }

const FPS = 30
const DIMENSIONS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
  "4:3": { width: 1440, height: 1080 },
  "3:4": { width: 1080, height: 1440 },
  "21:9": { width: 2560, height: 1080 },
}

// Words that carry the message and deserve visual emphasis in captions.
const EMPHASIS_LEXICON = new Set(["system", "systems", "more", "free", "now", "stop", "never", "always", "one", "fast", "fastest", "everywhere", "everything", "framework", "story", "hook", "next", "follow", "save", "secret", "proven", "biggest", "worst", "best", "clear", "simple"])

/** Chooses an editing style from the brief. Deterministic — the same brief always maps to the same style. */
export function deriveEditStyle(brief: Pick<CreativeBrief, "format" | "tone" | "objective" | "platform">): EditStyle {
  const format = brief.format.toLowerCase()
  const tone = brief.tone.toLowerCase()
  if (format.includes("ugc")) return "ugc"
  if (tone.includes("luxur") || tone.includes("premium") || tone.includes("elegant")) return "premium"
  if (tone.includes("cinematic") || format.includes("story") || format.includes("founder")) return "cinematic"
  if (tone.includes("energy") || tone.includes("bold") || format.includes("contrarian") || brief.objective === "views" || brief.objective === "reach") return "high_energy"
  if (format.includes("educational") || format.includes("solution") || format.includes("demo")) return "educational"
  if (tone.includes("minimal") || tone.includes("clean")) return "minimal"
  return "creator"
}

export function selectCaptionStyle(style: EditStyle): CaptionStyle {
  const map: Record<EditStyle, CaptionStyle> = {
    educational: "Bold", ugc: "Creator", cinematic: "Minimal", high_energy: "Karaoke",
    premium: "Premium", clean: "Clean", minimal: "Minimal", creator: "Creator",
  }
  return map[style]
}

export function detectEmphasis(text: string): string[] {
  const words = text.split(/\s+/).map((word) => word.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean)
  const emphasis = new Set<string>()
  for (const word of words) {
    const bare = word.toLowerCase()
    if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) emphasis.add(word)
    else if (/^\d[\d.,%]*$/.test(word)) emphasis.add(word)
    else if (EMPHASIS_LEXICON.has(bare)) emphasis.add(word)
  }
  return [...emphasis]
}

/**
 * Splits a scene's spoken line into timed caption cues (max ~4 words per cue for
 * readability), evenly distributed across the scene duration.
 */
export function buildCaptionCues(spokenText: string, sceneDuration: number, maxWordsPerCue = 4) {
  const words = spokenText.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const cues: Array<{ text: string; startSeconds: number; endSeconds: number; emphasis: string[] }> = []
  const groups: string[][] = []
  for (let i = 0; i < words.length; i += maxWordsPerCue) groups.push(words.slice(i, i + maxWordsPerCue))
  const per = sceneDuration / groups.length
  groups.forEach((group, index) => {
    const text = group.join(" ")
    cues.push({ text, startSeconds: round(index * per), endSeconds: round((index + 1) * per), emphasis: detectEmphasis(text) })
  })
  return cues
}

function motionForScene(style: EditStyle, order: number, isHook: boolean, isCta: boolean): EditPlan["scenes"][number]["motion"] {
  if (isHook) return style === "cinematic" || style === "premium" ? "slow_scale" : "punch_in"
  if (isCta) return "none"
  if (style === "premium" || style === "cinematic" || style === "minimal") return order % 2 === 0 ? "slow_scale" : "none"
  if (style === "high_energy") return order % 2 === 0 ? "punch_in" : "punch_out"
  return order % 3 === 0 ? "punch_in" : order % 3 === 1 ? "slow_scale" : "none"
}

const TRANSITION_MAP: Record<string, EditPlan["scenes"][number]["transitionIn"]> = {
  "hard cut": "hard_cut", "match cut": "match_cut", "swipe": "swipe", "push": "push",
  "zoom": "zoom", "blur": "blur", "flash": "flash", "mask": "mask", "dissolve": "crossfade", "crossfade": "crossfade", "fade": "crossfade",
}

function transitionForScene(style: EditStyle, plannedTransition: string, order: number): EditPlan["scenes"][number]["transitionIn"] {
  if (order === 0) return "hard_cut"
  // Modern short-form leans on hard cuts; honor a planned transition but keep it clean.
  const planned = TRANSITION_MAP[plannedTransition.toLowerCase()] ?? "hard_cut"
  if (style === "premium" || style === "cinematic") return planned === "hard_cut" ? "crossfade" : planned
  if (style === "minimal" || style === "clean") return "hard_cut"
  return planned
}

function musicMood(style: EditStyle): string {
  const map: Record<EditStyle, string> = {
    educational: "clean upbeat", ugc: "casual lo-fi", cinematic: "atmospheric", high_energy: "driving energetic",
    premium: "refined minimal", clean: "light neutral", minimal: "sparse ambient", creator: "warm upbeat",
  }
  return map[style]
}

function brandingFor(style: EditStyle, branding: Branding): EditPlan["branding"] {
  const defaults: Record<EditStyle, { primary: string; accent: string }> = {
    educational: { primary: "#e879f9", accent: "#22d3ee" },
    ugc: { primary: "#f472b6", accent: "#a78bfa" },
    cinematic: { primary: "#e5e7eb", accent: "#f59e0b" },
    high_energy: { primary: "#f0abfc", accent: "#facc15" },
    premium: { primary: "#f5f5f4", accent: "#c084fc" },
    clean: { primary: "#ffffff", accent: "#22d3ee" },
    minimal: { primary: "#ffffff", accent: "#e879f9" },
    creator: { primary: "#e879f9", accent: "#8b5cf6" },
  }
  const preset = defaults[style]
  return {
    primaryColor: branding.primaryColor ?? preset.primary,
    accentColor: branding.accentColor ?? preset.accent,
    fontFamily: branding.fontFamily ?? "Space Grotesk, ui-sans-serif, sans-serif",
    handle: branding.handle,
    logoUrl: branding.logoUrl,
  }
}

/** Platform UI safe areas as a fraction of frame height/width. Captions stay inside these. */
export function safeAreaFor(platform: string): EditPlan["safeArea"] {
  const map: Record<string, EditPlan["safeArea"]> = {
    tiktok: { top: 0.08, bottom: 0.22, left: 0.05, right: 0.18 },
    instagram_reels: { top: 0.1, bottom: 0.2, left: 0.05, right: 0.16 },
    youtube_shorts: { top: 0.08, bottom: 0.16, left: 0.05, right: 0.14 },
    facebook_reels: { top: 0.1, bottom: 0.2, left: 0.05, right: 0.16 },
    linkedin: { top: 0.06, bottom: 0.12, left: 0.05, right: 0.08 },
  }
  return map[platform] ?? { top: 0.08, bottom: 0.18, left: 0.05, right: 0.14 }
}

function hookTreatment(style: EditStyle): string {
  const map: Record<EditStyle, string> = {
    educational: "punch-in + immediate bold caption", ugc: "handheld punch-in + creator caption",
    cinematic: "slow scale + minimal title", high_energy: "hard punch-in + kinetic text + SFX cue",
    premium: "restrained slow scale + elegant title", clean: "quick punch-in + clean caption",
    minimal: "static + single word", creator: "punch-in + creator caption",
  }
  return map[style]
}

function ctaText(brief: Pick<CreativeBrief, "cta" | "objective">): string {
  if (brief.cta?.trim()) return brief.cta.trim()
  const map: Partial<Record<CreativeBrief["objective"], string>> = {
    followers: "Follow for more", leads: "DM me to start", website_traffic: "Link in bio",
    engagement: 'Comment "YES"', saves: "Save this for later", sign_ups: "Sign up — link in bio", sales: "Shop the link",
  }
  return map[brief.objective] ?? "Follow for more"
}

function round(value: number) { return Math.round(value * 1000) / 1000 }

export type BuildEditPlanInput = {
  brief: CreativeBrief
  settings: GenerationSettings
  scenes: EditableScene[]
  hookText?: string
  branding?: Branding
}

/** Assembles and validates the full EditPlan from approved scenes. */
export function buildEditPlan(input: BuildEditPlanInput): EditPlan {
  const scenes = [...input.scenes].sort((a, b) => a.order - b.order)
  if (scenes.length === 0) throw new Error("An edit needs at least one approved scene with a rendered asset.")
  const style = deriveEditStyle(input.brief)
  const captionStyle = selectCaptionStyle(style)
  const dims = DIMENSIONS[input.settings.aspectRatio] ?? DIMENSIONS["9:16"]

  let cursor = 0
  const planScenes = scenes.map((scene, index) => {
    const isHook = index === 0
    const isCta = index === scenes.length - 1
    const cues = buildCaptionCues(scene.spokenText, scene.durationSeconds).map((cue) => ({
      ...cue, startSeconds: round(cue.startSeconds), endSeconds: round(cue.endSeconds),
    }))
    const built = {
      sceneId: scene.sceneId,
      order: index,
      sourceUrl: scene.outputUrl,
      startSeconds: round(cursor),
      durationSeconds: scene.durationSeconds,
      motion: motionForScene(style, index, isHook, isCta),
      transitionIn: transitionForScene(style, scene.transition, index),
      captions: cues,
    }
    cursor += scene.durationSeconds
    return built
  })
  const durationSeconds = round(cursor)

  const hookSpoken = input.hookText?.trim() || scenes[0].spokenText || scenes[0].onScreenText
  const hook = { text: hookSpoken, treatment: hookTreatment(style), emphasis: detectEmphasis(hookSpoken) }

  // Sound effects: only at meaningful boundaries, and never on every cut.
  const sfxDensity = style === "high_energy" ? 1 : style === "premium" || style === "cinematic" || style === "minimal" ? 0 : 2
  const soundEffects = sfxDensity === 0 ? [] : planScenes
    .filter((scene) => scene.order > 0 && scene.order % sfxDensity === 0)
    .map((scene) => ({ atSeconds: scene.startSeconds, type: (scene.transitionIn === "hard_cut" ? "whoosh" : "transition") as "whoosh" | "transition" }))

  const cta = scenes.length > 0
    ? { text: ctaText(input.brief), treatment: style === "premium" ? "elegant end card" : "animated lower third", handle: input.branding?.handle, startSeconds: round(Math.max(0, durationSeconds - Math.min(3, scenes.at(-1)!.durationSeconds))) }
    : null

  const plan: EditPlan = {
    version: 1,
    platform: input.brief.platform,
    style,
    captionStyle,
    durationSeconds,
    fps: FPS,
    width: dims.width,
    height: dims.height,
    safeArea: safeAreaFor(input.brief.platform),
    hook,
    scenes: planScenes,
    music: { mode: input.settings.audio === "none" ? "none" : "auto", mood: musicMood(style), duckUnderVoice: true },
    soundEffects,
    audioMix: { voice: 1, music: input.settings.audio === "none" ? 0 : 0.28, sfx: 0.5, nativeScene: 0.12 },
    cta,
    branding: brandingFor(style, input.branding ?? {}),
    disclaimer: "Optimized for short-form engagement on the selected platform. Reach and virality are never guaranteed.",
  }
  return editPlanSchema.parse(plan)
}

/** A short, stable signature of the approved asset set — used to detect when a re-render is needed. */
export function approvedSignature(scenes: Array<{ sceneId: string; outputUrl?: string; currentVersion: number }>): string {
  return scenes.map((scene) => `${scene.sceneId}:${scene.currentVersion}:${scene.outputUrl ?? ""}`).join("|")
}

const RENDER_ONLY_FIELDS = new Set(["caption", "captions", "captionStyle", "font", "color", "music", "cta", "transition", "transitions", "logo", "branding", "brand", "order", "reorder", "trim", "safeArea", "emphasis", "motion"])
const GENERATIVE_FIELDS = new Set(["visual", "replaceVisual", "person", "character", "environment", "scene", "regenerate", "model", "prompt"])

/** Classifies an edit as a cheap deterministic re-render or an expensive AI regeneration. */
export function classifyChange(field: string): ChangeKind {
  const key = field.trim()
  if (GENERATIVE_FIELDS.has(key)) return "generative"
  if (RENDER_ONLY_FIELDS.has(key)) return "render_only"
  return "render_only"
}

export const RENDER_CREDIT_COST = 0

function modelCostUsd(model: ModelDefinition, durationSeconds: number, settings: GenerationSettings) {
  const audioPricing = settings.audio === "native" && model.pricing.audioUsd ? model.pricing.audioUsd : model.pricing.usd
  const base = model.pricing.unit === "second" ? audioPricing * durationSeconds : model.pricing.usd
  return base * (model.pricing.resolutionMultiplier?.[settings.resolution] ?? 1)
}

export type RegenerationEstimate = { modelId: string; modelLabel: string; durationSeconds: number; providerCostUsd: number; credits: number; changeKind: ChangeKind; disclaimer: string }

/**
 * Server-side credit estimate for regenerating ONE scene. Costs come from the
 * model registry — never hardcoded — and only this scene is ever charged.
 */
export function estimateSceneRegeneration(params: {
  scene: { durationSeconds: number; modelId: string }
  settings: GenerationSettings
  overrides?: RegenerationOverrides
}): RegenerationEstimate {
  const durationSeconds = params.overrides?.durationSeconds ?? params.scene.durationSeconds
  const settings: GenerationSettings = { ...params.settings, preset: params.overrides?.preset ?? params.settings.preset }
  const requestedModelId = params.overrides?.modelId && params.overrides.modelId !== "auto" ? params.overrides.modelId : params.scene.modelId
  const model = getModel(requestedModelId) ?? listAvailableModels("video")[0]
  if (!model) throw new Error("No generation model is available.")
  const multiplier = settings.preset === "ultra" ? 2 : 1
  const providerCostUsd = modelCostUsd(model, durationSeconds, settings) * multiplier
  return {
    modelId: model.id,
    modelLabel: model.label,
    durationSeconds,
    providerCostUsd,
    credits: providerUsdToCredits(providerCostUsd),
    changeKind: "generative",
    disclaimer: `Estimate only (~${CREDIT_CONFIG.creditsPerDollar} credits/$). The server reserves credits atomically and settles against actual provider usage. Only this scene is charged.`,
  }
}

/** Compatible models a user may pick for a scene, for the regenerate dialog. */
export function compatibleModelsForScene(): Array<{ id: string; label: string; qualityTier: string }> {
  return listAvailableModels("video").map((model) => ({ id: model.id, label: model.label, qualityTier: model.qualityTier }))
}
