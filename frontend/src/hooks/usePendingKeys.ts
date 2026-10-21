import { useCallback, useState } from "react";

export function usePendingKeys() {
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const run = useCallback(async (key: string, action: () => Promise<void> | void) => {
    setPendingKeys((prev) => new Set(prev).add(key));
    try {
      await action();
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const isPending = useCallback((key: string) => pendingKeys.has(key), [pendingKeys]);

  return { isPending, run };
}
