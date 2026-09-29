"use client";

import type { Note } from "@/types/note";
import { NoteCard } from "./note-card";
import { NoteForm } from "./note-form";

export function TaskNotes({ notes, editing, loading, error, onRetry, onAdd, onSave, onDelete, onDone }: {
  notes: Note[]; editing: boolean; loading: boolean; error: string | null; onRetry: () => void;
  onAdd: (content: string, clipboard: boolean) => Promise<void>;
  onSave: (id: string, content: string) => Promise<void>; onDelete: (id: string) => Promise<void>; onDone: () => void;
}) {
  return <div className="task-notes">
    <h4>Notes</h4>
    {loading && <p role="status" className="muted">Loading notes…</p>}
    {error && <div role="alert" className="error">{error} <button className="button" onClick={onRetry}>Retry notes</button></div>}
    {!loading && !error && notes.length === 0 && <p className="muted">No task notes yet.</p>}
    <ul className="task-note-bullets">
      {notes.map(note => editing ? <NoteCard key={note.id} note={note} compact onSave={onSave} onDelete={onDelete} /> :
        <li key={note.id}><p className="note-content">{note.content}</p></li>)}
    </ul>
    {editing && <>
      <NoteForm allowClipboard disabled={loading || Boolean(error)} onSave={onAdd} />
      <button className="button done-notes" onClick={onDone}>Done editing notes</button>
    </>}
  </div>;
}
