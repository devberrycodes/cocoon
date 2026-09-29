import { authenticated } from "./helpers/auth.ts";
import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { Note } from "../types/note.ts";
import type { Task } from "../types/task.ts";
const todayDate = (date = new Date("2099-09-29T18:00:00.000Z")) => date.toISOString();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cocoon-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
const tasks = authenticated(await import("../app/api/tasks/route.ts"));
const detail = authenticated(await import("../app/api/tasks/[id]/route.ts"));
const noteDetail = authenticated(await import("../app/api/notes/[id]/route.ts"));
const notesApi = authenticated(await import("../app/api/notes/route.ts"));
const task: Task = {
  id: "00000000-0000-4000-8000-000000000001", title: "Finish Cocoon API", description: "Description is not a note",
  completed: false, priority: "medium", due_date: null, created_at: "2026-09-29T12:00:00Z", updated_at: "2026-09-29T12:00:00Z",
};
const note: Note = {
  color: "cream",
  id: "00000000-0000-4000-8000-000000000002", task_id: task.id, content: "Test missing-task responses",
  source_task_title: null, created_at: task.created_at, updated_at: task.updated_at,
};
let currentTask: Task | null;
let notes: Note[];
let calls: Request[];
let failRpc: boolean;
beforeEach(() => {
  currentTask = { ...task }; notes = [{ ...note }]; calls = []; failRpc = false;
  mock.method(console, "error", () => {});
  mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init); calls.push(req);
    const url = new URL(req.url);
    if (url.pathname.endsWith("/rpc/save_note_with_clipboard")) {
      if (failRpc) return Response.json({ code: "42501", message: "private permission details" }, { status: 403 });
      const payload = await req.clone().json();
      const existing = payload.p_note_id ? notes.find(n => n.id === payload.p_note_id) : note;
      if (!existing) return Response.json(null);
      const saved = { ...existing, ...payload.p_fields };
      notes = notes.filter(n => n.id !== saved.id);
      notes.push(saved, { ...saved, id: "copy", task_id: null, source_task_title: currentTask?.title });
      return Response.json(saved);
    }
    if (url.pathname.endsWith("/rpc/create_task_with_notes")) {
      if (failRpc) return Response.json({ code: "23514", message: "private note constraint" }, { status: 400 });
      const payload = await req.clone().json();
      currentTask = { ...task, ...payload.p_task };
      notes = payload.p_notes.flatMap((n: { content: string; add_to_clipboard: boolean }, i: number) => {
        const attached = { ...note, id: String(i), content: n.content, task_id: task.id };
        return n.add_to_clipboard ? [attached, { ...attached, id: `copy-${i}`, task_id: null, source_task_title: currentTask?.title }] : [attached];
      });
      return Response.json(currentTask);
    }
    if (url.pathname.endsWith("/tasks")) {
      if (req.method === "DELETE") {
        if (failRpc) return Response.json({ code: "42501", message: "private permission details" }, { status: 403 });
        const deleted = currentTask;
        currentTask = null; notes = notes.filter(n => n.task_id !== task.id);
        return Response.json(deleted ? [{ id: deleted.id }] : []);
      }
      if (req.method === "GET") return Response.json(currentTask ? [currentTask] : []);
      const payload = await req.clone().json();
      currentTask = { ...task, ...payload };
      return Response.json(req.method === "PATCH" ? [currentTask] : currentTask);
    }
    if (url.pathname.endsWith("/notes")) {
      if (req.method === "GET") {
        return Response.json(notes.filter(n => url.searchParams.has("id") ? `eq.${n.id}` === url.searchParams.get("id") : url.searchParams.get("task_id") === "is.null" ? n.task_id === null : true));
      }
      const payload = await req.clone().json();
      const saved = { ...note, ...payload }; notes.push(saved);
      return Response.json(saved, { status: 201 });
    }
    throw new Error("Unexpected database request");
  });
});
afterEach(() => mock.restoreAll());
const context = () => ({ params: Promise.resolve({ id: task.id }) });
const request = (method: string, body?: unknown, query = "") => new Request(`http://localhost/api/tasks/${task.id}${query}`, {
  method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
});

