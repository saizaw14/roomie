# Roomie implementation progress

## 2026-10-08 — Milestone 1

Initial inspection: unmodified Expo starter Home/Explore routes, SDK 57 (~57.0.27), React Native 0.86.3, React 19.2.3; npm lockfile and installed dependencies. No Git repository, native ios/android folders, Supabase configuration, authentication, feature implementation, approved Figma design, or verified device session was found.

Implemented:
- Preserved Expo versions/configuration and src/app Router root.
- Roomie welcome screen with exact product tagline, responsive scrolling/safe areas, sage/cream theme, and working local sample toggle.
- Sample scenario: Alex paid 40000 sen for four people and is owed 30000 sen. Display-only fictional data; upcoming Wi-Fi bill is explicitly unposted. No authoritative financial logic is implemented.
- Shared tokens and typed Button (loading/disabled/variants), Input (label/hint/error), Card components. Input is prepared for milestone 2; no fake signup form is presented.
- Feature folder scaffolding and shared lib/types/utils folders, each with purpose documentation.
- Replaced starter tab layout with a stack. Old /explore URL redirects home. Unmounted starter helper components/assets remain preserved.
- Removed reset-project from package scripts to avoid accidentally replacing Roomie source; original script remains unused.
- Expo-generated ESLint configuration and compatible dev dependencies. Updated retained web color-scheme hook to avoid effect-driven hydration state.
- Full original product brief stored in product-specification.md.

Verification:
- npx expo lint: passed after fixing starter hydration hook.
- npx tsc --noEmit: passed.
- Expo export: iOS and Android bundles plus static web routes exported successfully to /private/tmp/roomie-milestone1-export; this does not establish native runtime behavior.
- Web preview: welcome screen renders; sample opens and closes; browser reported no captured warning/error logs. At 390px viewport width, document width is 390px (no horizontal overflow).
- Native device/simulator rendering, font scaling, screen-reader interaction, and measured performance remain unverified. No backend is present.
- npm installation reported 29 audit vulnerabilities (11 moderate, 18 high) across the dependency tree. No forced dependency upgrades were made; investigate separately before beta.

Next: milestone 2 — Supabase public configuration boundary, Auth, profile, forms/validation, session persistence, and protected navigation. Add functional Welcome Get Started/Sign In actions when those destinations exist. Do not begin household financial operations before migrations, RPC invariants, and RLS in later milestones.

The full eight-milestone sequence and financial/security requirements are in product-specification.md. No live Supabase setup, deployment, publishing, Git initialization, commit, or push was performed.

## 2026-10-08 — Milestone 2 integration

Inspection found a local demo auth scaffold added since milestone 1: credentials were accepted without Supabase, a demo user was persisted, and Home showed placeholder household/balance/repayment data. That scaffold was not a completed authentication milestone. It has been replaced while keeping the Roomie design and welcome actions.

The user confirmed there is no Supabase project and requested the integration plus setup guide. No hosted project was created, connected, configured, migrated, deployed, or published.

Implemented:
- Typed Supabase client accepting public URL and sb_publishable_* key only; missing/invalid configuration fails closed. .env.example and ignored .env.local boundary. Legacy anon-key placeholder removed.
- Real email/password signup, sign-in, confirmation-required state, logout on this device, reset email, PKCE callback exchange, and new-password form. No fake auth fallback. Password whitespace is preserved.
- React Hook Form + Zod validation, loading/disabled states, useful errors, and keyboard-aware mobile form layout. Submit buttons are disabled without configuration.
- Session restoration checked against the Auth server; native persistence through chunked SecureStore with manifest-last writes; browser local storage for web. Auth subscriptions and foreground/background refresh are cleaned up. Old demo sessions are ignored.
- Stack.Protected navigation for Home/Profile and authenticated password updates. Recovery callbacks direct the user to update their password. Welcome, account forms, recovery request, and callbacks have real destinations.
- Versioned profile migration with Auth-linked identity, signup trigger, existing-user backfill, name validation, server timestamps, self-only RLS, limited column grants, and revoked direct helper-function invocation. Restrictive Auth deletion preserves identity until a retention policy is designed.
- Profile fetch/create/edit using TanStack Query, retry states, scoped query keys, and cache clearing on user changes/logout. No Zustand needed.
- Removed fictional finances from the signed-in Home; it now explains the forthcoming household milestone.
- Setup and acceptance guide at docs/supabase-setup.md. No native directories were created or edited.

Verification:
- npm test: 24 passing checks, including 8 PostgreSQL migration/authorization checks plus their parent test.
- npx expo lint: passed.
- npx tsc --noEmit: passed after Expo generated updated route types.
- iOS, Android, and static web export: passed. Exports are bundle checks, not native runtime evidence.
- Browser: welcome to signup/login/recovery routes work; invalid email displays validation; submissions disabled without setup; direct /home access while signed out redirects to welcome. At 390px width there is no horizontal overflow; direct /profile and /reset-password access redirects to welcome. The callback route shows a useful setup state without configuration. No browser warning/error logs were captured.

Remaining verification:
- Hosted Supabase Auth, real email delivery, confirmation/password-recovery links, native secure-storage behavior, background refresh, and live profile editing need a development project and native device/build. Tests use isolated HTTP responses and a minimal Auth schema fixture in PostgreSQL; they do not emulate the full hosted service.
- Startup verification requires network connectivity; failure shows retry/sign-in recovery rather than opening private screens.
- npm install reported the existing 29 audit findings (11 moderate, 18 high); no forced upgrades. Node test runner emits a harmless module-format detection warning; the existing CommonJS tool config is preserved.
- The workspace still has no Git repository; no commit/push has been performed.

Next product milestone: 3 — households, memberships, owner invitations, atomic redemption, RLS/RPC authorization, multi-household selection, and member flows. First connect and verify milestone 2 using the setup guide. Define ownership transfer/departure/rejoining/outstanding-debt behavior before removal features. Financial features remain milestones 4–7 per product-specification.md.
