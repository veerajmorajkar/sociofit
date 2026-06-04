import { useAuthStore } from '@/stores/authStore';
import { API_URL } from '@/constants/config';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, auth = true } = options;
    const hasJsonBody = body !== undefined;

    const requestHeaders: Record<string, string> = { ...headers };
    if (hasJsonBody) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (auth) {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const serializedBody = hasJsonBody ? JSON.stringify(body) : undefined;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: serializedBody,
      });
    } catch {
      throw new Error('Could not reach the server. Check Wi‑Fi and that the API is running.');
    }

    let data: ApiResponse<T>;
    try {
      data = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new Error(
        response.ok ? 'Invalid response from server' : `Request failed (${response.status})`,
      );
    }

    // Handle 401 — try token refresh once
    if (response.status === 401 && auth) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = useAuthStore.getState().accessToken;
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: requestHeaders,
          body: serializedBody,
        });
        let retryData: ApiResponse<T>;
        try {
          retryData = (await retryResponse.json()) as ApiResponse<T>;
        } catch {
          throw new Error(
            retryResponse.ok
              ? 'Invalid response from server'
              : `Request failed (${retryResponse.status})`,
          );
        }
        if (retryResponse.status === 401) {
          await useAuthStore.getState().logout();
          throw new Error('Session expired. Please sign in again.');
        }
        return retryData;
      }
      await useAuthStore.getState().logout();
      throw new Error('Session expired. Please sign in again.');
    }

    return data;
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = (await response.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;

      if (data.success) {
        await useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);
