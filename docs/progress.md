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

## Personal payment QR upload (2026-10-20)

Added Me → My payment QR, using the existing Figma profile menu and bottom-sheet language. The supplied source has no QR-specific frame, so this extends its components: image selection, uncropped preview, explicit save, replacement/discard, and confirmed removal. Files persist in a private account-owned Supabase Storage bucket with short-lived preview URLs. PNG/JPEG up to 5 MB only; no QR decoding, household sharing or money movement. Installed SDK-compatible Expo ImagePicker and base64-js; disabled camera/microphone permissions in its config plugin.

Migration: `20261020000100_payment_qr.sql`; SQL Editor fallback: `docs/supabase-dashboard-payment-qr.sql`; setup/acceptance: `docs/payment-qr-setup.md`. The hosted migration and live uploads remain pending. Lint and TypeScript passed; all 68 tests passed, including byte-format/size validation and storage ownership/path policy tests against a PostgreSQL Storage fixture. Browser/device visual and native picker verification remain pending.

## Published QR design update (2026-10-20)

The user re-shared the published Figma site, which now includes a QR-specific screen absent from the earlier ZIP. Inspected its latest published JS/CSS and updated the profile QR menu/icon, sheet subtitle, compact avatar/name/provider/status row, centered 240px maximum preview and placeholder, outlined upload control, blue information banner, and Remove/Save action proportions. Reused the published source's QR/upload icon geometry. Kept real persistence, validation, cancellation and confirmed deletion. The banner accurately describes existing account-private access; prototype household sharing is not implemented by this visual change. No SQL changes. Lint/typecheck and both QR policy/validation tests passed; platform export verified. Device visual comparison remains pending.

## QR repayments and receipts (2026-10-21)

Added the published Figma Pay online flow to Settle Up: real recipient QR image, payee/amount card, gallery save or browser download, external-bank instructions, receipt picker/preview, required receipt submission, and pending confirmation result. The recipient's payment details show submitted evidence. No prototype QR, fake bank verification, or automatic balance effect is used. Existing manual repayments remain available.

Migration `20261021000100_qr_repayments.sql` and dashboard fallback `docs/supabase-dashboard-qr-repayments.sql` add scoped debtor/creditor QR viewing, private sender/recipient receipt storage, immutable evidence linkage, and an idempotent receipt-recording RPC. Existing recipient-only terminal decisions are unchanged. Receipts are capped at 5 MB PNG/JPEG; RLS denies other household members and outsiders. A storage-row foreign key prevents deleting linked evidence. QR access requires active shared membership and negative/positive net balances respectively. Signed preview URLs expire after five minutes.

Installed Expo-compatible FileSystem and MediaLibrary for saving QR images, with photo-only/write permission requests. Setup and acceptance: `docs/qr-repayments-setup.md`. Lint and typecheck passed; all 69 tests passed, including the new SQL fallback, QR eligibility, receipt isolation/immutability, retry protection, pending/no-effect and confirmed/zero-sum cases. Hosted migration, gallery/picker hardware testing, two independent sessions, visual comparison, and real Storage API concurrency remain pending. No live images or repayments were uploaded or decided by the agent.

## Settle Up web rendering fix (2026-10-21)

The shared QR-save helper imported Expo MediaLibrary at module scope. Its native class exports can extend an undefined web module class during development server rendering, before the Platform.OS branch runs. Split the helper into browser-only `save-qr.web.ts` and native `save-qr.ts`, preserving downloads and gallery saving without loading native media classes on web. Verified the actual local `/settlements?household=…` development-server request returns HTTP 200 HTML without the reported class error; the isolated port-8092 server was stopped. Lint, typecheck and iOS/Android/web export passed. Signed-in browser interaction and physical gallery saving remain unverified. No SQL changes.

## Settle Up published-design alignment (2026-10-21)

Compared the current published Figma JS/CSS (same latest asset revision) against Settle Up. Replaced the combined suggestions list with personal You owe/You’re owed sections; matched wallet net-summary dimensions, signed amount, small breakdown, emphasized compact Pay online action, and secondary history/manual-entry links. Home pending-review links open history directly. QR payment now follows the receipt image/overlaid removal affordance, required-state styling, upload icon tile, payment instructions, recipient-upload badge, and success icon/banner layout. Sample amounts and unverified bank-verification claims remain excluded. Financial permissions, receipt evidence and server transitions are unchanged. A fresh native-browser attempt returned “Computer Use permissions are not granted”; exact rendered visual equivalence remains unverified.

## Receipt submission notifications — 2026-10-22

