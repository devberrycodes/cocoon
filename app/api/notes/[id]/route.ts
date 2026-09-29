import { withAuth } from "../../../../lib/auth-server.ts";
import { deleteNote, getNote, updateNote, saveNoteWithClipboard, NoteTaskNotFoundError } from "../../../../lib/notes.ts";
import { getTask } from "../../../../lib/tasks.ts";
import { validateNoteFields } from "../../../../lib/note-validation.ts";
import { validId } from "../../../../lib/validation.ts";

type Context = { params: Promise<{ id: string }> };
const notFound = () => Response.json({ error: "Note not found." }, { status: 404 });
const invalidId = () => Response.json({ error: "Invalid note ID." }, { status: 400 });

async function handleGET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return invalidId();
    const note = await getNote(id);
    return note ? Response.json(note) : notFound();
  } catch (error) {
    console.error("Note retrieval failed:", error);
    return Response.json({ error: "Unable to fetch note." }, { status: 500 });
  }
}

async function handlePATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return invalidId();
    let body: unknown;
    try { body = await request.json(); }
    catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
    const result = validateNoteFields(body, "update");
    if (result.error !== undefined) return Response.json({ error: result.error }, { status: 400 });
    if (result.data.task_id && !await getTask(result.data.task_id)) {
      return Response.json({ error: "Linked task not found." }, { status: 404 });
    }
    const fields = body as Record<string, unknown>;
    if (fields.add_to_clipboard !== undefined && typeof fields.add_to_clipboard !== "boolean") {
      return Response.json({ error: "Add to clipboard must be a boolean." }, { status: 400 });
    }
    if (fields.add_to_clipboard === true) {
      const existing = await getNote(id);
      if (!existing) return notFound();
      if (!(result.data.task_id === undefined ? existing.task_id : result.data.task_id)) {
        return Response.json({ error: "A task is required for the clipboard reference." }, { status: 400 });
      }
    }
    const note = fields.add_to_clipboard === true
      ? await saveNoteWithClipboard(result.data, id)
      : await updateNote(id, result.data);
    return note ? Response.json(note) : notFound();
  } catch (error) {
    if (error instanceof NoteTaskNotFoundError) return Response.json({ error: "Linked task not found." }, { status: 404 });
    console.error("Note update failed:", error);
    return Response.json({ error: "Unable to update note." }, { status: 500 });
  }
}

async function handleDELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return invalidId();
    return await deleteNote(id) ? new Response(null, { status: 204 }) : notFound();
  } catch (error) {
    console.error("Note deletion failed:", error);
    return Response.json({ error: "Unable to delete note." }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const PATCH = withAuth(handlePATCH);
export const DELETE = withAuth(handleDELETE);
