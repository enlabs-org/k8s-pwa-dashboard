import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePollingOptions {
  interval: number;
  enabled?: boolean;
}

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions
) {
  const { interval, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn]);

  const scheduleNext = useCallback(() => {
    if (enabled && mountedRef.current) {
      timeoutRef.current = window.setTimeout(() => {
        fetch().then(scheduleNext);
      }, interval);
    }
  }, [enabled, interval, fetch]);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    fetch().then(scheduleNext);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetch, scheduleNext]);

  const refetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(true);
    fetch().then(scheduleNext);
  }, [fetch, scheduleNext]);

  return { data, isLoading, error, refetch };
}
