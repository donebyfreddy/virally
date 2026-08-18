import { Composition } from "remotion"
import { DEFAULT_EDIT_PLAN } from "./default-plan"
import { ViralVideo } from "./viral-video"

/**
 * Registers the single "ViralVideo" composition that Remotion Lambda renders.
 * Duration and dimensions are computed from the EditPlan passed as inputProps.
 */
export function RemotionRoot() {
  return (
    <Composition
      id="ViralVideo"
      component={ViralVideo}
      defaultProps={{ plan: DEFAULT_EDIT_PLAN }}
      durationInFrames={30}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, Math.round(props.plan.durationSeconds * props.plan.fps)),
        fps: props.plan.fps,
        width: props.plan.width,
        height: props.plan.height,
      })}
    />
  )
}
