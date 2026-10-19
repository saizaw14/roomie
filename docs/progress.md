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

## 2026-10-09 — Milestone 3 implementation

Implemented household creation/selection, owner settings, invitation creation/revocation, code/link joining, and member views. Protected routes remain under Expo Router; public `/join` retains an invitation during login without auto-redemption. TanStack Query keys include the account and household. Database writes run only through authenticated, narrowly scoped RPCs; RLS restricts household/member reads to active members and invite-token reads to owners. Active peers can read profiles but cannot edit one another.

Migration: `20261009000100_households.sql`. SQL Editor fallback: `docs/supabase-dashboard-households.sql`, including atomic migration-history recording for the existing network connectivity issue. Hosted deployment and multi-account/mobile acceptance are pending. Full flow and lifecycle decisions: `docs/households-setup.md`.

Membership leaving/removal/transfer/reactivation are deferred until debt-aware safeguards exist; no direct membership writes or deletions are exposed. Ended memberships retain their IDs and lose access. Rejoining cannot silently create a second membership.

The earlier no-Git status is historical: the repository is now connected to `saizaw14/roomie`, and this work is on `feature/households-and-invites`. The profiles migration was applied by the user through the SQL Editor with its history entry. Live email confirmation remains pending; the default sender hit its email limit.

Milestone 3 validation: 35 tests passed; Expo lint and TypeScript passed; iOS/Android/web export passed to `/private/tmp/roomie-milestone3-final-export`. The SQL Editor fallback was applied in isolated PostgreSQL and its stored migration body compared against the source. Browser verification was attempted but the in-app browser is unavailable in this session, so visual/mobile runtime and hosted multi-account/concurrency verification remain pending. The isolated preview used port 8087 and is stopped after checks.

## Milestone 4 — implemented locally (2026-10-12)

Expense list, three-step create/edit flow, equal/exact/percentage splitting, expense details, versioned revisions, and explicit voiding now use Supabase RPCs. Design follows the user-supplied Figma Make source ZIP. Added protected expense routes and Home entry point. Financial rows use bounded integer sen, RLS, membership-scoped composite foreign keys, deferred totals checks, request-key duplicate protection, expected versions, and atomic snapshots/activity events. See `docs/expenses-setup.md` for migration deployment and live acceptance checks. Hosted deployment and visual/device verification remain pending; no commit or push performed.

## Welcome reference update

The signed-out welcome screen now follows the attached mobile reference: mint gradient illustration, floating payment/bill cards, teal balance card, white copy area, local Inter typography, and signup/login actions. Illustration amounts are labeled as sample figures. Native safe areas and scrollable small-screen layouts are retained.

The welcome screen now uses a fixed, non-scrolling safe-area layout. Artwork shrinks with available height and is omitted on short viewports; copy spacing compacts and both account actions stay in the layout. Landscape-sized viewports omit the descriptive paragraph.

## Home dashboard design (2026-10-13)

Home now follows the published Figma Make dashboard with a household header, gradient expense-balance card, upcoming-bills availability state, real expense activity, four-item navigation, and floating Add Expense. Expense-only balances derive from posted payer/share rows and exclude voids; unimplemented bill/repayment/notification controls explain availability without sample financial records. Activity refreshes after create/edit/void. See `docs/home-dashboard.md` for data boundaries and pending device verification.

## Personal profile dashboard (2026-10-15)

Replaced the old profile form page with the Figma Make Me dashboard: avatar/name/email, household role badge, Household and Account menu cards, permissions note, logout, and four-item bottom navigation. Uses the supplied Figma source layout and icon paths with existing Inter fonts and design tokens. Profile editing, password changes, members, expense activity, and logout confirmation open in mobile bottom sheets. Names, membership roles, activity and email come from the signed-in account; profile and password updates use the existing validated Supabase flows. Notifications and bills show availability messages; avatar uploads remain deferred. Existing household settings/invitation routes are retained. No migration or dependency changes.

Visual/device acceptance remains pending because computer-use permissions are unavailable. Check Me in Expo Go, keyboard behavior in both edit forms, save/retry states, members/activity, and logout cancellation/confirmation.

Validation: Expo lint and TypeScript passed; all 56 tests passed; iOS, Android, and web export passed to `/private/tmp/roomie-profile-export`. React component review covered unconditional hooks, query/account scoping, loading/retry states, button labels, modal dismissal, and preservation of form validation. No live account changes were made during verification.
## Household bottom sheets (2026-10-15)

