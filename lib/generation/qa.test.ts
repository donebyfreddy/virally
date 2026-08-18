import { describe, expect, it } from "vitest"
import { assessScene, isTextArtifact } from "./qa"

describe("scene QA heuristics", () => {
  it("flags a text-artifact risk when a scene planned burned-in on-screen text", () => {
    const report = assessScene({ modelId: "kling-3-pro", durationSeconds: 4, onScreenText: "Follow for more" })
    expect(report.artifactRisk).not.toBe("low")
    expect(report.notes.join(" ")).toMatch(/overlay|without text/i)
  })

  it("marks TEXT_ARTIFACT when detected on-frame text looks malformed", () => {
    const report = assessScene({ modelId: "kling-3-pro", durationSeconds: 4, detectedText: "Follow for more cratier s/stgims" })
    expect(report.textArtifact).toBe(true)
    expect(isTextArtifact(report)).toBe(true)
    expect(report.artifactRisk).toBe("high")
  })

  it("treats a clean text-free scene as low risk", () => {
    const report = assessScene({ modelId: "kling-3-pro", durationSeconds: 4 })
    expect(report.artifactRisk).toBe("low")
    expect(report.textArtifact).toBe(false)
    expect(isTextArtifact(report)).toBe(false)
  })

  it("rates cinematic-tier models higher on visual quality", () => {
    expect(assessScene({ modelId: "kling-3-pro", durationSeconds: 4 }).visualQuality).toBe("good")
  })
})
