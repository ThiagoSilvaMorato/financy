import { useCallback, useState } from "react";

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (action: () => Promise<void> | void) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, run };
}
