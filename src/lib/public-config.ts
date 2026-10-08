export type PublicConfig = { url: string; publishableKey: string };
export function readPublicConfig(urlValue?: string, keyValue?: string):
  { config: PublicConfig | null; issue: string | null } {
  const url = urlValue?.trim() ?? '';
  const publishableKey = keyValue?.trim() ?? '';
  if (!url || !publishableKey) return { config: null, issue: 'Account setup is not available yet. You can still explore the sample household.' };
  try {
    const parsed = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) ||
      parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error();
  } catch {
    return { config: null, issue: 'Account setup needs a valid Supabase project URL.' };
  }
  // Only browser-safe publishable keys are accepted. Never load admin/service keys.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    return { config: null, issue: 'Account setup needs a Supabase publishable key.' };
  }
  return { config: { url: url.replace(/\/$/, ''), publishableKey }, issue: null };
}
