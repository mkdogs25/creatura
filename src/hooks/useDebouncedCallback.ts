import { useCallback, useEffect, useRef } from 'react';

/**
 * Debounces a callback and, crucially, flushes any pending call on unmount —
 * so navigating away mid-sentence never loses the last keystrokes.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): { run: (...args: A) => void; flush: () => void; cancel: () => void } {
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<A | null>(null);
  const latest = useRef(callback);
  latest.current = callback;

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (pending.current) {
      const args = pending.current;
      pending.current = null;
      latest.current(...args);
    }
  }, []);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    pending.current = null;
  }, []);

  const run = useCallback(
    (...args: A) => {
      pending.current = args;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(() => flush, [flush]);

  return { run, flush, cancel };
}
