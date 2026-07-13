import { useAuthStore } from '@/store/authStore';
import { API_BASE } from './api/adapter';
import { extractResponseData } from './api/transforms';

const BASE_URL = API_BASE;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  
  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token available');
  }

  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
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
      }>(json);

      // Update tokens in store
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
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

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<T> {
  const { accessToken, clearSession } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const { skipAuthRedirect, ...fetchOptions } = options ?? {};

  // Make the request
  let response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...(fetchOptions?.headers as Record<string, string> | undefined),
    },
  });

  // Handle 401 with token refresh
  if (response.status === 401 && !skipAuthRedirect) {
    try {
      // Attempt to refresh the token
      const newAccessToken = await refreshAccessToken();
      
      // Retry the original request with new token
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        headers: {
          ...headers,
          ...(fetchOptions?.headers as Record<string, string> | undefined),
        },
      });

      // If still 401 after refresh, logout
      if (response.status === 401) {
        clearSession();
        window.location.href = '/login';
        throw new ApiError(401, 'Session expired. Please sign in again.');
      }
    } catch (error) {
      // Refresh failed, redirect to login
      clearSession();
      window.location.href = '/login';
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (json as { error?: { message?: string } } | null)?.error?.message ??
      'An unexpected error occurred.';
    throw new ApiError(response.status, message, json);
  }

  // Extract data from response envelope
  const { data } = extractResponseData<T>(json);
  return data;
}

export { BASE_URL };
