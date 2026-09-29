import type { UpdateNoteInput } from "../types/note.ts";
import { validId } from "./validation.ts";

type Result = { data: UpdateNoteInput; error?: never } | { error: string; data?: never };

export function validateNoteFields(body: unknown, mode: "create" | "update"): Result {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Expected a JSON object." };
  }
  const fields = body as Record<string, unknown>;
  const data: UpdateNoteInput = {};
  if (mode === "create" || "content" in fields) {
    if (typeof fields.content !== "string" || !fields.content.trim() || fields.content.trim().length > 10000) {
      return { error: "Note content must contain between 1 and 10000 characters." };
    }
    data.content = fields.content.trim();
  }
  if ("task_id" in fields) {
    if (fields.task_id !== null && (typeof fields.task_id !== "string" || !validId(fields.task_id))) {
      return { error: "Task ID must be a valid UUID or null." };
    }
    data.task_id = fields.task_id;
  }
  if (mode === "update" && Object.keys(data).length === 0) {
    return { error: "Provide at least one editable note field." };
  }
  return { data };
}
