"use client";

import { useEffect, useId, useRef } from "react";
import type { Task, TaskNoteAction } from "@/types/task";
import { useAction } from "@/lib/client/use-action";

export function DeleteTaskDialog({ task, hasNotes, onConfirm, onCancel }: {
  task: Task; hasNotes: boolean;
  onConfirm: (action?: TaskNoteAction) => Promise<void>; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { run, pending, error } = useAction();
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="delete-dialog" aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); if (!pending) onCancel(); }}>
    <h2 id={`${id}-title`}>Delete “{task.title}”?</h2>
    <p>{hasNotes ? "This task has notes. What would you like to do with them?" : "This task has no notes. Deleting it cannot be undone."}</p>
    <p className="muted">The task title and description will be deleted. Only saved notes can be kept on the clipboard.</p>
    <div className="actions">
      {hasNotes ? <>
        <button className="button danger" disabled={pending} onClick={() => void run(() => onConfirm("delete"))}>Delete task and notes</button>
        <button className="button primary" disabled={pending} onClick={() => void run(() => onConfirm("keep"))}>Delete task, keep notes</button>
      </> : <button className="button danger" disabled={pending} onClick={() => void run(() => onConfirm())}>Delete task</button>}
      <button className="button" autoFocus disabled={pending} onClick={onCancel}>Cancel</button>
    </div>
    {pending && <p role="status">Deleting task…</p>}
    {error && <p role="alert" className="error">{error} Cancel and try again to refresh the note count.</p>}
  </dialog>;
}
