/**
 * Structured provider error capture. The frontend must never hide provider
 * failures behind a generic "Forbidden" — we record the code, a human message,
 * the raw response, a request id and a timestamp so the UI can show a real
 * reason and offer Retry / Change model / View details.
 */

export type ProviderErrorDetails = {
  code: string
  message: string
  response?: string
  requestId?: string
  timestamp: string
  retryable: boolean
  forbidden: boolean
  /** The provider account is out of balance / locked — no model will work until topped up. */
  billing: boolean
}

export class ProviderError extends Error {
  readonly details: ProviderErrorDetails
  constructor(details: ProviderErrorDetails) {
    super(details.message)
    this.name = "ProviderError"
    this.details = details
  }
}

function safeStringify(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value)
    return text.length > 2_000 ? `${text.slice(0, 2_000)}…` : text
  } catch {
    return undefined
  }
}

/** Normalizes any thrown provider/client error into structured, user-safe details. */
export function describeProviderError(error: unknown): ProviderErrorDetails {
  const timestamp = new Date().toISOString()
  const err = (error ?? {}) as Record<string, unknown>
  const rawMessage = typeof err.message === "string" ? err.message : ""
  const status = (err.status ?? err.statusCode ?? (err.response as Record<string, unknown> | undefined)?.status) as number | undefined
  const body = (err.body ?? (err.response as Record<string, unknown> | undefined)?.data ?? err.response) as Record<string, unknown> | undefined
  const requestId = (body?.request_id ?? err.requestId ?? err.request_id) as string | undefined

  const detail = typeof body?.detail === "string" ? body.detail : undefined
  const haystack = `${rawMessage} ${detail ?? ""}`.toLowerCase()

  // A locked/exhausted-balance account returns 402/403 too, but no model will work
  // until it is topped up — so classify it separately and do NOT trigger fallback.
  const billing = status === 402 || /exhausted balance|user is locked|top up|insufficient (funds|balance|credit)|payment required|quota/.test(haystack)
  const forbidden = !billing && (status === 401 || status === 403 || /forbidden|unauthorized|not authorized|access denied/i.test(rawMessage))

  let message: string
  if (billing) message = "The provider account is out of balance or locked. Top up at fal.ai/dashboard/billing, then retry."
  else if (forbidden) message = "The selected model is unavailable for this account."
  else if (status === 429) message = "The provider is rate limiting requests. Try again shortly."
  else if (status && status >= 500) message = "The provider had a temporary error. Retrying usually works."
  else message = detail ?? rawMessage ?? "The provider could not process this scene."

  const retryable = !billing && (forbidden || status === undefined || status === 429 || (status >= 500))

  return { code: String(status ?? "UNKNOWN"), message, response: safeStringify(body ?? rawMessage), requestId, timestamp, retryable, forbidden, billing }
}
