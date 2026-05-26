import { useEffect, useState } from 'react';

/**
 * Custom hook for debouncing values.
 * Delays updating the returned value until after `delay` milliseconds
 * have passed since the value last changed.
 * 
 * Useful for: search inputs, filter fields, resize handlers
 * 
 * @param value The value to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
