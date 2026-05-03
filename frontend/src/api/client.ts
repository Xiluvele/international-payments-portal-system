export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const signal = options.signal ?? AbortSignal.timeout(10000);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as { message?: unknown }).message === 'string'
          ? (data as { message: string }).message
          : 'Request failed. Please try again or contact support.';
      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      if (error.message === 'Failed to fetch') {
        throw new Error(
          'Cannot reach the server. Use https://localhost:5173 and ensure the API is running at https://localhost:5001.',
        );
      }
      throw error;
    }
    throw new Error('Request failed. Please try again or contact support.');
  }
}
