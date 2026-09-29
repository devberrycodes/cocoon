import type { SupabaseClient, Session } from '@supabase/supabase-js';

/** Deduplicate initialization; getSession reuses persisted tokens and refreshes them. */
export function sessionInitializer(client: SupabaseClient) {
  let pending: Promise<Session> | null = null;
  return (): Promise<Session> => {
    if (pending) return pending;
    const initialize = async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error('Could not restore your session. Please retry.');
      if (data.session) return data.session;
      const signed = await client.auth.signInAnonymously();
      if (signed.error || !signed.data.session) throw new Error('Could not start your private workspace. Please retry.');
      return signed.data.session;
    };
    const work: Promise<Session> = (async () => {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        return await navigator.locks.request('cocoon-anonymous-session', initialize);
      }
      return await initialize();
    })();
    pending = work.finally(() => { pending = null; });
    return pending;
  };
}
