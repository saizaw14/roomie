export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  if (code === 'invalid_credentials') return 'The email or password is incorrect.';
  if (code === 'email_not_confirmed') return 'Confirm your email before signing in. Check your inbox for the confirmation link.';
  if (code === 'email_address_not_authorized') return 'Confirmation emails are currently limited to the project’s approved test addresses. Use an approved address or ask the project owner to configure email delivery.';
  if (code === 'email_address_invalid') return 'Use a real email address that can receive the confirmation email.';
  if (code === 'signup_disabled' || code === 'email_provider_disabled') return 'Email signup is currently unavailable. Ask the project owner to enable it.';
  if (code === 'unexpected_failure') return 'The account service could not complete this request. Ask the project owner to check the Supabase Auth logs, then try again.';
  if (code === 'over_email_send_rate_limit') return 'The confirmation or recovery email limit has been reached. Wait for the email limit to reset before requesting another email.';
  if (code === 'over_request_rate_limit') return 'Too many account requests. Please wait a few minutes and try again.';
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found' || code === 'pkce_code_verifier_not_found') return 'This link has expired or has already been used. Request a new email and open it on this device.';
  if (code === 'same_password') return 'Choose a different password from your current one.';
  if (code === 'weak_password') return 'Choose a stronger password that meets the account password policy.';
  const details = typeof error === 'object' && error !== null ? error as {name?:unknown;message?:unknown;status?:unknown} : {};
  const message = typeof details.message === 'string' ? details.message : '';
  if (code === 'captcha_failed') return 'Sign-in requires a CAPTCHA check. Ask the project owner to finish the CAPTCHA integration before retrying.';
  if (code === 'request_timeout' || details.name === 'AbortError' || details.name === 'TimeoutError') return 'The account request timed out. Check your connection and try again.';
  if (details.name === 'SecurityError' || details.name === 'QuotaExceededError') return 'This browser could not save your session. Allow site storage or try signing in with “Keep me signed in” unchecked.';
  if (/invalid api key|no api key found/i.test(message)) return 'The app’s Supabase key is invalid or outdated. Check the project configuration and restart Roomie.';
  if (/invalid login credentials/i.test(message)) return 'The email or password is incorrect.';
  if (typeof details.status === 'number' && details.status === 429) return 'Too many account requests. Please wait a few minutes and try again.';
  if (error instanceof Error && /fetch|network/i.test(error.message)) return 'Could not connect. Check your connection and try again.';
  // Show only bounded service identifiers, never raw errors, request bodies or credentials.
  const reference = typeof code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code
    : details.name === 'AuthUnknownError' ? 'auth_unknown_error' : 'client_error';
  const status = typeof details.status === 'number' && Number.isInteger(details.status) && details.status >= 100 && details.status <= 599 ? ` / HTTP ${details.status}` : '';
  return `We couldn’t complete sign-in or the account request. Please try again. Reference: ${reference}${status}.`;
}
