import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for throttling values.
 * Limits how often the returned value updates - at most once per `interval` milliseconds.
 * 
 * Useful for: scroll events, resize handlers, window events
 * 
 * @param value The value to throttle
 * @param interval Minimum milliseconds between updates
 * @returns Throttled value
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const handler = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(handler);
    }
  }, [value, interval]);

  return throttledValue;
}
