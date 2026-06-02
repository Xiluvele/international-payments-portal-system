import type { Dispatch, SetStateAction } from 'react';

/** Update a single field error in a Partial<Record<…>> map (clears key when valid). */
export function setFieldError<K extends string>(
  setErrors: Dispatch<SetStateAction<Partial<Record<K, string>>>>,
  key: K,
  value: string,
  isValid: boolean,
  message: string,
) {
  setErrors((prev) => {
    const next = { ...prev };
    if (isValid) delete next[key];
    else next[key] = message;
    return next;
  });
}
