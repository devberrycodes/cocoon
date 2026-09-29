import { createNote, listNotes, NoteTaskNotFoundError } from "../../../lib/notes.ts";
import { getTask } from "../../../lib/tasks.ts";
import { validateNoteFields } from "../../../lib/note-validation.ts";
import { validId } from "../../../lib/validation.ts";

export async function GET(request: Request) {
  const filter = new URL(request.url).searchParams.get("task_id");
  if (filter !== null && filter !== "null" && !validId(filter)) {
    return Response.json({ error: "Invalid task ID." }, { status: 400 });
  }
  try {
    return Response.json(await listNotes(filter === "null" ? null : filter ?? undefined));
  } catch (error) {
    console.error("Note listing failed:", error);
    return Response.json({ error: "Unable to fetch notes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const result = validateNoteFields(body, "create");
  if (result.error !== undefined) return Response.json({ error: result.error }, { status: 400 });
  try {
    const taskId = result.data.task_id ?? null;
    if (taskId && !await getTask(taskId)) {
      return Response.json({ error: "Linked task not found." }, { status: 404 });
    }
    return Response.json(await createNote({ content: result.data.content ?? "", task_id: taskId }), { status: 201 });
  } catch (error) {
    if (error instanceof NoteTaskNotFoundError) return Response.json({ error: "Linked task not found." }, { status: 404 });
    console.error("Note creation failed:", error);
    return Response.json({ error: "Unable to create note." }, { status: 500 });
  }
}
