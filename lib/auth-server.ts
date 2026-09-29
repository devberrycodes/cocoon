import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const scope = new AsyncLocalStorage<{ userId: string; client: SupabaseClient }>();
export function authContext() {
  const context = scope.getStore();
  if (!context) throw new Error('Authenticated request required.');
  return context;
}
export function withAuth<Args extends unknown[]>(handler: (request: Request, ...args: Args) => Promise<Response>) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return Response.json({ error: 'Authentication required.' }, { status: 401 });
    try {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(), {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return Response.json({ error: 'Invalid or expired session.' }, { status: 401 });
      const response = await scope.run({ userId: data.user.id, client }, () => handler(request, ...args));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    } catch {
      return Response.json({ error: 'Unable to process authenticated request.' }, { status: 500 });
    }
  };
}
