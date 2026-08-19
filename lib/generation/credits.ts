/**
 * Minimal append-only credit ledger stored on each generation job. There is no
 * external billing system yet, so this is the source of truth for credit safety:
 * we RESERVE when a scene is submitted, SETTLE when it completes, and REFUND when
 * it fails — so a failed provider job never permanently consumes credits and a
 * retry never double-charges.
 */

export type CreditEntryKind = "reserve" | "settle" | "refund"
export type CreditLedgerEntry = { kind: CreditEntryKind; credits: number; sceneId?: string; reason?: string; at: string }

export function reserve(entries: CreditLedgerEntry[], credits: number, sceneId?: string, reason?: string): CreditLedgerEntry[] {
  if (credits <= 0) return entries
  return [...entries, { kind: "reserve", credits, sceneId, reason, at: new Date().toISOString() }]
}

export function settle(entries: CreditLedgerEntry[], credits: number, sceneId?: string, reason?: string): CreditLedgerEntry[] {
  if (credits <= 0) return entries
  return [...entries, { kind: "settle", credits, sceneId, reason, at: new Date().toISOString() }]
}

/** Refunds the outstanding (reserved-but-unsettled) credits for a scene. Idempotent per scene. */
export function refundScene(entries: CreditLedgerEntry[], sceneId: string, reason?: string): CreditLedgerEntry[] {
  const outstanding = outstandingForScene(entries, sceneId)
  if (outstanding <= 0) return entries
  return [...entries, { kind: "refund", credits: outstanding, sceneId, reason, at: new Date().toISOString() }]
}

function sumFor(entries: CreditLedgerEntry[], kind: CreditEntryKind, sceneId?: string): number {
  return entries.filter((entry) => entry.kind === kind && (sceneId === undefined || entry.sceneId === sceneId)).reduce((total, entry) => total + entry.credits, 0)
}

/** Credits reserved for a scene that have not yet been settled or refunded. */
export function outstandingForScene(entries: CreditLedgerEntry[], sceneId: string): number {
  return Math.max(0, sumFor(entries, "reserve", sceneId) - sumFor(entries, "settle", sceneId) - sumFor(entries, "refund", sceneId))
}

export type CreditSummary = { reserved: number; settled: number; refunded: number; outstanding: number; actual: number }

export function summarize(entries: CreditLedgerEntry[] = []): CreditSummary {
  const reserved = sumFor(entries, "reserve")
  const settled = sumFor(entries, "settle")
  const refunded = sumFor(entries, "refund")
  return { reserved, settled, refunded, outstanding: Math.max(0, reserved - settled - refunded), actual: settled }
}
