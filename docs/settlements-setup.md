# Balances and Settle Up

This implements milestone 5 (derived balances and deterministic suggestions) and milestone 6 (repayment recording and recipient decisions). Roomie records transfers made outside the app; it does not send money or connect to a bank.

## Apply the database update

After profiles, households, expenses, and household currencies are applied, open `docs/supabase-dashboard-settlements.sql`. Paste the entire file into a new Supabase SQL Editor query and run it once. Expect version `20261019000100`, name `settlements`. Do not rerun a successful migration. The source is `supabase/migrations/20261019000100_settlements.sql`; the dashboard file also records the exact source in migration history. Alternatively, use the existing CLI migration workflow when database connectivity is available; do not apply both methods.

This work has not applied the migration to the hosted database. Home reports setup unavailable until it is applied. No live repayments were created or decided by the implementation.

## Flow

Home → Settle up opens the Figma-style bottom sheet. It shows your balance, deterministic suggested transfers, all pending payments, and the latest 100 decided payments. Only the sender records a repayment; suggestions involving other senders cannot be recorded on their behalf. Use Record another repayment for a different amount or recipient. The amount uses the selected household currency and its decimal places. Choose the actual date; future dates are rejected.

A record starts pending. The recipient sees a review card on Home and can review/confirm or reject in Settle up. Only confirm after receiving money outside Roomie. A decision is final; repeated identical confirmation/rejection is harmless, while an opposite decision is rejected. After a failed recording attempt the form locks its payload so Retry sends the same request key. Check history before recording another payment if the network result was uncertain.

Balances equal posted expense payments minus shares plus confirmed repayments sent minus confirmed repayments received. Pending/rejected payments do not affect them. A single SQL snapshot derives every household member's balance, including historical memberships; no mutable balance table exists. Suggestions are stable by member ID and preserve balances, but are not guaranteed to minimize the number of transfers. A suggestion larger than the per-record limit is prefilled up to 1,000,000,000 minor units; the remainder can be recorded separately. Existing pending records remain visible and are not deducted from suggestions. Repayment records may differ from a suggestion because they record actual transfers, rather than enforcing a proposed route.

Home and Settle Up refresh the settlement snapshot on screen focus, app foreground and every 10 seconds while focused. Expense create/edit/void and repayment decisions invalidate the derived snapshot. Household membership/RLS still scopes every request. Only active members may record or decide; past memberships and their balances/history remain retained. Departure, ownership transfer, reversal and deletion remain outside this feature.

## Verify with two accounts in the same household

1. A pays 100, split equally with B: A is owed 50, B owes 50.
2. B records 20 paid to A. It appears pending; both balances stay unchanged.
3. B and an unrelated owner/outsider cannot confirm it. A reviews and confirms: A is owed 30, B owes 30.
4. Repeating the same confirmation does not change balances again. The record cannot be rejected after confirmation.
5. Record another payment and reject it as recipient: neither balance changes.
6. Check double-tap/retry behavior, invalid amount/date, household switching, and refreshed dashboards in two independent sessions.

Local PGlite tests exercise SQL authorization, pending/rejected effects, exactly-once decisions/audit events, currency inheritance, idempotency mismatches, cross-household requests, retained departed members and the dashboard SQL fallback. Domain tests check deterministic suggestions, input immutability, zero-sum effects and invalid balances. PGlite uses a single connection; hosted simultaneous-connection lock behavior and mobile/browser visual acceptance remain pending.
