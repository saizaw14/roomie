import type { SupabaseClient } from '@supabase/supabase-js';
type Params = { code?: string | string[]; mode?: string | string[]; error?: string | string[] };
export async function completeAuthCallback(client: SupabaseClient, params: Params) {
  if (params.error) throw new Error('This email link could not be verified. Request a new email.');
  if (typeof params.code !== 'string' || !params.code || params.code.length > 4096) {
    throw new Error('This link is incomplete. Request a new confirmation or reset email.');
  }
  if (params.mode !== undefined && params.mode !== 'recovery') throw new Error('This email link is not supported.');
  const { data, error } = await client.auth.exchangeCodeForSession(params.code);
  if (error) throw error;
  if (!data.session) throw new Error('This link did not return a session. Request a new email.');
  return { session: data.session, recovering: params.mode === 'recovery' };
}
