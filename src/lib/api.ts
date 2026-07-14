export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'pqas_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

// AuthContext registers a handler here so that ANY 401 from ANY request — not just the one
// that happens to hit /auth/me on mount — logs the user out. Without this, an expired token
// leaves the SPA in a "phantom logged-in" state: isAuthenticated stays true (nothing else
// invalidates it) while every subsequent call silently fails, and background polls swallow
// their errors entirely. A plain module-level callback avoids api.ts importing AuthContext.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: { page: number; limit: number; total: number; pages?: number };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json: ApiEnvelope<T> = await res.json().catch(() => ({ success: false, error: `Request failed: ${res.status}` }));
  if (res.status === 401 && token) onUnauthorized?.();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json;
}

export const api = {
  get: async <T>(path: string): Promise<T> => (await request<T>(path)).data as T,
  getList: async <T>(path: string): Promise<{ data: T[]; pagination?: ApiEnvelope<T>['pagination'] }> => {
    const res = await request<T[]>(path);
    return { data: res.data ?? [], pagination: res.pagination };
  },
  post: async <T>(path: string, body?: any): Promise<T> =>
    (await request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) })).data as T,
  put: async <T>(path: string, body?: any): Promise<T> =>
    (await request<T>(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) })).data as T,
  delete: async (path: string): Promise<void> => {
    await request(path, { method: 'DELETE' });
  },
};