Added transactionally generated, recipient-only in-app receipt notifications with retry deduplication, backfill of pending receipts, read state, foreground polling, Home/Expenses bell badges, Profile inbox entry, and direct repayment review links. New migration and SQL Editor fallback: `20261022000100_receipt_notifications` / `docs/supabase-dashboard-receipt-notifications.sql`. Setup: `docs/receipt-notifications-setup.md`. Requires applying the new migration in hosted Supabase; phone push delivery is outside this implementation. Extended database tests cover recipient visibility, unauthorized reads/read updates, exactly-once retries, and fallback parity.

## Notification sheet design — 2026-10-22

Aligned the receipt inbox with the published Figma Make notification sheet: compact divided rows, 40px amber wallet tiles, payment titles and waiting status, small dates, dynamic attention subtitle, outlined full-width “Mark all as read,” and the coral unread bell dot. Uses real receipt/household data and existing local icons/fonts. Mark-all uses the existing authorized read RPC in bounded batches, refreshes partial failures, and leaves receipts arriving after the snapshot unread. No additional SQL changes. Figma Make screenshot API is unsupported and Computer Use permission was unavailable, so rendered visual comparison remains unverified.

## Home payment review reminder — 2026-10-22

Replaced the generic review card and large action button with the published Figma Home pending-payment reminder: pale amber background/border, 40px clock tile, compact title and sender/amount subtitle, and trailing chevron. The entire card opens repayment review; one pending payment opens its details directly, multiple payments open history. Counts and amounts use the selected household’s pending incoming payments. No SQL changes. Rendered visual comparison remains unavailable because Computer Use permission is not granted.

## Bills dashboard and recurring bills — 2026-10-23

Implemented the published Figma Bills layout with household header, “Recurring bills / Stay ahead,” blue reminder banner, needs-attention/upcoming/paused cards, owner Add bill, calendar-based dates, fixed/variable amounts, and review/post sheets. The Bills tab is linked from Home, Expenses, and Me; Home Coming up now reads real active reminders. Reused local icons, fonts, shared sheets, safe areas, and currency formatting. No sample bill records or new dependencies.

Added `20261023000100_recurring_bills.sql` and matching SQL Editor fallback `docs/supabase-dashboard-bills.sql`: owner-only template creation/pause/resume, active-member review/post, retained participant references, RLS, date-only weekly/monthly schedules with original-day month-end clamping, and exactly-once occurrence links to normal transactional expenses. Reminders have no balance effect; only explicit posting creates allocations and revisions. Equal template splits in this version. One outstanding occurrence per template advances after posting, preserving missed periods. No scheduled push delivery, template editing, or skip action. Setup and verification: `docs/bills-setup.md`.

Lint and TypeScript checks pass; all 70 tests pass, including real database authorization, no reminder financial effect, currency inheritance, duplicate/changed retries, pause/resume, left-member denial, and date anchors. Web static export passes. Figma Make screenshot API is unsupported and Computer Use permission remains unavailable; native/visual/live hosted interaction verification remains outstanding. Apply the new migration before testing the hosted feature.

## Add Expense design refinement — 2026-10-24

Refined the existing three-step Add/Edit Expense flow from the published Figma Make source: transparent bottom-sheet routes, currency-prefixed amount field, paired category/date selectors with calendar picking, payer dropdown, colored member tiles with check badges, optional notes disclosure, segmented split methods, compact split inputs, actual allocation/remaining summaries, review totals/shares, and posted success state. Reused local Inter fonts, existing SVG assets, common Input/Button and household sheet. Existing save RPC, exact/percentage/equal split calculations, currency precision, permissions, and audit behavior remain in place. Removed the outdated milestone-5 balance message. No migration or dependencies required.

Lint, typecheck, all 70 existing tests, and web static export pass. Reviewed React hooks, labels, selected states, route style props, and currency formatting. The Figma Make screenshot endpoint does not support this file, and Computer Use permission is still unavailable, so pixel-level visual comparison and live native interactions remain unverified.

## App-wide color refresh — 2026-10-25

Introduced a shared warm forest/sage palette with ivory backgrounds, white surfaces, green-gray readable text, and consistent amber/red/blue semantic statuses. Unified core/auth tokens and replaced scattered feature hex colors with palette references across screens, sheets, forms, notifications and navigation. Recolored existing local SVG assets and dashboard/welcome gradients without changing their geometry. Updated splash/adaptive background config and starter themed colors. Preserved external Google identity and uploaded images. No layout, database, or financial behavior changes; this does not add a full feature dark mode.

Added token-level contrast regression checks: primary white text 7.37:1, ink on ivory 10.96:1, muted text 4.90:1, placeholders 4.61:1. All 71 tests, lint and typecheck pass. Web export verified. Visual/device verification remains limited by unavailable Computer Use permission; native splash changes require a new native build. Palette guidance: `docs/color-theme.md`.

## Shared button haptics — 2026-10-25

