import { describe, expect, it } from "vitest"
import { outstandingForScene, refundScene, reserve, settle, summarize } from "./credits"

describe("credit ledger", () => {
  it("reserves, settles, and reports actual usage", () => {
    let ledger = reserve([], 18, "s1")
    ledger = settle(ledger, 18, "s1")
    expect(summarize(ledger)).toMatchObject({ reserved: 18, settled: 18, refunded: 0, outstanding: 0, actual: 18 })
  })

  it("refunds a failed scene so credits are not permanently consumed", () => {
    let ledger = reserve([], 18, "s1")
    ledger = refundScene(ledger, "s1", "scene failed")
    const summary = summarize(ledger)
    expect(summary.outstanding).toBe(0)
    expect(summary.actual).toBe(0) // nothing settled → nothing charged
  })

  it("does not double-refund the same scene", () => {
    let ledger = reserve([], 18, "s1")
    ledger = refundScene(ledger, "s1")
    const twice = refundScene(ledger, "s1")
    expect(twice).toBe(ledger) // idempotent: no new entry
    expect(outstandingForScene(twice, "s1")).toBe(0)
  })

  it("only refunds the outstanding portion, never settled credits", () => {
    let ledger = reserve([], 20, "s1")
    ledger = settle(ledger, 20, "s1")
    const refunded = refundScene(ledger, "s1")
    expect(refunded).toBe(ledger) // fully settled → nothing outstanding to refund
    expect(summarize(refunded).actual).toBe(20)
  })

  it("tracks per-scene reservations independently", () => {
    let ledger = reserve([], 10, "s1")
    ledger = reserve(ledger, 14, "s2")
    ledger = refundScene(ledger, "s1")
    ledger = settle(ledger, 14, "s2")
    expect(outstandingForScene(ledger, "s1")).toBe(0)
    expect(summarize(ledger).actual).toBe(14)
  })
})
