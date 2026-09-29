"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/types/task";
import type { Note } from "@/types/note";
import { apiRequest } from "@/lib/client/api";
import { NoteForm } from "./note-form";
import { NoteCard } from "./note-card";

export function NotesPanel({ task, onGeneralNotes }: { task: Task | null; onGeneralNotes: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const taskId = task?.id ?? null;

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Note[]>(`/api/notes?task_id=${taskId ?? "null"}`, { signal: controller.signal })
      .then(data => { setNotes(data); setError(null); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [taskId, attempt]);

  return <section className="panel notes-panel" aria-labelledby="notes-heading">
    <div className="section-heading">
      <div><h2 id="notes-heading" tabIndex={-1}>{task ? "Task notes" : "General notes"}</h2>
        <p className="muted break-words">{task ? task.title : "A place for notes that aren’t tied to a task."}</p></div>
      {task && <button className="button" onClick={onGeneralNotes}>General notes</button>}
    </div>
    <NoteForm disabled={loading || Boolean(error)} onSave={async content => {
      const note = await apiRequest<Note>("/api/notes", { method: "POST", body: JSON.stringify({ content, task_id: taskId }) });
      setNotes(current => [note, ...current]); setMessage("Note added.");
    }} />
    <p className="sr-only" role="status">{message}</p>
    {loading && <p role="status" className="muted">Loading notes…</p>}
    {error && <div className="error" role="alert"><p>{error}</p><button className="button" disabled={loading} onClick={() => {
      setLoading(true); setAttempt(value => value + 1);
    }}>Retry loading notes</button></div>}
    {!loading && !error && notes.length === 0 && <p className="empty">No notes yet. Add the first one above.</p>}
    <ul className="note-list" aria-label={task ? "Notes for selected task" : "General notes"}>
      {notes.map(note => <NoteCard key={note.id} note={note} onSave={async (id, content) => {
        const updated = await apiRequest<Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
        setNotes(current => current.map(item => item.id === id ? updated : item)); setMessage("Note saved.");
      }} onDelete={async id => {
        await apiRequest<void>(`/api/notes/${id}`, { method: "DELETE" });
        setNotes(current => current.filter(item => item.id !== id)); setMessage("Note deleted.");
        requestAnimationFrame(() => document.getElementById("notes-heading")?.focus());
      }} />)}
    </ul>
  </section>;
}
