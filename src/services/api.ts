/**
 * API service layer — centralized HTTP client for all frontend operations.
 * Handles retries, error extraction, and type-safe responses.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  retries?: number;
}

/**
 * Core fetch wrapper with standardized error handling.
 * Automatically stringifies body and adds Content-Type.
 */
export async function fetchApi<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, retries = 0, ...rest } = options;

  const fetchOpts: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(endpoint, fetchOpts);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new ApiError(
          data?.error ?? `Erro ${res.status}`,
          res.status,
          data?.code
        );
      }

      // Support both { data: T } and { success: true, data: T } formats
      return (data?.data ?? data) as T;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');

      // Only retry on network/5xx errors
      if (error instanceof ApiError && error.status < 500) throw error;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Erro na requisição');
}

// Convenience methods
export const api = {
  get: <T>(url: string) => fetchApi<T>(url, { method: 'GET' }),
  post: <T>(url: string, body: unknown) => fetchApi<T>(url, { method: 'POST', body }),
  patch: <T>(url: string, body: unknown) => fetchApi<T>(url, { method: 'PATCH', body }),
  del: <T>(url: string, body?: unknown) => fetchApi<T>(url, { method: 'DELETE', body }),
};
