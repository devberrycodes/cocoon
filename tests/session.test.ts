import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { sessionInitializer } from '../lib/client/session.ts';

test('existing persisted session is reused across new initializers without creating a user', async () => {
  const session = { access_token: 'token', user: { id: 'a' } } as Session;
  let signIns = 0;
  const client = { auth: {
    getSession: async () => ({ data: { session }, error: null }),
    signInAnonymously: async () => { signIns++; throw new Error('Must not sign in'); },
  } } as unknown as SupabaseClient;
  assert.equal(await sessionInitializer(client)(), session);
  assert.equal(await sessionInitializer(client)(), session);
  assert.equal(signIns, 0);
});

test('concurrent initialization creates one user; subsequent visits reuse persisted session', async () => {
  let session: Session | null = null;
  let signIns = 0;
  const client = { auth: {
    getSession: async () => ({ data: { session }, error: null }),
    signInAnonymously: async () => { signIns++; session = { access_token: 'token', user: { id: 'a' } } as Session; return { data: { session }, error: null }; },
  } } as unknown as SupabaseClient;
  const initialize = sessionInitializer(client);
  const sessions = await Promise.all([initialize(), initialize(), initialize()]);
  assert.equal(signIns, 1);
  assert.equal(sessions[0], sessions[2]);
  await sessionInitializer(client)();
  assert.equal(signIns, 1);
});

test('restoration failure does not silently create a replacement identity', async () => {
  const client = { auth: {
    getSession: async () => ({ data: { session: null }, error: new Error('offline') }),
    signInAnonymously: async () => { throw new Error('unexpected sign-in'); },
  } } as unknown as SupabaseClient;
  await assert.rejects(sessionInitializer(client)(), /restore your session/);
});

test('Supabase SDK restores an anonymous session from persisted storage', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const session = { access_token: 'saved-token', refresh_token: 'saved-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: { id: 'a', is_anonymous: true } };
  storage.setItem('test-session', JSON.stringify(session));
  const client = createClient('https://example.supabase.co', 'public-test-key', {
    auth: { persistSession: true, storageKey: 'test-session', storage, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async () => { throw new Error('Reload must not create another user'); } },
  });
  const restored = await sessionInitializer(client)();
  assert.equal(restored.user.id, 'a');
  assert.equal(restored.access_token, 'saved-token');
});
