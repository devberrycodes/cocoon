import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { Note } from "../types/note.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cocoon-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
const collection = await import("../app/api/notes/route.ts");
const detail = await import("../app/api/notes/[id]/route.ts");
const { supabase } = await import("../lib/supabase.ts");
const taskId = "00000000-0000-4000-8000-000000000001";
const note: Note = {
  source_task_title: null,
  id: "00000000-0000-4000-8000-000000000002", content: "Remember this", task_id: taskId,
  created_at: "2026-09-29T12:00:00Z", updated_at: "2026-09-29T12:00:00Z",
};
let rows: Note[];
let calls: Request[];
let taskExists: boolean;
let errorCode: string | null;
let logs: unknown[][];

beforeEach(() => {
  rows = [{ ...note }]; calls = []; taskExists = true; errorCode = null; logs = [];
  mock.method(console, "error", (...args: unknown[]) => { logs.push(args); });
  mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    calls.push(req);
    const url = new URL(req.url);
    if (errorCode) return Response.json({ code: errorCode, message: "private database detail", details: "private contents" }, { status: 400 });
    if (url.pathname.endsWith("/tasks")) return Response.json(taskExists ? [{ id: taskId, title: "Source task" }] : []);
    assert.equal(url.pathname, "/rest/v1/notes");
    const id = url.searchParams.get("id")?.slice(3);
    const filtered = id ? rows.filter(row => row.id === id) : rows;
    if (req.method === "GET") {
      const taskFilter = url.searchParams.get("task_id");
      return Response.json(filtered.filter(row => taskFilter === "is.null" ? row.task_id === null :
        taskFilter ? row.task_id === taskFilter.slice(3) : true));
    }
    if (req.method === "POST") {
      const input = await req.clone().json();
      const created = { ...note, ...input };
      rows.push(created);
      return Response.json(created, { status: 201 });
    }
    if (req.method === "PATCH") {
      const input = await req.clone().json();
      rows = rows.map(row => row.id === id ? { ...row, ...input } : row);
      return Response.json(rows.filter(row => row.id === id));
    }
    if (req.method === "DELETE") {
      rows = rows.filter(row => row.id !== id);
      return Response.json(filtered.map(row => ({ id: row.id })));
    }
    throw new Error("Unexpected request");
  });
});
afterEach(() => mock.restoreAll());

