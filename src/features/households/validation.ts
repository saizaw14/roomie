import { z } from 'zod';
export const householdSchema = z.object({ name: z.string().trim().min(1, 'Enter a household name.').max(80, 'Use 80 characters or fewer.') });
export const inviteSchema = z.object({ maxUses: z.coerce.number().int().min(1).max(50), days: z.coerce.number().int().min(1).max(30) });
/** Accept an invitation code or an app/web link, without navigating to untrusted URLs. */
export function invitationCode(input: string): string {
 let code = input.trim();
 if (code.includes('://')) {
  try {
   const url = new URL(code);
   const validPath = url.protocol === 'roomie:' ? url.hostname === 'join' && (url.pathname === '' || url.pathname === '/') : ['https:', 'http:'].includes(url.protocol) && url.pathname === '/join';
   if (!validPath) throw new Error();
   code = url.searchParams.get('code') ?? '';
  } catch { throw new Error('Enter a valid Roomie invitation code or link.'); }
 }
 code = code.toUpperCase();
 if (!/^[A-F0-9]{32}$/.test(code)) throw new Error('Enter the full 32-character invitation code or paste its link.');
 return code;
}
export function householdError(error: unknown): string {
 if (error instanceof Error && !('code' in error)) {
  if (/fetch|network/i.test(error.message)) return 'Could not connect. Check your connection and try again.';
  if (/invitation code|household name|characters|valid Roomie/.test(error.message)) return error.message;
 }
 const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
 const message = typeof error === 'object' && error !== null && 'message' in error ? error.message : '';
 if (code === '22023') return message === 'Rejoining requires owner assistance' ? 'This membership has ended. Ask the household owner about rejoining.' : 'Check the name or invitation. Invitations may be expired, revoked, or fully used.';
 if (code === '42501') return 'You do not have permission for this household action. Refresh your households or sign in again.';
 if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01') return 'Household setup is not available yet. Ask the project owner to apply the household migration.';
 return 'Could not complete this household request. Please try again.';
}
