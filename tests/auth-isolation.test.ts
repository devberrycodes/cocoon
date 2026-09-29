import assert from 'node:assert/strict';
import { test, mock, afterEach } from 'node:test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://cocoon-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';
const tasks = await import('../app/api/tasks/route.ts');
const task = await import('../app/api/tasks/[id]/route.ts');
const notes = await import('../app/api/notes/route.ts');
const note = await import('../app/api/notes/[id]/route.ts');
const A = '10000000-0000-4000-8000-000000000001';
const B = '10000000-0000-4000-8000-000000000002';
const ID = '20000000-0000-4000-8000-000000000001';
const context = { params: Promise.resolve({ id: ID }) };
const request = (method: string, user = A, body?: object) => new Request('http://localhost/api/tasks', {
  method, headers: { Authorization: `Bearer ${user}`, 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
afterEach(() => mock.restoreAll());

for (const [name, collection, detail, input] of [
  ['task', tasks, task, { title: 'Private task' }],
  ['note', notes, note, { content: 'Private note' }],
] as const) {
  test(`${name}: owner create/read/list; other user cannot read/update/delete; ownership injection ignored`, async () => {
    let stored: Record<string, unknown> | null = null;
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      const user = req.headers.get('Authorization')!.replace('Bearer ', '');
      if (url.pathname === '/auth/v1/user') return Response.json({ id: user, aud: 'authenticated', role: 'authenticated' });
      if (req.method === 'POST') {
        const body = await req.json();
        assert.equal(body.user_id, user);
        stored = { ...body, id: ID, color: 'cream', created_at: '2026-09-29', updated_at: '2026-09-29' };
        return Response.json(stored, { status: 201 });
      }
      // Explicit scope is checked independently of the mock's owner visibility.
      assert.equal(url.searchParams.get('user_id'), `eq.${user}`);
      const visible = stored && stored.user_id === user ? stored : null;
      if (req.method === 'DELETE' && visible) stored = null;
      if (req.method === 'PATCH' && visible) Object.assign(visible, await req.json());
      return Response.json(url.searchParams.has('id') ? visible : visible ? [visible] : []);
    });
    const created = await collection.POST(request('POST', A, { ...input, user_id: B }));
    assert.equal(created.status, 201);
    assert.equal((await created.json()).user_id, A);
    assert.equal((await detail.GET(request('GET'), context)).status, 200);
    assert.equal((await (await collection.GET(request('GET'))).json()).length, 1);
    assert.deepEqual(await (await collection.GET(request('GET', B))).json(), []);
    assert.equal((await detail.GET(request('GET', B), context)).status, 404);
    assert.equal((await detail.PATCH(request('PATCH', B, input), context)).status, 404);
    assert.equal((await detail.DELETE(request('DELETE', B), context)).status, 404);
    assert.equal((await detail.PATCH(request('PATCH', A, input), context)).status, 200);
    assert.equal((await detail.DELETE(request('DELETE', A), context)).status, 204);
  });
}

test('missing and forged sessions cannot reach database queries', async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    calls++;
    assert.match(new Request(input, init).url, /\/auth\/v1\/user$/);
    return Response.json({ message: 'Invalid token' }, { status: 401 });
  });
  assert.equal((await tasks.GET(new Request('http://localhost/api/tasks'))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await notes.GET(request('GET', 'forged'))).status, 401);
  assert.equal(calls, 1);
});

test('a note cannot be linked to a task owned by another user', async () => {
  mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(new Request(input, init).url);
    if (url.pathname === '/auth/v1/user') return Response.json({ id: B });
    assert.equal(url.pathname, '/rest/v1/tasks');
    assert.equal(url.searchParams.get('user_id'), `eq.${B}`);
    return Response.json(null);
  });
  assert.equal((await notes.POST(request('POST', B, { content: 'Sneak in', task_id: ID }))).status, 404);
});

test('concurrent requests keep independent authenticated database contexts', async () => {
  const { withAuth, authContext } = await import('../lib/auth-server.ts');
  mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    return Response.json({ id: req.headers.get('Authorization')!.replace('Bearer ', '') });
  });
  const handler = withAuth(async () => {
    const before = authContext().userId;
    await new Promise(resolve => setTimeout(resolve, before === A ? 15 : 1));
    assert.equal(authContext().userId, before);
    return Response.json({ user: before });
  });
  const results = await Promise.all([handler(request('GET', A)), handler(request('GET', B))]);
  assert.deepEqual(await results[0].json(), { user: A });
  assert.deepEqual(await results[1].json(), { user: B });
});
