import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { configurationIssue, supabase, requireSupabase } from './supabase';
import { setRememberSession } from './session-storage';
import { createAuthApi } from '@/features/auth/auth-api';
import { authCallbackUrl } from '@/features/auth/redirect-url';
import type { LoginValues, SignupValues, RecoveryValues, PasswordUpdateValues } from '@/features/auth/schemas';

type AuthContextValue = {
  session: Session | null; ready: boolean; issue: string | null; configured: boolean;
  recovering: boolean; finishRecovery: () => void; beginRecovery: () => void;
  signIn: (input: LoginValues, remember?: boolean) => Promise<void>;
  signUp: (input: SignupValues) => Promise<{ needsConfirmation: boolean }>;
  requestRecovery: (input: RecoveryValues) => Promise<void>;
  updatePassword: (input: PasswordUpdateValues) => Promise<void>;
  signOut: () => Promise<void>; retryRestore: () => void;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreIssue, setRestoreIssue] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const queryClient = useQueryClient();
  const userId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    let changes = 0;
    const applySession = (next: Session | null) => {
      if (!active) return;
      const id = next?.user.id ?? null;
      if (userId.current !== id) queryClient.clear();
      userId.current = id;
      setSession(next);
    };
    const subscription = supabase?.auth.onAuthStateChange((event, next) => {
      // Keep this synchronous: awaiting Supabase methods inside this callback can deadlock.
      if (event === 'INITIAL_SESSION') return;
      changes++;
      applySession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    }).data.subscription;
    async function restore() {
      try {
        if (supabase) {
          const revision = changes;
          const restored = await createAuthApi(supabase, authCallbackUrl).restoreSession();
          // A sign-out or a newer auth event supersedes an older restore request.
          if (changes === revision) applySession(restored);
        }
        if (active) setRestoreIssue(null);
      } catch {
        if (active) { applySession(null); setRestoreIssue('Your saved session could not be restored. Check your connection and try again.'); }
      } finally { if (active) setReady(true); }
    }
    void restore();
    return () => { active = false; subscription?.unsubscribe(); };
  }, [attempt, queryClient]);
  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    const client = supabase;
    const refresh = (state: string | null | undefined) => {
      if (state === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', refresh);
    return () => { subscription.remove(); client.auth.stopAutoRefresh(); };
  }, []);
  const signIn = useCallback(async (input: LoginValues, remember = true) => {
    await setRememberSession(remember);
    await createAuthApi(requireSupabase(), authCallbackUrl).signIn(input);
    setRestoreIssue(null); setRecovering(false);
  }, []);
  const signUp = useCallback(async (input: SignupValues) => {
    await setRememberSession(true);
    const result = await createAuthApi(requireSupabase(), authCallbackUrl).signUp(input);
    setRestoreIssue(null); return { needsConfirmation: result.needsConfirmation };
  }, []);
  const requestRecovery = useCallback(async (input: RecoveryValues) => {
    await createAuthApi(requireSupabase(), authCallbackUrl).requestRecovery(input);
  }, []);
  const updatePassword = useCallback(async (input: PasswordUpdateValues) => {
    await createAuthApi(requireSupabase(), authCallbackUrl).updatePassword(input);
    setRecovering(false);
  }, []);
  const signOut = useCallback(async () => {
    await createAuthApi(requireSupabase(), authCallbackUrl).signOut();
    queryClient.clear(); setSession(null); setRecovering(false); setRestoreIssue(null);
  }, [queryClient]);
  const finishRecovery = useCallback(() => setRecovering(false), []);
  const beginRecovery = useCallback(() => setRecovering(true), []);
  const retryRestore = useCallback(() => { setReady(false); setAttempt(value => value + 1); }, []);
  const value = useMemo(() => ({ session, ready, issue: restoreIssue ?? configurationIssue,
    configured: !!supabase, recovering, finishRecovery, beginRecovery, signIn, signUp,
    requestRecovery, updatePassword, signOut, retryRestore }), [session, ready, restoreIssue,
    recovering, finishRecovery, beginRecovery, signIn, signUp, requestRecovery, updatePassword, signOut, retryRestore]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
