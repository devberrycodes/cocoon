import { authContext } from './auth-server.ts';

/** Server database access is always bound to the verified request, never shared. */
export const supabase = {
  from(table: string) { return authContext().client.from(table); },
  rpc(name: string, args: Record<string, unknown>) { return authContext().client.rpc(name, args); },
};
