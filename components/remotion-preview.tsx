"use client"

import { Player } from "@remotion/player"
import { useMemo } from "react"
import type { EditPlan } from "@/lib/generation/edit-engine"
import { ViralVideo } from "@/remotion/viral-video"

/**
 * Renders the real deterministic edit in-browser via the Remotion Player. This
 * is not a mock preview — it plays the exact EditPlan (clips, captions, motion,
 * transitions, CTA) that a server MP4 export would render frame-for-frame.
 */
export function RemotionPreview({ plan }: { plan: EditPlan }) {
  const durationInFrames = useMemo(() => Math.max(1, Math.round(plan.durationSeconds * plan.fps)), [plan.durationSeconds, plan.fps])
  const inputProps = useMemo(() => ({ plan }), [plan])
  return (
    <Player
      component={ViralVideo}
      inputProps={inputProps}
      durationInFrames={durationInFrames}
      fps={plan.fps}
      compositionWidth={plan.width}
      compositionHeight={plan.height}
      style={{ width: "100%", height: "100%", borderRadius: 16, overflow: "hidden", backgroundColor: "#050308" }}
      controls
      clickToPlay
      doubleClickToFullscreen
    />
  )
}
