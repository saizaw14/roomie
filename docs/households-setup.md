# Milestone 3: households and invitations

Implemented on `feature/households-and-invites`. Authentication and profile setup are prerequisites. Live confirmation email testing is still pending because the built-in Supabase sender reached its quota. No auth policies are disabled for this milestone.

## Apply the database migration

The source of truth is `supabase/migrations/20261009000100_households.sql`. Apply it after the existing profiles migration. It creates `households`, `household_members`, and `household_invites`, private authorization helpers, read policies, and five authenticated RPCs. Clients have no direct write grants on these three tables. Profiles become readable by active peers; edits remain self-only.

With working CLI database connectivity:

```sh
npx supabase@2.120.0 db push --dry-run
npx supabase@2.120.0 db push
```

For this project's currently unreliable external PostgreSQL route, use `docs/supabase-dashboard-households.sql` in the Supabase SQL Editor. Copy the entire file and run it once. This exact-source fallback records version `20261009000100` and name `households` in the CLI history in the same transaction as the schema changes. The final result should show `households_created = true`. Do not run both deployment methods for the same version or manually create individual tables. If anything fails, the transaction rolls back; share the error before retrying. If the migration is changed before deployment, regenerate the fallback to keep its body and history in sync.

No milestone 3 schema changes have been applied to the hosted project by the implementation task. A missing migration produces a setup error in the app, not sample household data.

## User flows

- Home → Create household: validated name (1–80 trimmed characters), currency MYR, creator becomes owner atomically.
- Home or Me → Your households: lists active households and switches the selected home. Selection is scoped to the current signed-in account and retained in memory for the running app session; restart defaults to the first household.
- Home → Members and settings: active members see household names/roles/status; only owners see invitation tokens and editable settings.
- Owner creates an invitation: 1–50 joins, 1–30 days, default 5 joins / 7 days. Codes are 32 hexadecimal characters from a server-generated UUID. Owners can copy the link on web, share on native, or select the text manually. Invitations can be revoked.
- Join household: paste the full code or a web/native link. No unauthenticated preview exposes the household or members. Explicitly tap Join after signing in. The pending invitation is retained in memory during login navigation; reopen the original link after a reload, email confirmation, or device change.
- Web invitations use the current origin `/join?code=...`; localhost links only work on devices able to reach that server. Native links use `roomie://join?code=...`, requiring a development/standalone build registering the app scheme. The code can always be pasted manually.
- Expiration, revocation, maximum uses, user identity, and duplicate membership checks run on the server. Redemption takes a row lock on the invitation. Concurrent requests through different invitations are reconciled by the unique household/user constraint. An existing active member can retry without consuming another use, even when their previous successful request used the final slot.

## Membership lifecycle decision

Leaving, removal, transfer, and reactivation have **no app actions or public RPCs yet**. This prevents debts or ownership from being silently discarded before the financial milestones exist. The conservative policy for their future implementation is:

1. An owner must atomically transfer ownership to another active member before leaving. A household must always retain exactly one active owner.
2. Departure/removal is blocked while the member has a nonzero balance or pending settlement involving them. Add this server-side check after balances/settlements are implemented, rather than assuming there is no debt.
3. Departed memberships are marked `left` with a timestamp, never deleted. Membership IDs and financial references remain stable. Active-member access ends immediately.
4. Rejoining requires an owner-approved reactivation of the original membership ID. Invitation redemption currently rejects `left` memberships instead of creating a second identity or automatically reactivating them.
5. Household deletion/archive and access to historical statements require a later retention policy. No direct deletion is granted now.

The current owner index prevents multiple owners. Creation is the only operation that creates an owner; clients cannot remove or demote that owner.

## Verification

Local SQL tests use PGlite with a minimal Supabase Auth fixture. They exercise RLS, grants, peer profile privacy, owner permissions, atomic creation, single-use limits, expiration/revocation, retry behavior, direct-write denial, currency constraints, and ended memberships. Simultaneously submitted requests are serialized by PGlite's one database connection; this is not evidence of hosted multi-connection contention.

Before calling the live milestone verified, use two confirmed test accounts to:

1. Create two households; switch between them and restart the app.
2. Generate a one-use invitation and join as the second account. Retry and confirm there is one membership and one consumed use.
3. Confirm the member cannot see invitation codes or rename the household, and an unrelated account cannot read household data or profiles.
4. Test expired/revoked invitations; submit the final-use invitation from two separate authenticated connections concurrently.
5. Open links while signed out, sign in, continue the invitation, and explicitly redeem it.
6. Verify native share/deep linking, keyboard/safe-area behavior, network failures, and account switching.

Financial totals are intentionally absent until expense/balance migrations exist. No fake zero balances are shown.