Installed SDK-compatible `expo-haptics ~57.0.3`. Added a shared Pressable wrapper and non-blocking feedback helper: light iOS/web impact and Android Virtual_Key feedback. Migrated app press targets (buttons, navigation, selectors, calendar days, cards, reveal/close controls) to the wrapper; text-only links receive feedback directly. Link-asChild targets use their child feedback once. Disabled/loading buttons and canceled touches do not trigger tap feedback; missing hardware/browser support or rejected haptics cannot block the action. Existing refs, styles and navigation handlers are forwarded.

Lint/typecheck and all 71 tests pass; iOS, Android and web export pass. Physical vibration remains unverified without device testing. Expo Go includes the module; existing custom development/release builds need rebuilding to include it. Browser vibration depends on hardware and browser support, and system settings can suppress native haptics. No SQL changes.

## Separate profile household sheets — 2026-10-25

Profile Members and Household settings now open distinct protected bottom-sheet routes, each without the old Members/Settings switcher. Members contains active/past members and an owner-only expandable invitation manager; Settings contains household name, fixed currency and ownership details. Invitations no longer send users to settings. Preserved existing RPC permissions, busy dismissal guards, current palette, haptic controls and legacy household links. No SQL changes.

## Remove manual repayment entry — 2026-10-25

Removed Record manually from Settle Up, its form/state, and the Record a payment without QR fallback. The QR receipt submission and recipient review/confirmation flows remain available, including existing repayment history. Kept backend settlement functions because QR recording depends on them. No migration needed. Lint/typecheck pass.

## Category color identities — 2026-10-27

Added coordinated sage/amber/lavender/blue/rose category tokens, shared CategoryIcon and CategoryChoice, and consistent accents across expense filters/list/detail/category picker, bill creation/cards, and Home upcoming bills. Preserved neutral void/paused states, semantic payment statuses, labels and haptics. No SQL changes. Lint/typecheck, all 72 tests (including distinct/readable category tokens), and web export pass; physical visual comparison remains unverified.

## Account password security review — 2026-10-27

Verified the app delegates credential storage/verification to Supabase Auth over HTTPS rather than saving passwords in app tables/storage. Supabase documents salted bcrypt hashing; no custom reversible password encryption added. Added required current-password entry to Profile Change password, forwards it as Auth `current_password`, preserves recovery without that field, and clears the login password field after attempted sign-in. Hosted Require current password enforcement and password-policy settings remain to be enabled/verified by the project owner; detailed setup and limitations in `docs/account-security.md`. No SQL migration required. Added SDK/schema tests for submission and rejection behavior.

## Sign-in failure diagnostics — 2026-10-28

User reported the generic account-request error during sign-in. Read-only hosted checks returned Auth health HTTP 200 and email provider enabled, using only public configuration. No account login/password attempt was performed. Added explicit CAPTCHA, browser storage, key/configuration, timeout and rate-limit messages plus bounded code/HTTP references for otherwise hidden failures; raw server messages and credentials are not displayed. Root cause of the user's login remains unconfirmed until the new reference is captured. Lint/typecheck and all 75 tests pass, including diagnostics redaction.

## Category icon consistency — 2026-10-28

Centralized category symbols across cards, filters, selectors, bill cards and Home activity/upcoming: shopping bag for Groceries, lightning for Utilities, building for Rent, car for Transport, grid for Other. Added local 20px transport/grid SVGs matching the existing stroke style. Paused/voided categories retain their symbol with neutral coloring. Icons follow the stored category; expense titles are not used to rewrite classification. No SQL/data changes. Lint/typecheck and all 75 tests pass; web export verified.

## 2026-11-07 — Recurring bill split options

Added equal, exact, percentage and one-person-covering options to bill creation and occurrence review. The new bill_split_options migration stores template allocations, validates members and totals, and posts through the existing transactional expense engine. Bill share previews use the same rounding calculation. Existing templates and legacy retries remain compatible. Dashboard SQL fallback: `docs/supabase-dashboard-bill-splits.sql`; setup: `docs/bill-splits-setup.md`. Hosted application remains pending.

## 2026-11-08 — Expo SDK 58

Upgraded to Expo 58.0.23, React Native 0.88.1 and React 19.3.0 with SDK-compatible Expo modules, Router, Reanimated, gesture handler, worklets and React types. Updated refs to React Native instance types, nullable color-scheme/AppState handling, and awaited the now-asynchronous QR file write. Native folders remain generated rather than checked in.

Validation: Expo compatibility check passes; Expo Doctor 20/20; lint and typecheck pass; all 75 tests pass; iOS, Android and static web exports pass. Restart the development server with `npx expo start --clear`. Custom native development builds must be rebuilt for SDK 58; physical-device runtime verification remains pending.
