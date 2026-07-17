import { useStore } from '../store/useStore';

const BASE_URL = '/api';

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useStore.getState().accessToken;
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = 'An error occurred';
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.message || message;
    } catch (e) {
      message = errorText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}
