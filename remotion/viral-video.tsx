import { AbsoluteFill, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import type { EditPlan } from "@/lib/generation/edit-engine"

/**
 * The deterministic composition. Given an EditPlan it plays the approved AI
 * clips in sequence and layers the real edit on top — motion, transitions,
 * captions with keyword emphasis, a hook treatment and a CTA — so the output
 * reads as one professional short-form video, not concatenated clips.
 *
 * All burned-in text (captions, CTA) is drawn HERE, never inside the video
 * models, so it is always crisp and correct.
 */

type Scene = EditPlan["scenes"][number]

const TRANSITION_FRAMES = 8

function motionTransform(motion: Scene["motion"], frame: number, durationInFrames: number): string {
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" })
  switch (motion) {
    case "punch_in": return `scale(${interpolate(progress, [0, 1], [1.02, 1.12])})`
    case "punch_out": return `scale(${interpolate(progress, [0, 1], [1.12, 1.02])})`
    case "slow_scale": return `scale(${interpolate(progress, [0, 1], [1.0, 1.06])})`
    case "pan_left": return `scale(1.1) translateX(${interpolate(progress, [0, 1], [3, -3])}%)`
    case "pan_right": return `scale(1.1) translateX(${interpolate(progress, [0, 1], [-3, 3])}%)`
    default: return "scale(1.02)"
  }
}

function CaptionBlock({ scene, plan }: { scene: Scene; plan: EditPlan }) {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()
  const seconds = frame / fps
  const cue = scene.captions.find((candidate) => seconds >= candidate.startSeconds && seconds < candidate.endSeconds)
  if (!cue) return null
  const emphasis = new Set(cue.emphasis)
  const appear = interpolate(frame - cue.startSeconds * fps, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  const bottomPad = plan.safeArea.bottom * height
  const words = cue.text.split(/\s+/)
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: `0 ${plan.safeArea.left * 100}% ${bottomPad}px` }}>
      <div style={{ transform: `translateY(${(1 - appear) * 24}px)`, opacity: appear, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.28em", maxWidth: "82%" }}>
        {words.map((word, index) => {
          const bare = word.replace(/[^\p{L}\p{N}]/gu, "")
          const isEmphasis = emphasis.has(word) || emphasis.has(bare)
          return (
            <span key={`${word}-${index}`} style={{
              fontFamily: plan.branding.fontFamily,
              fontWeight: isEmphasis ? 900 : 800,
              fontSize: isEmphasis ? 78 : 66,
              lineHeight: 1.05,
              color: isEmphasis ? plan.branding.accentColor : plan.branding.primaryColor,
              textTransform: plan.captionStyle === "Bold" || plan.captionStyle === "Karaoke" ? "uppercase" : "none",
              textShadow: "0 4px 24px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.9)",
              padding: isEmphasis ? "0 8px" : 0,
              borderRadius: 8,
              background: isEmphasis && plan.captionStyle === "Karaoke" ? "rgba(0,0,0,0.28)" : "transparent",
            }}>{word}</span>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

function HookBadge({ plan }: { plan: EditPlan }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const out = interpolate(frame, [0, fps * 0.4, fps * 1.6, fps * 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  if (out <= 0) return null
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: `${plan.safeArea.top * 100 + 4}%` }}>
      <div style={{ opacity: out, background: "rgba(0,0,0,0.35)", border: `1px solid ${plan.branding.accentColor}`, borderRadius: 999, padding: "10px 22px", backdropFilter: "blur(6px)" }}>
        <span style={{ fontFamily: plan.branding.fontFamily, fontWeight: 700, fontSize: 30, color: plan.branding.primaryColor }}>▶ {plan.platform.replace("_", " ")}</span>
      </div>
    </AbsoluteFill>
  )
}

function CtaLayer({ plan }: { plan: EditPlan }) {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()
  const appear = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  const cta = plan.cta
  if (!cta) return null
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: plan.safeArea.bottom * height + 150 }}>
      <div style={{ transform: `scale(${interpolate(appear, [0, 1], [0.9, 1])})`, opacity: appear, background: plan.branding.accentColor, borderRadius: 16, padding: "16px 34px", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
        <span style={{ fontFamily: plan.branding.fontFamily, fontWeight: 800, fontSize: 46, color: "#0b0710" }}>{cta.text}</span>
        {cta.handle ? <span style={{ display: "block", textAlign: "center", marginTop: 6, fontSize: 26, color: "#0b0710", opacity: 0.75 }}>{cta.handle}</span> : null}
      </div>
    </AbsoluteFill>
  )
}

function SceneLayer({ scene, plan }: { scene: Scene; plan: EditPlan }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * fps))
  const transform = motionTransform(scene.motion, frame, durationInFrames)
  const opacity = scene.transitionIn === "hard_cut"
    ? 1
    : interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  const blur = scene.transitionIn === "blur" ? interpolate(frame, [0, TRANSITION_FRAMES], [16, 0], { extrapolateRight: "clamp" }) : 0
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity, filter: blur ? `blur(${blur}px)` : undefined, transform, overflow: "hidden" }}>
        <Video src={scene.sourceUrl} volume={plan.audioMix.nativeScene} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <CaptionBlock scene={scene} plan={plan} />
      {scene.order === 0 ? <HookBadge plan={plan} /> : null}
    </AbsoluteFill>
  )
}

export function ViralVideo({ plan }: { plan: EditPlan }) {
  const { fps } = useVideoConfig()
  return (
    <AbsoluteFill style={{ backgroundColor: "#050308" }}>
      {plan.scenes.map((scene) => (
        <Sequence key={scene.sceneId} from={Math.round(scene.startSeconds * fps)} durationInFrames={Math.max(1, Math.round(scene.durationSeconds * fps))}>
          <SceneLayer scene={scene} plan={plan} />
        </Sequence>
      ))}
      {plan.cta ? (
        <Sequence from={Math.round(plan.cta.startSeconds * fps)}>
          <CtaLayer plan={plan} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  )
}
