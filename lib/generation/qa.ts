import type { SceneQaReport } from "./domain"
import { getModel } from "./model-registry"

/**
 * Heuristic scene QA. These are guidance signals, not objective guarantees.
 *
 * We instruct every video model to render WITHOUT embedded captions (see
 * buildMediaPrompt), because AI models frequently produce malformed on-screen
 * text. When a scene's plan nonetheless asked for burned-in text, we flag a
 * TEXT_ARTIFACT risk so the reviewer can regenerate without text and let the
 * deterministic editor overlay correct typography instead.
 */

/**
 * Heuristic detector for the garbled text that video models produce (e.g. a CTA
 * rendered as "cratier s/stgims"). Flags repeated characters, long consonant
 * runs, mid-word slashes, or tokens with an implausibly low vowel ratio.
 */
function looksMalformed(text: string): boolean {
  if (/([a-z])\1{3,}/i.test(text)) return true
  if (/[a-z]{15,}/i.test(text)) return true
  if (/[a-z]+\/[a-z]+/i.test(text)) return true
  const tokens = text.toLowerCase().match(/[a-z]+/g) ?? []
  return tokens.some((token) => {
    if (token.length < 5) return false
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(token)) return true
    const vowels = (token.match(/[aeiou]/g) ?? []).length
    return vowels / token.length < 0.25
  })
}

export type SceneQaInput = {
  modelId: string
  durationSeconds: number
  onScreenText?: string
  spokenText?: string
  /** Optional caption/OCR text a vision QA step may have read off the frame. */
  detectedText?: string
}

export function assessScene(input: SceneQaInput): SceneQaReport {
  const notes: string[] = []
  const model = getModel(input.modelId)
  const tier = model?.qualityTier ?? "quality"

  const visualQuality: SceneQaReport["visualQuality"] = tier === "cinematic" ? "good" : "fair"
  const promptAdherence: SceneQaReport["promptAdherence"] = tier === "cinematic" ? "high" : "medium"

  let artifactRisk: SceneQaReport["artifactRisk"] = "low"
  let textArtifact = false

  // Any request for burned-in on-screen text is a text-artifact risk with video models.
  const requestedOnScreenText = Boolean(input.onScreenText && input.onScreenText.trim().length > 0)
  if (requestedOnScreenText) {
    artifactRisk = "medium"
    notes.push("This scene planned on-screen text. Prefer generating the visual without text and overlaying captions in the editor.")
  }

  // If a vision step read text off the frame and it looks malformed, flag it.
  if (input.detectedText && looksMalformed(input.detectedText)) {
    artifactRisk = "high"
    textArtifact = true
    notes.push("Possible malformed on-screen text detected. Regenerate without embedded text so the editor can add correct typography.")
  }

  if (input.durationSeconds > 10 && tier !== "cinematic") {
    if (artifactRisk === "low") artifactRisk = "medium"
    notes.push("Long single takes can drift on non-cinematic models. Consider a shorter scene or a cinematic model.")
  }

  return { visualQuality, promptAdherence, artifactRisk, textArtifact, notes, assessedAt: new Date().toISOString() }
}

export function isTextArtifact(report: SceneQaReport | undefined): boolean {
  return Boolean(report?.textArtifact)
}
