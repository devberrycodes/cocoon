import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { Note } from "../types/note.ts";
import type { Task } from "../types/task.ts";
import { todayDate } from "../lib/dates.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cocoon-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
const tasks = await import("../app/api/tasks/route.ts");
const detail = await import("../app/api/tasks/[id]/route.ts");
const notesApi = await import("../app/api/notes/route.ts");
const task: Task = {
  id: "00000000-0000-4000-8000-000000000001", title: "Finish Cocoon API", description: "Description is not a note",
  completed: false, priority: "medium", due_date: null, created_at: "2026-09-29T12:00:00Z", updated_at: "2026-09-29T12:00:00Z",
};
const note: Note = {
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
    if (url.pathname.endsWith("/rpc/delete_task_with_notes")) {
      if (failRpc) return Response.json({ code: "42501", message: "private permission details" }, { status: 403 });
      const payload = await req.clone().json();
      if (!currentTask) return Response.json({ status: "not_found" });
      const attached = notes.filter(n => n.task_id === payload.p_task_id);
      if (attached.length && payload.p_note_action === null) return Response.json({ status: "notes_choice_required" });
      notes = payload.p_note_action === "keep" ? notes.map(n => n.task_id === task.id ? { ...n, task_id: null, source_task_title: task.title } : n) : notes.filter(n => n.task_id !== task.id);
      currentTask = null;
      return Response.json({ status: "deleted", note_count: attached.length });
    }
    if (url.pathname.endsWith("/rpc/create_task_with_notes")) {
      if (failRpc) return Response.json({ code: "23514", message: "private note constraint" }, { status: 400 });
      const payload = await req.clone().json();
      currentTask = { ...task, ...payload.p_task };
      notes = payload.p_notes.map((n: { content: string; add_to_clipboard: boolean }, i: number) => ({
        ...note, id: String(i), content: n.content,
        task_id: n.add_to_clipboard ? null : task.id, source_task_title: n.add_to_clipboard ? currentTask?.title : null,
      }));
      return Response.json(currentTask);
    }
    if (url.pathname.endsWith("/tasks")) {
      if (req.method === "GET") return Response.json(currentTask ? [currentTask] : []);
      const payload = await req.clone().json();
      currentTask = { ...task, ...payload };
      return Response.json(req.method === "PATCH" ? [currentTask] : currentTask);
    }
    if (url.pathname.endsWith("/notes")) {
      if (req.method === "GET") {
        return Response.json(notes.filter(n => url.searchParams.get("task_id") === "is.null" ? n.task_id === null : true));
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

test("deleting with notes requires an explicit choice and changes nothing", async () => {
  const response = await detail.DELETE(request("DELETE"), context());
  assert.equal(response.status, 409); assert.ok(currentTask); assert.equal(notes[0].task_id, task.id);
});
test("delete without notes succeeds and never converts the description into a note", async () => {
  notes = [];
  assert.equal((await detail.DELETE(request("DELETE"), context())).status, 204);
  assert.equal(currentTask, null); assert.deepEqual(notes, []);
});
test("keep notes detaches them and preserves the source title on the clipboard", async () => {
  const response = await detail.DELETE(request("DELETE", undefined, "?notes=keep"), context());
  assert.equal(response.status, 204); assert.equal(currentTask, null);
  const clipboard = await notesApi.GET(new Request("http://localhost/api/notes?task_id=null"));
  assert.deepEqual(await clipboard.json(), [{ ...note, task_id: null, source_task_title: task.title }]);
  const payload = await calls[0].json();
  assert.deepEqual(payload, { p_task_id: task.id, p_note_action: "keep" });
});
test("delete task and notes removes only that task's notes", async () => {
  const general = { ...note, id: "general", task_id: null }; notes.push(general);
  assert.equal((await detail.DELETE(request("DELETE", undefined, "?notes=delete"), context())).status, 204);
  assert.deepEqual(notes, [general]);
});
test("failed atomic deletion leaves the task and notes in place and returns a safe error", async () => {
  failRpc = true;
  const response = await detail.DELETE(request("DELETE", undefined, "?notes=keep"), context());
  assert.equal(response.status, 500); assert.deepEqual(await response.json(), { error: "Unable to delete task." });
  assert.ok(currentTask); assert.deepEqual(notes, [note]);
});
test("invalid deletion choice is rejected before database access", async () => {
  assert.equal((await detail.DELETE(request("DELETE", undefined, "?notes=unknown"), context())).status, 400);
  assert.equal(calls.length, 0);
});
test("initial notes use one atomic request and honor each clipboard option", async () => {
  const response = await tasks.POST(request("POST", { title: "New task", priority: "high", due_date: todayDate(), notes: [
    { content: "  Attached  " }, { content: "General reminder", add_to_clipboard: true },
  ] }));
  assert.equal(response.status, 201); assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/rest/v1/rpc/create_task_with_notes");
  assert.equal(notes[0].task_id, task.id); assert.equal(notes[0].content, "Attached");
  assert.equal(notes[1].task_id, null); assert.equal(notes[1].source_task_title, "New task");
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
  test(`${method} rejects past due dates and accepts today`, async () => {
    const yesterday = todayDate(new Date(Date.now() - 86400000));
    const invoke = (date: string) => method === "POST" ? tasks.POST(request("POST", { title: "Task", due_date: date })) : detail.PATCH(request("PATCH", { due_date: date }), context());
    assert.equal((await invoke(yesterday)).status, 400); assert.equal(calls.length, 0);
    assert.equal((await invoke(todayDate())).status, method === "POST" ? 201 : 200);
  });
}
test("Add to clipboard creates one general note with server-derived task title", async () => {
  notes = [];
  const response = await notesApi.POST(request("POST", { content: "Remember this", task_id: task.id, add_to_clipboard: true, source_task_title: "untrusted" }));
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.task_id, null); assert.equal(created.source_task_title, task.title); assert.equal(notes.length, 1);
});
test("Add to clipboard rejects a non-boolean toggle", async () => {
  assert.equal((await notesApi.POST(request("POST", { content: "Note", task_id: task.id, add_to_clipboard: "yes" }))).status, 400);
  assert.equal(calls.length, 0);
});
