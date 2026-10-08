import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/lib/auth-context';
import { requireSupabase } from '@/lib/supabase';
import { completeAuthCallback } from './callback';
import { authErrorMessage } from './error-message';
import { AuthScreen, authStyles } from './components/auth-screen';
export function CallbackScreen() {
  const { code, mode, error: linkError } = useLocalSearchParams<{ code?: string; mode?: string; error?: string }>();
  const { configured, beginRecovery } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // One exchange per mounted callback, including React's development effect replay.
  const request = useRef<{ key: string; promise: ReturnType<typeof completeAuthCallback> } | null>(null);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    const key = JSON.stringify([code, mode, linkError]);
    if (request.current?.key !== key) {
      request.current = { key, promise: completeAuthCallback(requireSupabase(), { code, mode, error: linkError }) };
    }
    void request.current.promise.then(result => {
      if (!active) return;
      if (result.recovering) beginRecovery();
      router.replace(result.recovering ? '/reset-password' : '/home');
    }).catch(failure => { if (active) setError(authErrorMessage(failure)); });
    return () => { active = false; };
  }, [beginRecovery, code, configured, linkError, mode]);
  if (configured && !error) return <LoadingScreen label="Verifying your email link…" />;
  return <AuthScreen title="Let’s try that again." eyebrow="EMAIL VERIFICATION">
    <Card><Text accessibilityRole="alert" style={authStyles.error}>{error ?? 'Account setup must be completed before this link can be verified.'}</Text>
      <Text style={authStyles.body}>Email links need to be opened on the same device and browser where you requested them.</Text>
      <Link href="/forgot-password" asChild><Button label="Request a new reset link" /></Link>
      <Link href="/login" asChild><Button label="Back to sign in" variant="secondary" /></Link>
    </Card>
  </AuthScreen>;
}
