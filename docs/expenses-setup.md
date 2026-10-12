# Milestone 4: expenses, splits, and history

## Deploy

Apply after profiles (`20261008000100`) and households (`20261009000100`). The source of truth is `supabase/migrations/20261012000100_expenses.sql`.

With working CLI connectivity, run `npx supabase@2.120.0 db push --dry-run`, then `npx supabase@2.120.0 db push`. For this project's previous external database connection failures, paste the **entire** `docs/supabase-dashboard-expenses.sql` into a new Supabase SQL Editor query and run it once. It applies the same source and records migration history in one transaction. Expect version `20261012000100`, name `expenses`, and `expenses_created = true`. Do not run both deployment methods or rerun a successful migration. Share any error before retrying.

The hosted migration has not been applied by this implementation. No live user expenses were created. Changes are local and have not been committed or pushed by the agent.

## Flow and design

Run `npm run web`, sign in, then Home → View expenses / Add expense. The list follows the supplied Figma Make source ZIP (`Expenses`, `ExpenseSheet`, `DetailSheet`, and their CSS): Inter typography, 430px mobile canvas, category chips, period/status filters, spending summary, date sections, category icons, revision badges, and rounded cards. The form follows details → split → review → saved. It supports title, amount, category, date, payer, selected participants, and notes. Details show shares and expandable revision history; creators and owners can edit or explicitly confirm a void with a reason.

Source prototype controls were converted into real state and requests. Member/category selectors use accessible wrapping choices, and dates use validated `YYYY-MM-DD` input across platforms. Sheets are represented by protected Expo Router screens with the source handle/header and scrollable body. Existing Home/Profile styles are preserved; Home adds an expense entry point. Bills and balance screens remain later milestones, so the navigation does not expose dead Bills controls or sample balances.

## Money and permissions

- One payer in the UI; multiple payers supported by the database. The editor refuses multi-payer records rather than silently replacing payments.
- MYR integer sen, positive expense amounts up to RM10,000,000.00. PostgreSQL BIGINT reads are checked at the TypeScript boundary. Dates span 2000–2100. At most 50 payers/participants.
- Equal rounding uses membership UUID ascending order. Percentage values are integer basis points totaling 10000; integer floor amounts receive remaining sen by descending fractional remainder, then UUID ascending. Exact shares must total the amount. Zero shares are valid.
- The server recomputes allocations and enforces payment/share totals. Composite foreign keys keep member references in the correct household. Deferred constraints check complete transaction totals. All listed payers and participants must be active when an expense is saved.
- Active members read household financial data. Only the creator or owner edits/voids. Clients have no direct financial/audit writes and cannot invoke private write/audit helpers. There is no delete or unvoid action.
- Creation uses a stable, non-secret request key scoped to household and creator, serialized with an advisory transaction lock. Repeating the same request returns the same expense; changing details under a previously used key is rejected. On an uncertain network failure, retry unchanged details or refresh the list to find the saved record before starting another expense. Keys are duplicate protection, never authorization.
- Edits use row locks and expected versions. A stale version fails; refresh before trying again. Voids support identical retries and preserve payer/share rows. Every creation/edit/void produces a complete snapshot and server-controlled activity event atomically.
- Departed member references remain. Editing uses current active participants and retains previous allocation snapshots. Departure itself remains outside the app's public operations.
- Reads paginate rather than silently truncating history/totals, and bracket allocations with version checks to avoid mixing concurrent revisions. The list reads the whole household history for V1; large histories need server-filtered pagination/aggregates before scaling. Performance targets are not yet measured.

## Verification

Tests use PGlite with Supabase role/auth fixtures. They cover money/date bounds, deterministic rounding, tiny amounts, exact/percentage rejection, zero-sum posted totals, multiple payers, deferred constraints, cross-household reads/writes, creator/owner authorization, duplicate creation, conflicting edits, void retries, retained history, and exact-source dashboard migration/history. PGlite uses one database connection: simultaneous requests test version/idempotency behavior, not hosted multi-connection lock contention.

Lint, typecheck, and iOS/Android/web exports are required before completion. Browser/device visual and hosted end-to-end checks remain pending because computer-use permissions are unavailable and the hosted migration has not been applied. Successful exports are not evidence of visual equivalence or successful hosted requests.

After deployment, with two confirmed accounts in one household and an outsider:

1. Post RM100 among three members; expect 3334/3333/3333 sen in stable membership order. Post RM0.01 among three; zero shares are allowed.
2. Post exact RM40/RM30/RM30 and percentage 40/30/30. Invalid totals must block review and also fail if sent directly to the RPC.
3. Retry an unchanged creation and confirm one expense, one revision, and one activity event.
4. Edit as creator and owner; verify earlier title/amount/shares remain visible. Reject an unrelated member's edit and stale simultaneous edits.
5. Void with a reason, retry, confirm one void revision, exclusion from posted spending, and retained shares/history.
6. Check category/date/status filtering, empty/error/loading states, household/account switches, 320px/430px layouts, large text, keyboard, and native scroll/tap behavior.
7. Test duplicate creates and concurrent edits through two independent hosted connections; confirm outsiders cannot read any financial/audit table.

Balances/settlement suggestions are milestone 5. No mutable balance table is created here.
