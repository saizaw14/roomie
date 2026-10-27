import type { SupabaseClient } from '@supabase/supabase-js';
import { loginSchema, signupSchema, recoverySchema, passwordUpdateSchema,
  type LoginValues, type SignupValues, type RecoveryValues, type PasswordUpdateValues } from './schemas.ts';

/** Supabase is the only authority that can create a session. Passwords are never trimmed. */
export function createAuthApi(client: SupabaseClient, callbackUrl: () => string) {
  return {
    async restoreSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) return null;
      const verified = await client.auth.getUser();
      if (verified.error) throw verified.error;
      if (!verified.data.user || verified.data.user.id !== data.session.user.id) {
        throw new Error('The saved session could not be verified.');
      }
      return { ...data.session, user: verified.data.user };
    },
    async signIn(input: LoginValues) {
      const { email, password } = loginSchema.parse(input);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error('Sign-in did not return a session. Please try again.');
      return data.session;
    },
    async signUp(input: SignupValues) {
      const { email, password, name } = signupSchema.parse(input);
      const { data, error } = await client.auth.signUp({ email, password,
        options: { data: { display_name: name }, emailRedirectTo: callbackUrl() } });
      if (error) throw error;
      return { session: data.session, needsConfirmation: !data.session };
    },
    async requestRecovery(input: RecoveryValues) {
      const { email } = recoverySchema.parse(input);
      const { error } = await client.auth.resetPasswordForEmail(email,
        { redirectTo: `${callbackUrl()}?mode=recovery` });
      if (error) throw error;
    },
    async updatePassword(input: PasswordUpdateValues) {
      const { password, currentPassword } = passwordUpdateSchema.parse(input);
      const { error } = await client.auth.updateUser({ password, ...(currentPassword === undefined ? {} : { current_password: currentPassword }) });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
  };
}
