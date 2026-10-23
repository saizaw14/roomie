# Recurring bills

Apply profiles, households, expenses, and household currencies first. Then run the entire `docs/supabase-dashboard-bills.sql` once in Supabase SQL Editor. Alternatively apply `supabase/migrations/20261023000100_recurring_bills.sql` through the CLI; use one method, never both. The dashboard fallback records the same migration history atomically. Expected result: `20261023000100`, `recurring_bills`, `bills_created = true`.

Reload Roomie and open **Bills** from Home, Expenses, or Me. The household owner can use **Add bill** to create a fixed or variable bill, select weekly/monthly frequency, choose the first due date from the calendar, and select an active payer and participants. V1 recurring templates use equal splits; individual expenses still support other split methods. Amounts use the household currency and its decimal precision.

Needs attention includes reminders due today and earlier. Upcoming shows later reminders, and paused bills stay visible without active future reminders. No fictional bills are inserted. Home shows up to three active bills, ordered by due date.

Tap a bill to review it. Enter the final amount for variable bills, verify who paid and who participates, select the actual payment date, and explicitly post only a payment already made. Posting creates one normal expense, including its financial allocations and audit history, and links it to the occurrence. Opening a bill, creating a template, and pausing/resuming a template have no balance effect. A fixed amount is a default which can be adjusted during review.

Dates are calendar dates, not reminder timestamps. Weekly dates advance seven days. Monthly bills retain the original day and clamp to the last day of shorter months: Jan 31 → Feb 28/29 → Mar 31. One unposted occurrence per template is shown at a time; posting advances one period, so missed periods remain visible until reviewed. No automatic payments, automatic posting, or scheduled phone notifications are included.

Owners can pause/resume from the review sheet. Resuming retains the saved due date, including an overdue date. If a payer or participant leaves, choose active replacements during review; this changes that occurrence only. Template editing and skipping missed periods are not exposed in this version. Posted expenses use existing edit/void flows; voiding an expense does not make its bill occurrence postable again.

Create requests use stable request keys. Occurrence posting locks the template and records a unique `(template_id, due_date)` link in the same transaction as the expense. An identical retry returns the existing expense; different retry details are rejected. After an uncertain response, retry the same details or close and check Bills/Expenses before starting again.

## Verify with two accounts

1. As owner, create a variable monthly bill with both members. Confirm it appears in Bills and Home without changing either balance.
2. As the other active member, open it, enter the final amount, verify payer/participants, and post. Confirm one expense appears with the household currency and expected equal shares.
3. Retry the same occurrence: it must return the same expense, with no second financial effect. Check the next reminder date.
4. As owner, pause and resume; members must not be allowed to manage templates. Verify a different household/account cannot read the bills.
5. Check an empty household, missing migration, failed network request, and an overdue bill. Review that the overdue label does not imply nonpayment.

Local verification: PGlite integration tests exercise real migrations and RPCs, retries, permissions, no reminder effect, currency, left members, pause/resume, and monthly/weekly dates. Hosted Supabase, live UI interactions, and native visual rendering require separate verification after setup.
