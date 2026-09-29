"use client";

import { useEffect, useState } from "react";
import type { Note } from "@/types/note";
import { apiRequest } from "./api";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Note[]>("/api/notes", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setNotes(data); setError(null); } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  return {
    notes, setNotes, loading, error,
    refresh: () => { setLoading(true); setRevision(value => value + 1); },
  };
}
