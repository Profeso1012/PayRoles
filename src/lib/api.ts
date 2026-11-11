import { useAuthStore } from '@/store/authStore';
import { API_BASE } from './api/adapter';
import { extractResponseData } from './api/transforms';

const BASE_URL = API_BASE.replace(/\/+$/, '');

interface ErrorEnvelope {
  error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    public isNetworkError: boolean = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Backend error code, e.g. 'INVALID_CREDENTIALS'. Undefined for network errors. */
  get code(): string | undefined {
    return (this.data as ErrorEnvelope | undefined)?.error?.code;
  }

  /** Backend per-field validation messages, keyed by DTO field name. */
  get fieldErrors(): Record<string, string[]> {
    return (this.data as ErrorEnvelope | undefined)?.error?.fieldErrors ?? {};
  }
}

/**
 * 401 codes that mean "your session token is bad" - only these trigger a
 * refresh/re-login. Any other 401 is a real answer (e.g. INVALID_CREDENTIALS
 * from a wrong current password) and must reach the caller: treating every
 * 401 as an expired session used to log users out for mistyping a password.
 */
const SESSION_ERROR_CODES = new Set(['TOKEN_INVALID', 'TOKEN_EXPIRED', 'UNAUTHORIZED']);

async function peekErrorCode(response: Response): Promise<string | undefined> {
  const body = (await response.clone().json().catch(() => null)) as ErrorEnvelope | null;
  return body?.error?.code;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string> {
  const { refreshToken, user, setSession, clearSession } = useAuthStore.getState();

  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token available');
  }

  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Platform admin sessions are signed with a completely separate JWT secret
  // (platform-auth.service.ts) and verified by /platform/auth/refresh, not
  // /auth/refresh - the tenant route would 401 on a platform token every time,
  // forcing a full logout on every access-token expiry instead of a silent refresh.
  const isPlatformSession = user?.role === 'PLATFORM_ADMIN';
  const refreshPath = isPlatformSession ? '/platform/auth/refresh' : '/v1/auth/refresh';

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}${refreshPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const json = await response.json();
      const { data } = extractResponseData<{
        accessToken: string;
        refreshToken: string;
        expiresIn: string;
        mustChangePassword?: boolean;
      }>(json);

      // Update tokens in store. mustChangePassword is re-read from the
      // database on every refresh, so it's authoritative when present.
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        mustChangePassword: data.mustChangePassword,
      });

      return data.accessToken;
    } catch (error) {
      // Refresh failed, clear session
      clearSession();
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface EnvelopeResult<T> {
  data: T;
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

const REQUEST_TIMEOUT_MS = 15000;

/**
 * fetch() never distinguishes CORS/DNS/connection-refused from each other -
 * browsers deliberately hide that detail from JS. The one failure mode we
 * *can* name explicitly is our own timeout. Either way, this is not a
 * backend message, so it must never be presented to the user as one - and
 * the raw error is always logged so it's actually diagnosable.
 */
function describeNetworkError(error: unknown, url: string): string {
  console.error(`[api] Request to ${url} failed before a response was received:`, error);
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The server took too long to respond. Please try again in a moment.';
  }
  return "Couldn't reach the server. Check your internet connection and try again.";
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    throw new ApiError(0, describeNetworkError(error, url), undefined, true);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * fetch() with the access token attached, plus the session handling every
 * authenticated call needs - shared by request() and downloadFile():
 * - a session 401 (SESSION_ERROR_CODES) refreshes the token once and retries;
 *   if that fails too, the session is cleared and the user sent to login;
 * - any other 401 is returned untouched for the caller to report;
 * - a 403 PASSWORD_CHANGE_REQUIRED (still on a temporary password) raises the
 *   change-password screen instead of looking like a permissions error.
 */
async function authedFetch(
  url: string,
  init: RequestInit,
  skipAuthRedirect = false,
): Promise<Response> {
  const { accessToken, user, clearSession } = useAuthStore.getState();
  // Captured before clearSession() wipes `user` - determines which login
  // screen a session-expiry redirect should land on.
  const loginPath = user?.role === 'PLATFORM_ADMIN' ? '/platform-login' : '/login';

  const withToken = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let response = await fetchWithTimeout(url, withToken(accessToken));

  if (response.status === 401 && !skipAuthRedirect) {
    const code = await peekErrorCode(response);
    if (code && !SESSION_ERROR_CODES.has(code)) return response;

    try {
      const newAccessToken = await refreshAccessToken();
      response = await fetchWithTimeout(url, withToken(newAccessToken));
    } catch (error) {
      // A connectivity failure isn't a session/auth problem - don't relabel it as one.
      if (error instanceof ApiError && error.isNetworkError) {
        throw error;
      }
      clearSession();
      window.location.href = loginPath;
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }

    if (response.status === 401) {
      const retryCode = await peekErrorCode(response);
      if (!retryCode || SESSION_ERROR_CODES.has(retryCode)) {
        clearSession();
        window.location.href = loginPath;
        throw new ApiError(401, 'Session expired. Please sign in again.');
      }
    }
  }

  if (response.status === 403 && (await peekErrorCode(response)) === 'PASSWORD_CHANGE_REQUIRED') {
    useAuthStore.getState().setMustChangePassword(true);
  }

  return response;
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  const json = await response.json().catch(() => null);
  const message =
    (json as ErrorEnvelope | null)?.error?.message ?? 'An unexpected error occurred.';
  return new ApiError(response.status, message, json);
}

/**
 * Shared fetch + session handling. Returns the full parsed envelope
 * (data + meta) - apiClient()/apiClientWithMeta() below just decide how much
 * of it to hand back to the caller.
 */
async function request<T>(
  path: string,
  options?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<EnvelopeResult<T>> {
  // A FormData body (file upload) must NOT get an explicit Content-Type -
  // the browser sets it itself, including the multipart boundary token,
  // which forcing 'application/json' here would silently overwrite and
  // break the upload entirely.
  const isFormData = options?.body instanceof FormData;
  const { skipAuthRedirect, ...fetchOptions } = options ?? {};

  const response = await authedFetch(
    `${BASE_URL}${path}`,
    {
      ...fetchOptions,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(fetchOptions.headers as Record<string, string> | undefined),
      },
    },
    skipAuthRedirect,
  );

  if (!response.ok) throw await errorFromResponse(response);

  const json = await response.json().catch(() => null);
  return extractResponseData<T>(json);
}

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<T> {
  const { data } = await request<T>(path, options);
  return data;
}

/**
 * Like apiClient, but also returns the envelope's pagination `meta`.
 *
 * apiClient() only returns `.data` and silently drops `.meta` - fine for
 * detail/create/update calls, but every paginated list endpoint's real
 * `{ total, page, limit, totalPages, ... }` meta was being lost this way
 * (callers were reading a non-existent `.meta` property off a plain array).
 * Use this for any list query that needs true pagination totals.
 */
export async function apiClientWithMeta<T>(
  path: string,
  options?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<EnvelopeResult<T>> {
  return request<T>(path, options);
}

/**
 * Fetches every page of a paginated list endpoint and flattens it into one
 * array. The backend's PaginationDto caps `limit` at 100 (`@Max(100)`) - any
 * request for more than that 400s outright, so "just ask for limit=1000" is
 * not an option for "give me the whole tenant's workers/users" lookups.
 * `buildUrl` must include a `limit` of 100 or less itself.
 */
export async function fetchAllPages<T>(buildUrl: (page: number) => string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  for (;;) {
    const { data, meta } = await apiClientWithMeta<T[]>(buildUrl(page));
    all.push(...data);
    if (data.length === 0 || !meta || all.length >= meta.total) break;
    page += 1;
  }
  return all;
}

/**
 * Authenticated blob download - apiClient()/request() always parse the
 * response as the {success,data} envelope, which doesn't apply to a raw
 * file stream. On failure, still parses the body as that envelope (NestJS
 * error responses are JSON even for routes that normally stream a file) so
 * the real backend error.message reaches the caller instead of a generic
 * "Download failed" - mirrors request()'s own error handling above.
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  // Same session handling as every other call - previously an expired access
  // token made downloads fail outright instead of refreshing.
  const response = await authedFetch(`${BASE_URL}${path}`, {});

  if (!response.ok) throw await errorFromResponse(response);

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] || fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export { BASE_URL };
