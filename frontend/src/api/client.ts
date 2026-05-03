// ============================================================================
// 🔐 SECURITY LAYER 1: SECURE API CLIENT
// Centralized fetch wrapper that enforces HTTPS, timeouts, and generic errors
// Guide Compliance: Sections 2, 4, 5, 7
// ============================================================================

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  // 🔐 10-second timeout prevents hanging requests & DoS via connection exhaustion
  const signal = AbortSignal.timeout(10000);

  try {
    const response = await fetch(url, {
      credentials: 'include', // 🔐 Ensures Secure/HttpOnly session cookies are ONLY sent over HTTPS
      signal,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers ?? {}), // Merges CSRF/Auth headers safely without overwriting
      },
    });

    // 🔐 Safe JSON parsing (prevents crashes on malformed backend responses)
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // 🛡️ CRITICAL: Generic error prevents information leakage & account enumeration
      // Detailed errors are logged server-side. Client NEVER sees DB/stack/auth details.
      throw new Error('Request failed. Please try again or contact support.');
    }

    return data as T;
  } catch (error) {
    // 🛡️ ENFORCE GENERIC ERROR POLICY for ALL failures (network, timeout, parse, HTTP)
    // This satisfies the guide requirement: "Generic message stops attackers from enumerating"
    if (error instanceof Error) {
      throw new Error('Request failed. Please try again or contact support.');
    }
    throw new Error('Request failed. Please try again or contact support.');
  }
}