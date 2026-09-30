"use client";

import { useRef, useState } from "react";
import {
  Pencil,
  X,
  MoreHorizontal,
} from "lucide-react";

import type {
  Note,
  NoteColor,
} from "@/types/note";

import { NoteForm } from "./note-form";
import { useAction } from "@/lib/client/use-action";

type NoteCardProps = {
  compact?: boolean;

  note: Note;

  onSave: (
    id: string,
    content: string,
    clipboard?: boolean
  ) => Promise<void>;

  onDelete: (id: string) => void;

  onColorChange?: (
    id: string,
    color: NoteColor
  ) => Promise<void>;
};

export function NoteCard({
  note,
  onSave,
  onDelete,
  compact = false,
  onColorChange,
}: NoteCardProps) {
  const [editing, setEditing] =
    useState(false);

  const [colorsOpen, setColorsOpen] =
    useState(false);

  const color = note.color ?? "cream";

  const colorsButton =
    useRef<HTMLButtonElement>(null);

  const editButton =
    useRef<HTMLButtonElement>(null);

  const { run, pending, error } =
    useAction();

  function closeEditor() {
    setEditing(false);

    requestAnimationFrame(() => {
      editButton.current?.focus();
    });
  }

  return (
    <li
      className={
        compact
          ? "task-note-item"
          : `note-card sticky-note sticky-${color}`
      }
      aria-busy={pending}
    >
      {editing ? (
        <NoteForm
          initialContent={note.content}
          allowClipboard={
            note.task_id !== null
          }
          onCancel={closeEditor}
          onSave={async (
            content,
            clipboard
          ) => {
            await onSave(
              note.id,
              content,
              clipboard
            );

            closeEditor();
          }}
        />
      ) : (
        <>
          <p className="note-content">
            {note.content}
          </p>

          {note.source_task_title && (
            <p className="note-source">
              From: {note.source_task_title}
            </p>
          )}

          <div className="actions note-controls">
            <button
              type="button"
              className="button"
              aria-label="Edit note"
              title="Edit note"
              ref={editButton}
              disabled={pending}
              onClick={() =>
                setEditing(true)
              }
            >
              {compact ? (
                "Edit note"
              ) : (
                <Pencil
                  size={16}
                  aria-hidden="true"
                />
              )}
            </button>

            {!compact &&
              onColorChange && (
                <button
                  type="button"
                  ref={colorsButton}
                  disabled={pending}
                  className="button"
                  aria-label="Note color options"
                  title="Note color options"
                  aria-expanded={
                    colorsOpen
                  }
                  onClick={() =>
                    setColorsOpen(
                      (value) => !value
                    )
                  }
                >
                  <MoreHorizontal
                    size={16}
                    aria-hidden="true"
                  />
                </button>
              )}

            <button
              type="button"
              className="button danger"
              aria-label="Delete note"
              title="Delete note"
              disabled={pending}
              onClick={() => {
                onDelete(note.id);
              }}
            >
              {compact ? (
                "Delete note"
              ) : (
                <X
                  size={16}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {!compact &&
            onColorChange &&
            colorsOpen && (
              <div
                className="note-colors"
                role="group"
                aria-label="Note color"
              >
                {pending && (
                  <p
                    className="muted"
                    role="status"
                  >
                    Saving color…
                  </p>
                )}

                {(
                  [
                    "cream",
                    "pink",
                    "sage",
                  ] as const
                ).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={`color-swatch sticky-${value}`}
                    aria-label={`${value} note`}
                    aria-pressed={
                      color === value
                    }
                    disabled={pending}
                    onClick={() =>
                      void run(
                        async () => {
                          await onColorChange(
                            note.id,
                            value
                          );

                          setColorsOpen(
                            false
                          );

                          requestAnimationFrame(
                            () => {
                              colorsButton.current?.focus();
                            }
                          );
                        }
                      )
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
        </>
      )}

      {error && (
        <p
          role="alert"
          className="error"
        >
          {error}
        </p>
      )}
    </li>
  );
}