export const TEST_USER = '10000000-0000-4000-8000-000000000001';

// Existing validation/database tests use a verified user fixture. Auth boundary
// failures and cross-user requests are tested independently in auth-isolation.test.ts.
export function authenticated<T extends object>(handlers: T): T {
  return Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [name,
    async (request = new Request('http://localhost/api/tasks'), ...args: unknown[]) => {
      const headers = new Headers(request.headers);
      headers.set('Authorization', 'Bearer test-user-a');
      const authorized = new Request(request, { headers });
      const databaseFetch = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes('/auth/v1/user')) return Response.json({ id: TEST_USER, aud: 'authenticated', role: 'authenticated' });
        return databaseFetch(input, init);
      };
      try { return await handler(authorized, ...args); }
      finally { globalThis.fetch = databaseFetch; }
    },
  ])) as T;
}