test("deleting a task cascades task notes but keeps independent clipboard notes", async () => {
  const general = { ...note, id: "general", task_id: null };
  const copy = { ...note, id: "copy", task_id: null, source_task_title: task.title };
  notes.push(general, copy);
  assert.equal((await detail.DELETE(request("DELETE"), context())).status, 204);
  assert.equal(currentTask, null); assert.deepEqual(notes, [general, copy]);
});
test("delete without notes never converts the description into a note", async () => {
  notes = [];
  assert.equal((await detail.DELETE(request("DELETE"), context())).status, 204);
  assert.equal(currentTask, null); assert.deepEqual(notes, []);
});
test("failed deletion leaves task and notes in place and returns safe error", async () => {
  failRpc = true;
  const response = await detail.DELETE(request("DELETE"), context());
  assert.equal(response.status, 500); assert.deepEqual(await response.json(), { error: "Unable to delete task." });
  assert.ok(currentTask); assert.deepEqual(notes, [note]);
});
test("initial notes use one atomic request and honor each clipboard option", async () => {
  const response = await tasks.POST(request("POST", { title: "New task", description: "Plan the release", priority: "high", due_date: todayDate(), notes: [
    { content: "  Attached  " }, { content: "General reminder", add_to_clipboard: true },
  ] }));
  assert.equal(response.status, 201); assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/rest/v1/rpc/create_task_with_notes");
  assert.equal(notes[0].task_id, task.id); assert.equal(notes[0].content, "Attached");
  assert.equal(notes[1].task_id, task.id); assert.equal(notes[2].task_id, null);
  assert.equal(notes[2].source_task_title, "New task"); assert.equal(notes.length, 3);
  assert.equal(currentTask?.description, "Plan the release");
  assert.equal(currentTask?.priority, "high"); assert.equal(currentTask?.due_date, todayDate());
});
test("failed initial-note transaction does not create a task", async () => {
  currentTask = null; notes = []; failRpc = true;
  const response = await tasks.POST(request("POST", { title: "New", notes: [{ content: "Note" }] }));
  assert.equal(response.status, 500); assert.equal(currentTask, null); assert.deepEqual(notes, []);
});
for (const body of [
  { notes: [{ content: " " }] }, { notes: [{ content: "x".repeat(10001) }] },
  { notes: "bad" }, { notes: [{ content: "Note", add_to_clipboard: "yes" }] },
]) {
  test(`invalid initial notes are rejected: ${JSON.stringify(body).slice(0, 50)}`, async () => {
    assert.equal((await tasks.POST(request("POST", { title: "Task", ...body }))).status, 400);
    assert.equal(calls.length, 0);
  });
}
for (const method of ["POST", "PATCH"] as const) {
  test(`${method} rejects past due dates and accepts future timestamps`, async () => {
    const yesterday = todayDate(new Date(Date.now() - 86400000));
    const invoke = (date: string) => method === "POST" ? tasks.POST(request("POST", { title: "Task", due_date: date })) : detail.PATCH(request("PATCH", { due_date: date }), context());
    assert.equal((await invoke(yesterday)).status, 400); assert.equal(calls.length, 0);
    assert.equal((await invoke(todayDate())).status, method === "POST" ? 201 : 200);
  });
}
test("Also add to clipboard keeps the task note and creates an independent copy", async () => {
  notes = [];
  const response = await notesApi.POST(request("POST", { content: "Remember this", task_id: task.id, add_to_clipboard: true, source_task_title: "untrusted" }));
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.task_id, task.id); assert.equal(notes.length, 2);
  assert.equal(notes[1].task_id, null); assert.equal(notes[1].source_task_title, task.title);
  assert.equal((await detail.DELETE(request("DELETE"), context())).status, 204);
  assert.equal(notes.length, 1); assert.equal(notes[0].content, "Remember this");
});
test("Add to clipboard rejects a non-boolean toggle", async () => {
  assert.equal((await notesApi.POST(request("POST", { content: "Note", task_id: task.id, add_to_clipboard: "yes" }))).status, 400);
  assert.equal(calls.length, 0);
});

test("editing a task note can also add an independent clipboard copy", async () => {
  const response = await noteDetail.PATCH(request("PATCH", { content: "Updated", add_to_clipboard: true }), { params: Promise.resolve({ id: note.id }) });
  assert.equal(response.status, 200); assert.equal((await response.json()).task_id, task.id);
  assert.equal(notes.length, 2); assert.equal(notes[0].content, "Updated");
  assert.equal(notes[1].content, "Updated"); assert.equal(notes[1].task_id, null);
});
test("failed clipboard copy does not update the task note", async () => {
  failRpc = true;
  const response = await noteDetail.PATCH(request("PATCH", { content: "Updated", add_to_clipboard: true }), { params: Promise.resolve({ id: note.id }) });
  assert.equal(response.status, 500); assert.deepEqual(notes, [note]);
  assert.deepEqual(await response.json(), { error: "Unable to update note." });
});
test("general notes cannot be copied with task-only clipboard option", async () => {
  notes = [{ ...note, task_id: null }];
  const response = await noteDetail.PATCH(request("PATCH", { content: "Updated", add_to_clipboard: true }), { params: Promise.resolve({ id: note.id }) });
  assert.equal(response.status, 400);
});
test("PATCH rejects non-boolean clipboard option", async () => {
  const response = await noteDetail.PATCH(request("PATCH", { content: "Updated", add_to_clipboard: "yes" }), { params: Promise.resolve({ id: note.id }) });
  assert.equal(response.status, 400); assert.equal(calls.length, 0);
});
