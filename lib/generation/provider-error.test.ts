import { describe, expect, it } from "vitest"
import { describeProviderError, ProviderError } from "./provider-error"

describe("provider error capture", () => {
  it("turns a raw 403 into a user-safe, structured reason (not just 'Forbidden')", () => {
    const details = describeProviderError({ status: 403, message: "Forbidden", body: { request_id: "req-123" } })
    expect(details.forbidden).toBe(true)
    expect(details.code).toBe("403")
    expect(details.requestId).toBe("req-123")
    expect(details.message).toMatch(/unavailable for this account/i)
    expect(details.message).not.toBe("Forbidden")
    expect(details.retryable).toBe(true)
    expect(details.response).toContain("req-123")
  })

  it("captures rate limits and server errors as retryable", () => {
    expect(describeProviderError({ status: 429 }).message).toMatch(/rate limit/i)
    expect(describeProviderError({ status: 503 }).retryable).toBe(true)
  })

  it("keeps a validation error message and marks it non-retryable", () => {
    const details = describeProviderError({ status: 422, body: { detail: "duration too long" } })
    expect(details.message).toBe("duration too long")
    expect(details.retryable).toBe(false)
    expect(details.forbidden).toBe(false)
  })

  it("carries details through a ProviderError instance", () => {
    const error = new ProviderError(describeProviderError({ status: 403, message: "Forbidden" }))
    expect(error).toBeInstanceOf(Error)
    expect(error.details.forbidden).toBe(true)
  })

  it("has a stable timestamp field", () => {
    expect(describeProviderError({ status: 500 }).timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
