import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Database } from '@/types/database';
import { readPublicConfig } from './public-config';
import { sessionStorage } from './session-storage';

const result = readPublicConfig(process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const configurationIssue = result.issue;
export const supabase = result.config ? createClient<Database>(result.config.url, result.config.publishableKey, {
  auth: {
    storage: sessionStorage, storageKey: `roomie-${new URL(result.config.url).hostname}-auth`,
    autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce',
    ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
  },
}) : null;
export function requireSupabase() {
  if (!supabase) throw new Error(configurationIssue ?? 'Account setup is unavailable.');
  return supabase;
}
