import { ApiError } from './api';

/**
 * The one place UI code reads a backend error. The API always responds with
 * { success: false, error: { code, message, fieldErrors } }, and `message` is
 * already the client-safe text (the backend's clientMessage when set) — so
 * pages should show it rather than inventing their own generic copy.
 */

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/** Backend message for an API error, the network message for a connectivity failure, else `fallback`. */
export function errorMessage(err: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (err instanceof ApiError) return err.message || fallback;
  return fallback;
}

/** Stable machine code, e.g. 'INSUFFICIENT_WALLET_BALANCE', for branching on specific errors. */
export function errorCode(err: unknown): string | undefined {
  return err instanceof ApiError ? err.code : undefined;
}

/**
 * Per-field validation messages (first message per field), keyed by the DTO
 * field name — e.g. { email: 'email must be an email' }. Empty when the error
 * isn't a validation error.
 */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(err.fieldErrors)) {
    if (messages?.length) out[field] = messages[0];
  }
  return out;
}
