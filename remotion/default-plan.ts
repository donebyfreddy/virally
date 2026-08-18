import type { EditPlan } from "@/lib/generation/edit-engine"

/**
 * Placeholder plan for the Remotion Studio / composition registration only.
 * Real renders always override `inputProps.plan` with a job's actual EditPlan,
 * and `calculateMetadata` recomputes duration/dimensions from it.
 */
export const DEFAULT_EDIT_PLAN: EditPlan = {
  version: 1,
  platform: "tiktok",
  style: "educational",
  captionStyle: "Bold",
  durationSeconds: 1,
  fps: 30,
  width: 1080,
  height: 1920,
  safeArea: { top: 0.08, bottom: 0.22, left: 0.05, right: 0.18 },
  hook: { text: "", treatment: "", emphasis: [] },
  scenes: [],
  music: { mode: "none", mood: "", duckUnderVoice: true },
  soundEffects: [],
  audioMix: { voice: 1, music: 0, sfx: 0.5, nativeScene: 0.12 },
  cta: null,
  branding: { primaryColor: "#e879f9", accentColor: "#22d3ee", fontFamily: "Space Grotesk, ui-sans-serif, sans-serif" },
  disclaimer: "Optimized for short-form engagement. Reach and virality are never guaranteed.",
}
