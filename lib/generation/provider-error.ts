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

  const forbidden = status === 401 || status === 403 || /forbidden|unauthorized|not authorized|access denied/i.test(rawMessage)
  const detail = typeof body?.detail === "string" ? body.detail : undefined

  let message: string
  if (forbidden) message = "The selected model is unavailable for this account."
  else if (status === 429) message = "The provider is rate limiting requests. Try again shortly."
  else if (status && status >= 500) message = "The provider had a temporary error. Retrying usually works."
  else message = detail ?? rawMessage ?? "The provider could not process this scene."

  const retryable = forbidden || status === undefined || status === 429 || (status >= 500)

  return { code: String(status ?? "UNKNOWN"), message, response: safeStringify(body ?? rawMessage), requestId, timestamp, retryable, forbidden }
}
