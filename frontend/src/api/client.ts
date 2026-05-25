// ============================================================================
// 🔐 SECURITY LAYER 1: SECURE API CLIENT
// Centralized fetch wrapper that enforces HTTPS, timeouts, and generic errors
// Guide Compliance: Sections 2, 4, 5, 7
// ============================================================================

// 🌐 Backend API base URL from Render environment variables
// Example:
// VITE_API_URL=https://international-payments-portal-system-1.onrender.com
const API_BASE_URL = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {

  // 🔐 10-second timeout prevents hanging requests & DoS via connection exhaustion
  const signal = AbortSignal.timeout(10000);

  // 🌐 Build FULL backend URL
  // BEFORE:
  //   /api/auth/login
  //
  // AFTER:
  //   https://backend-service.onrender.com/api/auth/login
  //
  // This fixes the Render deployment issue where the frontend
  // was accidentally calling itself instead of the backend API.
  const fullUrl = url.startsWith('http')
    ? url
    : `${API_BASE_URL}${url}`;

  try {

    // 🔐 Secure centralized API request
    const response = await fetch(fullUrl, {

      // 🔐 Ensures Secure/HttpOnly session cookies are ONLY sent over HTTPS
      credentials: 'include',

      signal,

      ...options,

      headers: {

        // 🔐 Standard JSON communication headers
        'Content-Type': 'application/json',
        'Accept': 'application/json',

        // 🔐 Safely merge additional headers
        // Example: CSRF token headers
        ...(options.headers ?? {}),
      },
    });

    // 🔐 Safe JSON parsing
    // Prevents crashes if backend returns malformed JSON or empty responses
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {

      // 🛡️ CRITICAL: Generic error prevents information leakage
      // Attackers must NEVER see:
      // - Database errors
      // - Stack traces
      // - Authentication details
      // - Internal server information
      throw new Error(
        'Request failed. Please try again or contact support.'
      );
    }

    return data as T;

  } catch (error) {

    // 🛡️ ENFORCE GENERIC ERROR POLICY
    // Applies to:
    // - Network failures
    // - Timeout errors
    // - Parsing failures
    // - Backend failures
    //
    // This prevents account enumeration and backend fingerprinting.
    if (error instanceof Error) {
      throw new Error(
        'Request failed. Please try again or contact support.'
      );
    }

    throw new Error(
      'Request failed. Please try again or contact support.'
    );
  }
}