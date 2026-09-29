"use client";

import type { Note } from "@/types/note";
import { NoteForm } from "./note-form";
import { NoteCard } from "./note-card";

export function NotesPanel({ notes, loading, error, onRetry, onAdd, onSave, onDelete }: {
  notes: Note[]; loading: boolean; error: string | null; onRetry: () => void;
  onAdd: (content: string) => Promise<void>; onSave: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return <section className="panel clipboard" aria-labelledby="notes-heading">
    <div className="clipboard-clip" aria-hidden="true" />
    <h2 id="notes-heading" tabIndex={-1}>General Notes</h2>
    <p className="muted clipboard-intro">Your clipboard for ideas, reminders, and notes you want to keep.</p>
    <NoteForm inline disabled={loading || Boolean(error)} onSave={onAdd} />
    {loading && <p role="status" className="muted">Loading clipboard…</p>}
    {error && <div role="alert" className="error"><p>{error}</p><button className="button" disabled={loading} onClick={onRetry}>Retry loading notes</button></div>}
    {!loading && !error && notes.length === 0 && <p className="empty">Your clipboard is empty. Add your first note above.</p>}
    <ul className="note-list" aria-label="General notes clipboard">
      {notes.map(note => <NoteCard key={note.id} note={note} onSave={onSave} onDelete={onDelete} />)}
    </ul>
  </section>;
}