Replaced the legacy household selector, create, and join screens with the Figma-style transparent modal sheet flow. Existing entry points now share the same rounded sheet and in-sheet navigation. Real household selection, Supabase mutations, invite intent, and validation are preserved. No new database migration or dependency is required; native visual verification remains pending.

## Currency selection and Join icon (2026-10-15)

Added the plus icon to the switch sheet's Join household action and a searchable ISO currency selector to household creation. Database catalog migration and client parsing/formatting now support 165 ISO codes with defined minor-unit precision. Expenses and dashboard/history amounts follow the immutable household currency; existing households stay MYR. No conversion or mixed-currency totals. Apply `docs/supabase-dashboard-currencies.sql` after expenses; see `docs/currencies.md`. Hosted migration and device checks are pending.

## Members and settings redesign (2026-10-16)

Replaced the old household detail page with the existing Figma-style bottom-sheet shell. Members use compact colored initial avatars, real active-member counts, owner badges, and an Invite a member action. Settings provide the household name editor, fixed currency name/code, invitation limits, real invitation codes/links, copy/share, expiry/use status, and revocation. Membership history and deferred departure/transfer safeguards remain visible without simulated controls. Home and Me now share this route; Me’s Settings menu opens the settings section directly. Owner-only controls retain the existing server authorization and validation. No migration or dependency changes.

Reference: Figma Make source ZIP supplied by the user, members/settings branches and corresponding CSS. The Figma connector returns source links but does not support Make screenshots. Browser visual checks were attempted; Computer Use permissions are not granted. Live invitation creation/sharing/revocation was not performed during this UI task.

Validation: Expo lint and TypeScript passed, all 58 tests passed. React review checked unconditional hooks, role/query scoping, error/retry states, form labels, and disabling sheet dismissal and section switching while mutations are pending.

## Expense dashboard design (2026-10-18)

Updated the expense dashboard using the supplied Figma Make Expenses source: shared household header, period spending summary, horizontal category chips, date-grouped expense cards with colored category icons, payer/participant and personal-share labels, posted/revised/void states, floating Add expense action, and four-item navigation. Reused existing local icons, Inter fonts, query hooks, currency formatting, expense routes, and household sheet. Period/status filters now use a draft bottom sheet with Apply/cancel behavior, validated custom dates, and a three-calendar-month option. Voids remain excluded from spending totals. No sample expenses, database changes, or dependencies added. Bills and notifications show availability messages.

Validation: lint, typecheck, and all 58 tests passed. Device/browser visual acceptance and live financial writes remain unverified; previous Computer Use attempts were blocked by missing permissions. Existing create/edit/detail designs are outside this dashboard change.

## Calendar date ranges (2026-10-18)

Replaced typed custom filter dates with From/To date buttons and a shared inline calendar for web, iOS, and Android. Month navigation, selected endpoints and range highlighting use the existing design tokens. Choosing From advances to To; earlier To days are disabled, and moving From beyond the existing end clears that end. Apply still requires a complete valid range; cancelling the filter sheet discards its draft. Dates remain local calendar strings with the existing 2000–2100 bounds. No native dependency or migration added. Device visual checks remain pending.

## New-account dashboard states (2026-10-19)

Added a shared first-use view for Home and Expenses when the signed-in account has no household: welcome message, Create/Join actions, and setup steps. Headers explicitly show no household yet. Expenses now has household loading/error/retry cards, and distinguishes a household with no expenses from filters with no matching results. The first-expense state routes to Home; Add expense remains exclusive to Home. No sample balances or migration changes. Lint and typecheck passed; live new-account/device reproduction remains pending.

## Shared expense refresh (2026-10-19)

Found a cross-client refresh gap: expense mutations invalidated only the creator's query cache, leaving another member's already-open dashboard unchanged. Expense collections and activity now refresh on route focus, on app/browser foreground, and every 10 seconds while their route is focused and the app is active. Requests join existing in-flight reads rather than cancelling them; timers and focus subscriptions are removed on blur/unmount. Account/household query keys, RLS, consistent expense reads, and balance arithmetic remain intact. No migration or realtime publication setup required. Existing balance tests include the payer's credit, another member's debt, edits, and zero-sum totals. Live two-account verification is still pending.
