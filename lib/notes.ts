import { authContext } from "./auth-server.ts";
import { supabase } from "./supabase.ts";
import type { Note, UpdateNoteInput } from "../types/note.ts";

const columns = "id, content, color, task_id, source_task_title, created_at, updated_at";
export class NoteTaskNotFoundError extends Error {}

function databaseError(operation: string, error: { code: string; message: string }): never {
  // Avoid logging row contents from database error details.
  console.error(`Supabase note ${operation} error:`, { code: error.code });
  if (error.code === "23503") throw new NoteTaskNotFoundError("Linked task not found.");
  throw new Error(`Unable to ${operation} note.`);
}

export async function listNotes(taskId?: string | null): Promise<Note[]> {
  let query = supabase.from("notes").select(columns).eq("user_id", authContext().userId).order("created_at", { ascending: false });
  if (taskId === null) query = query.is("task_id", null);
  else if (taskId !== undefined) query = query.eq("task_id", taskId);
  const { data, error } = await query.returns<Note[]>();
  if (error) databaseError("list", error);
  if (!data) throw new Error("Unable to list notes.");
  return data.map(withDefaultColor);
}

export async function getNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase.from("notes").select(columns).eq("user_id", authContext().userId).eq("id", id).maybeSingle<Note>();
  if (error) databaseError("fetch", error);
  return data ? withDefaultColor(data) : null;
}

export async function createNote(input: Pick<Note, "content" | "task_id"> & Partial<Pick<Note, "source_task_title" | "color">>): Promise<Note> {
  const { data, error } = await supabase.from("notes").insert({ ...input, user_id: authContext().userId }).select(columns).single<Note>();
  if (error) databaseError("create", error);
  if (!data) throw new Error("Unable to create note.");
  return withDefaultColor(data);
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note | null> {
  const { data, error } = await supabase.from("notes")
    .update({ ...input, updated_at: new Date().toISOString() }).eq("user_id", authContext().userId).eq("id", id).select(columns).maybeSingle<Note>();
  if (error) databaseError("update", error);
  return data ? withDefaultColor(data) : null;
}

export async function deleteNote(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("notes").delete().eq("user_id", authContext().userId).eq("id", id).select("id").maybeSingle<Pick<Note, "id">>();
  if (error) databaseError("delete", error);
  return data !== null;
}

// The task note and independent clipboard copy must succeed or fail together.
export async function saveNoteWithClipboard(input: UpdateNoteInput, id: string | null = null): Promise<Note | null> {
  const { data: result, error } = await supabase.rpc("save_note_with_clipboard", {
    p_note_id: id, p_fields: input,
  });
  if (error) databaseError("save", error);
  const data: unknown = result;
  if (data === null) return null;
  if (!isNote(data)) throw new Error("Unable to save note.");
  return data ? withDefaultColor(data) : null;
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  return "id" in value && typeof value.id === "string" &&
    "content" in value && typeof value.content === "string" &&
    "task_id" in value && (value.task_id === null || typeof value.task_id === "string") &&
    "source_task_title" in value && (value.source_task_title === null || typeof value.source_task_title === "string") &&
    "created_at" in value && typeof value.created_at === "string" &&
    "updated_at" in value && typeof value.updated_at === "string";
}

function withDefaultColor(note: Note): Note {
  return { ...note, color: note.color ?? "cream" };
}
