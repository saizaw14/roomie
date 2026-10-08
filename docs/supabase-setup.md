# Supabase setup for Roomie

The milestone 2 integration is implemented, but no hosted project has been created or connected. Follow this guide when you are ready to use a development Supabase project. The app remains usable as a welcome/sample preview without configuration; account submissions are disabled.

## 1. Create a development project and apply the migration

Create a Supabase development project using your own account. Keep the database password and CLI credentials out of the mobile app and source control.

From `/Users/sai/roomie`, initialize the Supabase CLI configuration once and link the development project:

```sh
npx supabase@latest init
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_DEVELOPMENT_PROJECT_REF
npx supabase@latest db push --dry-run
npx supabase@latest db push
```

These commands are instructions for a later setup step; they were not run during implementation. Review the target project and migration list before applying. Keep the CLI-generated `supabase/config.toml` with the repository. The existing migration file stays in `supabase/migrations/20261008000100_profiles.sql`; do not create the table manually in the dashboard or replace the migration file.

The migration creates private Auth-linked profiles, inserts profiles on signup, backfills existing accounts, validates names, and stamps update times on the server. Authenticated users can read and change only their own display name; timestamps, identities, avatars, and deletion are not client-editable. The Auth/profile foreign key restricts user deletion to avoid silent identity loss. Account deletion is not implemented and will need an explicit retention policy before financial records are added. Display metadata never grants permissions.

Reference: [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

## 2. Add public app configuration

Copy `.env.example` to `.env.local`. Add the project URL and its **publishable** key from the project Connect dialog / API keys settings:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

The URL and publishable key are deliberately public and are bundled into the app. The integration accepts only `sb_publishable_*` keys. The previous placeholder `EXPO_PUBLIC_SUPABASE_ANON_KEY` is retired. Never use `sb_secret_*`, a `service_role` key, database password, or personal access token in an `EXPO_PUBLIC_*` variable. RLS and the authenticated session enforce private access. `.env.local` is ignored by Git.

Restart Metro after changing the configuration. The app will enable submissions once both values validate; a failed backend request still shows an error and never creates a demo session.

Reference: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## 3. Configure Auth and email redirects

Enable email/password authentication and email confirmation in the development project's Auth settings. Set the server password minimum to at least eight characters to match Roomie's form validation; stronger server policies remain authoritative.

For a predictable web test port, run:

```sh
npx expo start --web --localhost --port 8085
```

Set the Auth Site URL to `http://localhost:8085` for development. Add these redirect URLs:

```text
http://localhost:8085/auth/callback
http://localhost:8085/auth/callback?mode=recovery
roomie://auth/callback
roomie://auth/callback?mode=recovery
```

If your web origin or port differs, allow its two equivalent callbacks. Prefer exact URLs. Keep the built-in confirmation and recovery email templates using `{{ .ConfirmationURL }}`. The app supplies the correct redirect URL for signup and recovery. Custom token-hash or implicit access-token email links are not supported by this implementation.

Email links use **PKCE**. Open the link in the same app/device or browser profile that requested it, so the stored verifier is available. Expired, reused, malformed, or cross-device links fail safely; request a new email. The callback exchanges the short-lived code for a session and routes recovery links to the new-password screen. The new-password route requires a signed-in session, so refreshing it after a verified callback remains usable.

Native callbacks use the existing `roomie` scheme in `app.json`. Test those with a development/standalone build that registers the scheme. Expo Go has its own development URL behavior and is not the acceptance target for email links. No native folders were generated or edited in this milestone. Native build setup can be prepared in a later task.

Supabase's default email service has testing restrictions and rate limits. Verify delivery to your allowed test addresses before diagnosing the app; configure SMTP before testing with real roommates.

References: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [password authentication](https://supabase.com/docs/guides/auth/passwords), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

## 4. Verify the connected user journey

1. Register a test account with a name, email, password, and matching confirmation. With confirmation enabled, Roomie stays signed out and asks you to check email.
2. Open the confirmation link on the same device/browser. Verify Home shows your account and profile, without invented household balances.
3. Edit the profile name, save, and return Home. Reload / restart the app and confirm the saved profile and session restore.
4. Log out. Open `/home`, `/profile`, or `/reset-password` directly; verify protected content stays inaccessible. Signing in with an incorrect password must fail.
5. Request password recovery. Open the new email link on the same device/browser, save a new password, then log out and verify the new password works.
6. Use a second test account. Confirm profile data cannot be read or changed across users via the public Data API.
7. Test failed connections, disabled browser storage, expired/reused email links, app background/foreground refresh, and native keyboard/safe-area behavior.

Authentication state is provided by Supabase; native session data uses chunked Expo SecureStore, and the web preview uses browser local storage. Browser storage errors are surfaced rather than silently claiming persistence. On startup, a saved session is checked with the Auth server before protected navigation opens; offline startup can require retry. Logout affects this device's Supabase session and clears private query caches. Existing demo-session keys are ignored, never upgraded into real sessions.

## Local checks without a live project

Use Node 22.18+ (Node 24 is used in this workspace):

```sh
npm test
npm run lint
npm run typecheck
```

Tests use the real Supabase SDK with isolated HTTP responses, plus an in-memory PostgreSQL engine (PGlite) with a minimal Auth fixture. They check auth failures, confirmation/recovery callbacks, session restoration/logout, unchanged passwords, secure-storage rollback/corruption, and actual profile RLS/privileges. PGlite is development-only and is never imported by the app. These checks do not replace hosted Auth/email tests or native device testing.
