"use client";

import { useRef, useState } from "react";
import type { Note } from "@/types/note";
import { NoteForm } from "./note-form";
import { useAction } from "@/lib/client/use-action";

export function NoteCard({ note, onSave, onDelete, compact = false }: {
  compact?: boolean;
  note: Note; onSave: (id: string, content: string) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const { run, pending, error } = useAction();
  function closeEditor() {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }
  return <li className={compact ? "task-note-item" : "note-card sticky-note"} aria-busy={pending}>
    {editing ? <NoteForm initialContent={note.content} onCancel={closeEditor} onSave={async content => {
      await onSave(note.id, content);
      closeEditor();
    }} /> : <>
      <p className="note-content">{note.content}</p>
      {note.source_task_title && <p className="note-source">From: {note.source_task_title}</p>}
      <div className="actions">
        <button className="button" ref={editButton} disabled={pending} onClick={() => setEditing(true)}>Edit note</button>
        <button className="button danger" disabled={pending} onClick={() => {
          if (window.confirm("Delete this note? This cannot be undone.")) void run(() => onDelete(note.id));
        }}>{pending ? "Deleting…" : "Delete note"}</button>
      </div>
    </>}
    {error && <p role="alert" className="error">{error}</p>}
  </li>;
}
