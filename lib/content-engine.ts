export type QualityPreset = "fast" | "quality" | "cinematic" | "ultra"
export type SceneStatus = "ready" | "generating" | "review" | "approved"

export const platforms = ["TikTok", "Instagram Reels", "YouTube Shorts", "LinkedIn"] as const
export const objectives = ["Grow followers", "Drive website traffic", "Build authority", "Generate leads"] as const
export const formats = ["Educational", "Founder story", "Product demo", "UGC", "Problem → Solution", "Contrarian"] as const

export const qualityPresets: Record<QualityPreset, { label: string; description: string; multiplier: number; eta: string }> = {
  fast: { label: "Fast", description: "A strong first cut, quickly.", multiplier: 0.72, eta: "1–2 min" },
  quality: { label: "Quality", description: "Recommended balance of polish and cost.", multiplier: 1, eta: "2–5 min" },
  cinematic: { label: "Cinematic", description: "Premium visual treatment and motion.", multiplier: 1.48, eta: "4–7 min" },
  ultra: { label: "Ultra", description: "Multiple candidates with automated review.", multiplier: 2.2, eta: "6–10 min" },
}

export const generationStages = [
  "Planning story",
  "Creating storyboard",
  "Generating keyframes",
  "Creating scenes",
  "Checking visual quality",
  "Preparing your edit",
] as const

export type Scene = {
  id: number
  time: string
  duration: string
  purpose: string
  title: string
  spokenText: string
  onScreenText: string
  visual: string
  shotType: string
  cameraMovement: string
  generationMethod: string
  transition: string
  model: string
  status: SceneStatus
  accent: string
}

export const initialScenes: Scene[] = [
  { id: 1, time: "0:00–0:03", duration: "3s", purpose: "Hook", title: "The content trap", spokenText: "You don’t need more ideas.", onScreenText: "You need a system.", visual: "Creator at a desk, stopped mid-scroll; punchy editorial framing.", shotType: "Medium close-up", cameraMovement: "Quick push-in", generationMethod: "Image + motion", transition: "Hard cut", model: "Auto", status: "approved", accent: "from-fuchsia-500 to-violet-600" },
  { id: 2, time: "0:03–0:07", duration: "4s", purpose: "Pattern interrupt", title: "What actually works", spokenText: "The fastest creators multiply one strong idea.", onScreenText: "One idea → a week of content", visual: "Rapid desktop and phone cutaways with bright cyan accents.", shotType: "Detail montage", cameraMovement: "Whip pan", generationMethod: "Video", transition: "Match cut", model: "Kling 3 Pro", status: "review", accent: "from-cyan-400 to-blue-600" },
  { id: 3, time: "0:07–0:13", duration: "6s", purpose: "Core value", title: "The three-part framework", spokenText: "Start with a hook, turn it into a story, and give people one clear next step.", onScreenText: "Hook · Story · Next step", visual: "Clean visual explainer with kinetic typography and product UI.", shotType: "Graphic explainer", cameraMovement: "Gentle drift", generationMethod: "Image + motion", transition: "Swipe", model: "Image + motion", status: "ready", accent: "from-violet-500 to-fuchsia-500" },
  { id: 4, time: "0:13–0:18", duration: "5s", purpose: "Payoff", title: "Make each post count", spokenText: "That’s how one idea starts showing up everywhere your audience is.", onScreenText: "Make every idea work harder", visual: "Premium creator B-roll, confident forward camera movement.", shotType: "Wide B-roll", cameraMovement: "Slow dolly", generationMethod: "Video", transition: "Dissolve", model: "Veo 3.1", status: "ready", accent: "from-orange-400 to-rose-500" },
  { id: 5, time: "0:18–0:22", duration: "4s", purpose: "CTA", title: "A better way to create", spokenText: "Follow for more creator systems that save you time.", onScreenText: "Follow for the framework", visual: "Branded end card with handle, soft glow, and clear follow prompt.", shotType: "End card", cameraMovement: "Static", generationMethod: "Programmatic", transition: "Fade", model: "Image + motion", status: "ready", accent: "from-pink-500 to-purple-600" },
]

export function estimateCredits(preset: QualityPreset, sceneCount = initialScenes.length) {
  return Math.round((18 + sceneCount * 10) * qualityPresets[preset].multiplier)
}
