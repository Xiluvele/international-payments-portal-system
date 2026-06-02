import { useRef } from 'react';

/**
 * Tracks which fields have been blurred so we can re-validate on change without stale closure issues.
 */
export function useTouchedFields<K extends string>() {
  const touchedRef = useRef<Partial<Record<K, boolean>>>({});

  const markTouched = (key: K) => {
    touchedRef.current[key] = true;
  };

  const isTouched = (key: K) => Boolean(touchedRef.current[key]);

  const markAllTouched = (keys: K[]) => {
    for (const k of keys) touchedRef.current[k] = true;
  };

  const resetTouched = () => {
    touchedRef.current = {};
  };

  return { markTouched, isTouched, markAllTouched, resetTouched };
}
