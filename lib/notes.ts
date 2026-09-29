import { supabase } from "./supabase.ts";
import type { Note, UpdateNoteInput } from "../types/note.ts";

const columns = "id, content, task_id, source_task_title, created_at, updated_at";
export class NoteTaskNotFoundError extends Error {}

function databaseError(operation: string, error: { code: string; message: string }): never {
  // Avoid logging row contents from database error details.
  console.error(`Supabase note ${operation} error:`, { code: error.code });
  if (error.code === "23503") throw new NoteTaskNotFoundError("Linked task not found.");
  throw new Error(`Unable to ${operation} note.`);
}

export async function listNotes(taskId?: string | null): Promise<Note[]> {
  let query = supabase.from("notes").select(columns).order("created_at", { ascending: false });
  if (taskId === null) query = query.is("task_id", null);
  else if (taskId !== undefined) query = query.eq("task_id", taskId);
  const { data, error } = await query.returns<Note[]>();
  if (error) databaseError("list", error);
  if (!data) throw new Error("Unable to list notes.");
  return data;
}

export async function getNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase.from("notes").select(columns).eq("id", id).maybeSingle<Note>();
  if (error) databaseError("fetch", error);
  return data;
}

export async function createNote(input: Pick<Note, "content" | "task_id"> & Partial<Pick<Note, "source_task_title">>): Promise<Note> {
  const { data, error } = await supabase.from("notes").insert(input).select(columns).single<Note>();
  if (error) databaseError("create", error);
  if (!data) throw new Error("Unable to create note.");
  return data;
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note | null> {
  const { data, error } = await supabase.from("notes")
    .update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).select(columns).maybeSingle<Note>();
  if (error) databaseError("update", error);
  return data;
}

export async function deleteNote(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("notes").delete().eq("id", id).select("id").maybeSingle<Pick<Note, "id">>();
  if (error) databaseError("delete", error);
  return data !== null;
}
