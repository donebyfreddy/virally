import { afterEach, describe, expect, it, vi } from "vitest"
import { getRenderProvider, isMp4ExportConfigured } from "./render-provider"

describe("render provider selection", () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it("is unconfigured (no fake export) when nothing is set", () => {
    vi.stubEnv("REMOTION_LAMBDA_FUNCTION_NAME", "")
    vi.stubEnv("REMOTION_SERVE_URL", "")
    vi.stubEnv("VIRALLY_RENDER_WORKER_URL", "")
    vi.stubEnv("VIRALLY_RENDER_WORKER_TOKEN", "")
    expect(isMp4ExportConfigured()).toBe(false)
    expect(getRenderProvider()).toBeNull()
  })

  it("selects the Remotion Lambda backend when AWS env is present", () => {
    vi.stubEnv("REMOTION_AWS_REGION", "us-east-1")
    vi.stubEnv("REMOTION_LAMBDA_FUNCTION_NAME", "remotion-render-fn")
    vi.stubEnv("REMOTION_SERVE_URL", "https://s3.example/site/index.html")
    vi.stubEnv("REMOTION_AWS_ACCESS_KEY_ID", "AKIA_TEST")
    expect(isMp4ExportConfigured()).toBe(true)
    expect(getRenderProvider()).not.toBeNull()
  })

  it("falls back to a custom HTTP worker when only that is configured", () => {
    vi.stubEnv("REMOTION_LAMBDA_FUNCTION_NAME", "")
    vi.stubEnv("REMOTION_SERVE_URL", "")
    vi.stubEnv("VIRALLY_RENDER_WORKER_URL", "https://worker.example/render")
    vi.stubEnv("VIRALLY_RENDER_WORKER_TOKEN", "secret-token")
    expect(isMp4ExportConfigured()).toBe(true)
    expect(getRenderProvider()).not.toBeNull()
  })
})
