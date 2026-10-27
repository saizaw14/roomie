# Account password security

Roomie uses Supabase Auth for password creation, verification and password changes. Supabase documents that it stores salted bcrypt hashes, not readable passwords. The `auth.users.encrypted_password` field is a historical name for a hash; do not add a password column to `public.profiles` or create a custom encryption RPC. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security).

The app sends passwords only to Supabase Auth through the SDK. Hosted configuration requires HTTPS; HTTP is allowed only for local development hosts. Passwords must remain unchanged (including spaces); client-side encryption or hashing would change the credential Supabase expects and is not a substitute for HTTPS or server hashing. Password fields are masked and no application password logging or persistent password storage was found in the reviewed auth code. JavaScript retains submitted values temporarily in memory, so this is not a memory-zeroization guarantee.

Native remembered sessions use Expo SecureStore. Web remembered sessions use localStorage, containing session tokens rather than passwords; scripts running on the same origin can access those tokens. Keep web dependencies and XSS defenses maintained. The Remember me option controls session persistence, not saving a password.

## Hosted Supabase settings to verify

These settings have NOT been changed by the agent:

1. In Auth's password/email provider settings, enable **Require current password when changing password**. The Profile password form now requires and sends `current_password` to the updateUser Auth endpoint. Server enforcement is necessary because a client form can be bypassed. Test both a wrong and correct current password. Verify email-link password recovery still succeeds under your project's settings before rollout.
2. Use a stronger minimum password length, such as 12 characters, on the server. The app currently validates a baseline of 8; Supabase can enforce a stricter policy and the app displays its weak-password rejection. Existing sign-in credentials are not silently trimmed or transformed.
3. Enable leaked-password protection if available on your plan (currently documented for Pro and above). Keep email confirmation enabled and configure reliable SMTP before production.
4. Keep Auth rate limits enabled. Consider MFA as a separate account security feature.

Secure password-change reauthentication with an emailed nonce is a separate Supabase option. Roomie does not yet implement a nonce entry flow; do not enable it without implementing and testing that flow. No service-role credentials belong in the app.

## Implemented checks

Profile Change password has masked current/new/confirmation inputs, validates current-password presence, and sends only the required Auth fields. Confirmation values never go to Auth. Sign-in clears its password form field after each attempted submission. Recovery can still submit a new password without a current-password field after its recovery session is established.

Tests use the real Supabase SDK with mocked HTTP responses to check unchanged credentials, HTTPS configuration rejection, signup metadata, current-password submission, unauthorized updates, rejection propagation and session handling. These do not verify your hosted project's actual hashing or enabled security settings. No real account passwords were read or changed.
