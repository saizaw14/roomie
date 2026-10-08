export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  if (code === 'invalid_credentials') return 'The email or password is incorrect.';
  if (code === 'email_not_confirmed') return 'Confirm your email before signing in. Check your inbox for the confirmation link.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Too many requests. Please wait a few minutes and try again.';
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found' || code === 'pkce_code_verifier_not_found') return 'This link has expired or has already been used. Request a new email and open it on this device.';
  if (code === 'same_password') return 'Choose a different password from your current one.';
  if (code === 'weak_password') return 'Choose a stronger password that meets the account password policy.';
  if (error instanceof Error && /fetch|network/i.test(error.message)) return 'Could not connect. Check your connection and try again.';
  return 'We could not complete that request. Please try again. If it continues, check the Roomie setup guide.';
}