const context = (id = note.id) => ({ params: Promise.resolve({ id }) });
function request(method: string, body?: unknown, query = "") {
  return new Request(`http://localhost/api/notes${query}`, { method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
}

test("POST creates a standalone note, trims content, and ignores protected fields", async () => {
  const response = await collection.POST(request("POST", { content: "  New note  ", id: "injected", created_at: "injected" }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).content, "New note");
  assert.deepEqual(await calls[0].json(), { content: "New note", task_id: null });
});

test("POST creates a note belonging to an existing task", async () => {
  const response = await collection.POST(request("POST", { content: "Linked", task_id: taskId }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).task_id, taskId);
  assert.equal(calls.length, 2);
});

test("GET lists notes newest first and filters by task or standalone", async () => {
  rows.push({ ...note, id: "standalone", task_id: null });
  const all = await collection.GET(request("GET"));
  assert.equal(all.status, 200);
  assert.equal((await all.json()).length, 2);
  assert.equal(new URL(calls[0].url).searchParams.get("order"), "created_at.desc");
  const linked = await collection.GET(request("GET", undefined, `?task_id=${taskId}`));
  assert.deepEqual(await linked.json(), [note]);
  const general = await collection.GET(request("GET", undefined, "?task_id=null"));
  assert.equal((await general.json())[0].task_id, null);
});

test("GET returns an empty list", async () => {
  rows = [];
  const response = await collection.GET(request("GET"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test("GET retrieves a single note", async () => {
  const response = await detail.GET(request("GET"), context());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), note);
});

test("PATCH updates content and timestamp while preserving task link and creation time", async () => {
  const before = Date.now();
  const response = await detail.PATCH(request("PATCH", { content: "  Edited  ", id: "injected", updated_at: "injected" }), context());
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.content, "Edited"); assert.equal(saved.task_id, taskId);
  assert.equal(saved.id, note.id); assert.equal(saved.created_at, note.created_at);
  assert.ok(Date.parse(saved.updated_at) >= before && Date.parse(saved.updated_at) <= Date.now());
});

test("PATCH allows unlinking and linking a note without changing content", async () => {
  let response = await detail.PATCH(request("PATCH", { task_id: null }), context());
  assert.equal((await response.json()).task_id, null);
  response = await detail.PATCH(request("PATCH", { task_id: taskId }), context());
  const saved = await response.json();
  assert.equal(saved.task_id, taskId); assert.equal(saved.content, note.content);
});

test("DELETE returns an empty 204 and the note is no longer retrievable", async () => {
  const response = await detail.DELETE(request("DELETE"), context());
  assert.equal(response.status, 204); assert.equal(await response.text(), "");
  assert.equal((await detail.GET(request("GET"), context())).status, 404);
  assert.equal((await detail.DELETE(request("DELETE"), context())).status, 404);
});

for (const [label, handler] of [["POST", collection.POST], ["PATCH", (req: Request) => detail.PATCH(req, context())]] as const) {
  for (const [name, body] of [
    ["empty content", { content: "" }], ["whitespace", { content: " \n " }],
    ["null content", { content: null }], ["numeric content", { content: 42 }],
    ["long content", { content: "x".repeat(10001) }], ["array", []], ["null body", null],
    ["invalid task", { content: "Note", task_id: "invalid" }], ["no editable fields", { id: "injected" }],
  ] as const) {
    test(`${label} rejects ${name} before database access`, async () => {
      const response = await handler(request(label, body));
      assert.equal(response.status, 400); assert.equal(calls.length, 0);
    });
  }
  test(`${label} rejects malformed JSON`, async () => {
    const response = await handler(new Request("http://localhost/api/notes", { method: label, body: "{" }));
    assert.equal(response.status, 400); assert.equal(calls.length, 0);
  });
  test(`${label} rejects a missing linked task`, async () => {
    taskExists = false;
    const response = await handler(request(label, { content: "Note", task_id: taskId }));
    assert.equal(response.status, 404); assert.equal(calls.length, 1);
  });
  test(`${label} handles a task deleted between validation and write`, async () => {
    errorCode = "23503";
    const response = await handler(request(label, { content: "Note" }));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Linked task not found." });
  });
}

for (const [method, handler] of [["GET", detail.GET], ["PATCH", detail.PATCH], ["DELETE", detail.DELETE]] as const) {
  test(`${method} returns 404 for a missing note`, async () => {
    rows = [];
    const response = await handler(request(method, method === "PATCH" ? { content: "Note" } : undefined), context());
    assert.equal(response.status, 404);
  });
  test(`${method} rejects an invalid note ID`, async () => {
    const response = await handler(request(method, method === "PATCH" ? { content: "Note" } : undefined), context("bad"));
    assert.equal(response.status, 400); assert.equal(calls.length, 0);
  });
}

test("GET rejects an invalid task filter", async () => {
  assert.equal((await collection.GET(request("GET", undefined, "?task_id=bad"))).status, 400);
  assert.equal(calls.length, 0);
});

for (const [name, action] of [
  ["list", () => collection.GET(request("GET"))],
  ["create", () => collection.POST(request("POST", { content: "Note" }))],
  ["retrieve", () => detail.GET(request("GET"), context())],
  ["update", () => detail.PATCH(request("PATCH", { content: "Note" }), context())],
  ["delete", () => detail.DELETE(request("DELETE"), context())],
] as const) {
  test(`${name} logs database failure and returns a safe 500`, async () => {
    errorCode = "42501";
    const response = await action();
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes("private"), false);
    assert.ok(logs.length > 0);
    assert.equal(JSON.stringify(logs).includes("private contents"), false);
  });
  test(`${name} handles unexpected exceptions safely`, async () => {
    mock.method(supabase, "from", () => { throw new Error("Unexpected internal failure"); });
    const response = await action();
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes("internal failure"), false);
    assert.ok(logs.length > 0);
  });
}

for (const task_id of [null, taskId]) {
  test(`editing and deleting ${task_id === null ? "general" : "task"} notes preserves independent copies`, async () => {
    const copy = { ...note, id: "00000000-0000-4000-8000-000000000003", task_id: null, source_task_title: "Source task" };
    rows = [{ ...note, task_id }, copy];
    const response = await detail.PATCH(request("PATCH", { content: "Edited independently", add_to_clipboard: false }), context());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).task_id, task_id);
    assert.deepEqual(rows[1], copy);
    assert.equal((await detail.DELETE(request("DELETE"), context())).status, 204);
    assert.deepEqual(rows, [copy]);
  });
}
