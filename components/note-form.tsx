"use client";

import { useId, useState, type FormEvent } from "react";
import { useAction } from "@/lib/client/use-action";

export function NoteForm({ initialContent, onSave, onCancel, disabled = false, allowClipboard = false, inline = false }: {
  initialContent?: string;
  onSave: (content: string, clipboard: boolean) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  allowClipboard?: boolean;
  inline?: boolean;
}) {
  const id = useId();
  const [content, setContent] = useState(initialContent ?? "");
  const [clipboard, setClipboard] = useState(false);
  const { run, pending, error } = useAction();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await run(async () => {
      if (!content.trim()) throw new Error("Please enter some note content.");
      await onSave(content.trim(), clipboard);
    });
    if (success && initialContent === undefined) { setContent(""); setClipboard(false); }
  }
  return <form onSubmit={submit} aria-label={initialContent === undefined ? "Create note" : "Edit note"} aria-busy={pending}>
    <fieldset disabled={pending || disabled} className={inline ? "clipboard-entry" : "form-stack"}>
      <div className="field">
        <label className={inline ? "sr-only" : undefined} htmlFor={id}>{initialContent === undefined ? "New note" : "Note content"} <span className="muted">(required)</span></label>
        {inline ? <input id={id} value={content} onChange={e => setContent(e.target.value)} required maxLength={10000}
          aria-describedby={error ? `${id}-error` : undefined} placeholder="new note ..." /> :
          <textarea id={id} value={content} onChange={e => setContent(e.target.value)} rows={3} required maxLength={10000}
            autoFocus={initialContent !== undefined} aria-describedby={error ? `${id}-error` : undefined} placeholder="Write something to remember…" />}

      </div>
      {allowClipboard && <label className="checkbox-label">
        <input type="checkbox" checked={clipboard} onChange={event => setClipboard(event.target.checked)} />
        Also add to clipboard
      </label>}
      {allowClipboard && <p className="muted">{clipboard ? "Keeps this task note and adds an independent copy to General Notes." : "Saved only under this task. Existing clipboard copies stay unchanged."}</p>}
      <div className="actions">
        <button className="button primary" type="submit">{pending ? "Saving…" : initialContent === undefined ? "Add note" : "Save note"}</button>
        {onCancel && <button className="button" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </fieldset>
    {error && <p className="error" role="alert" id={`${id}-error`}>{error}</p>}
  </form>;
}
