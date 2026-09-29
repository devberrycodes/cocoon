"use client";

import { useId, useState, type FormEvent } from "react";
import { useAction } from "@/lib/client/use-action";

export function NoteForm({ initialContent, onSave, onCancel, disabled = false }: {
  initialContent?: string;
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [content, setContent] = useState(initialContent ?? "");
  const { run, pending, error } = useAction();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await run(async () => {
      if (!content.trim()) throw new Error("Please enter some note content.");
      await onSave(content.trim());
    });
    if (success && initialContent === undefined) setContent("");
  }
  return <form onSubmit={submit} aria-label={initialContent === undefined ? "Create note" : "Edit note"} aria-busy={pending}>
    <fieldset disabled={pending || disabled} className="form-stack">
      <div className="field">
        <label htmlFor={id}>{initialContent === undefined ? "New note" : "Note content"} <span className="muted">(required)</span></label>
        <textarea id={id} value={content} onChange={e => setContent(e.target.value)} rows={4} required maxLength={10000}
          autoFocus={initialContent !== undefined} aria-describedby={error ? `${id}-error` : undefined} placeholder="Write something to remember…" />
      </div>
      <div className="actions">
        <button className="button primary" type="submit">{pending ? "Saving…" : initialContent === undefined ? "Add note" : "Save note"}</button>
        {onCancel && <button className="button" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </fieldset>
    {error && <p className="error" role="alert" id={`${id}-error`}>{error}</p>}
  </form>;
}
