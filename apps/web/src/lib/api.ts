import { useAuthStore } from '@/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

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

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<T> {
  const { token, clearSession } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const { skipAuthRedirect, ...fetchOptions } = options ?? {};

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...(fetchOptions?.headers as Record<string, string> | undefined),
    },
  });

  if (response.status === 401 && !skipAuthRedirect) {
    clearSession();
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (json as { error?: { message?: string } } | null)?.error?.message ??
      'An unexpected error occurred.';
    throw new ApiError(response.status, message, json);
  }

  return (json as { data: T }).data;
}

export { BASE_URL };
