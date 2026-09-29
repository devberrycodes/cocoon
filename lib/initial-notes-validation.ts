import type { InitialTaskNote } from "../types/note.ts";
import { validateNoteFields } from "./note-validation.ts";

type Result = { data: InitialTaskNote[]; error?: never } | { error: string; data?: never };
export function validateInitialNotes(value: unknown): Result {
  if (value === undefined) return { data: [] };
  if (!Array.isArray(value) || value.length > 50) return { error: "Notes must be an array of at most 50 notes." };
  const notes: InitialTaskNote[] = [];
  for (const item of value) {
    const result = validateNoteFields(item, "create");
    if (result.error !== undefined) return { error: result.error };
    const fields = item as Record<string, unknown>;
    if (fields.add_to_clipboard !== undefined && typeof fields.add_to_clipboard !== "boolean") {
      return { error: "Add to clipboard must be a boolean." };
    }
    notes.push({ content: result.data.content ?? "", add_to_clipboard: fields.add_to_clipboard === true });
  }
  return { data: notes };
}
