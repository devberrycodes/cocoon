"use client";

import { useRef, useState } from "react";

export function useAction() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { pending, error, run };
}
