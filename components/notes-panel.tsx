"use client";

import { visualAssets } from "@/lib/visual-assets";
import type {
  Note,
  NoteColor,
} from "@/types/note";

import { NoteForm } from "./note-form";
import { NoteCard } from "./note-card";

type NotesPanelProps = {
  notes: Note[];
  loading: boolean;
  error: string | null;

  onRetry: () => void;

  onAdd: (
    content: string
  ) => Promise<void>;

  onSave: (
    id: string,
    content: string
  ) => Promise<void>;

  onColorChange: (
    id: string,
    color: NoteColor
  ) => Promise<void>;

  onDelete: (id: string) => void;
};

export function NotesPanel({
  notes,
  loading,
  error,
  onRetry,
  onAdd,
  onSave,
  onDelete,
  onColorChange,
}: NotesPanelProps) {
  return (
    <section
      className="panel clipboard"
      aria-labelledby="notes-heading"
      style={
        visualAssets.clipboardTexture
          ? {
              backgroundImage: `linear-gradient(var(--clipboard-tint), var(--clipboard-tint)), url("${visualAssets.clipboardTexture}")`,
            }
          : undefined
      }
    >
      <div
        className="clipboard-clip"
        aria-hidden="true"
      />

      <h2
        id="notes-heading"
        tabIndex={-1}
      >
        General Notes
      </h2>

      <p className="muted clipboard-intro">
        Your clipboard for ideas, reminders,
        and notes you want to keep.
      </p>

      <NoteForm
        inline
        disabled={
          loading || Boolean(error)
        }
        onSave={onAdd}
      />

      {loading && (
        <p
          role="status"
          className="muted"
        >
          Loading notes…
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="error"
        >
          <p>{error}</p>

          <button
            className="button"
            disabled={loading}
            onClick={onRetry}
          >
            Retry loading notes
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        notes.length === 0 && (
          <p className="empty">
            No general notes yet. Add your
            first note above.
          </p>
        )}

      <ul
        className="note-list"
        aria-label="General notes"
      >
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onColorChange={
              onColorChange
            }
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  );
}