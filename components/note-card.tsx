"use client";

import { useRef, useState } from "react";
import { Pencil, X, MoreHorizontal } from "lucide-react";
import type { Note } from "@/types/note";
import { NoteForm } from "./note-form";
import { useAction } from "@/lib/client/use-action";

export function NoteCard({ note, onSave, onDelete, compact = false }: {
  compact?: boolean;
  note: Note; onSave: (id: string, content: string, clipboard?: boolean) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [color, setColor] = useState("cream");
  const editButton = useRef<HTMLButtonElement>(null);
  const { run, pending, error } = useAction();
  function closeEditor() {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }
  return <li className={compact ? "task-note-item" : `note-card sticky-note sticky-${color}`} aria-busy={pending}>
    {editing ? <NoteForm initialContent={note.content} allowClipboard={note.task_id !== null} onCancel={closeEditor} onSave={async (content, clipboard) => {
      await onSave(note.id, content, clipboard);
      closeEditor();
    }} /> : <>
      <p className="note-content">{note.content}</p>
      {note.source_task_title && <p className="note-source">From: {note.source_task_title}</p>}
      <div className="actions note-controls">
        <button className="button" aria-label="Edit note" title="Edit note" ref={editButton} disabled={pending} onClick={() => setEditing(true)}>
          {compact ? "Edit note" : <Pencil size={16} aria-hidden="true" />}
        </button>
        {!compact && <button className="button" aria-label="Note color options" title="Note color options" aria-expanded={colorsOpen}
          onClick={() => setColorsOpen(value => !value)}><MoreHorizontal size={16} aria-hidden="true" /></button>}
        <button className="button danger" aria-label="Delete note" title="Delete note" disabled={pending} onClick={() => {
          if (window.confirm("Delete this note? Independent clipboard copies will remain. This cannot be undone.")) void run(() => onDelete(note.id));
        }}>{compact ? (pending ? "Deleting…" : "Delete note") : <X size={16} aria-hidden="true" />}</button>
      </div>
      {!compact && colorsOpen && <div className="note-colors" role="group" aria-label="Preview note color">
        <p className="muted">Color preview · resets on reload</p>
        {["cream", "pink", "sage"].map(value => <button type="button" key={value} className={`color-swatch sticky-${value}`}
          aria-label={`${value} note`} aria-pressed={color === value} onClick={() => setColor(value)}>{value}</button>)}
      </div>}
    </>}
    {error && <p role="alert" className="error">{error}</p>}
  </li>;
}
