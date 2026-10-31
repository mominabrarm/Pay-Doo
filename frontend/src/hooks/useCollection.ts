import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";

export function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function useCollection<T>(loader: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
