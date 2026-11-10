# Household notifications

After receipt notifications and recurring bills are installed, run the **entire** `docs/supabase-dashboard-action-notifications.sql` once in Supabase SQL Editor. Or apply `20261110000100_action_notifications.sql` through the CLI. Choose one method. Existing receipt notifications keep their read state.

The inbox includes:

| Event | Who receives it | Action |
| --- | --- | --- |
| Payment submitted | Payment recipient | Review and confirm or reject |
| Payment confirmed or rejected | Sender | View decision; check rejected payments |
| Recurring bill due or overdue | Active payer and participants | Payer reviews and posts the actual payment |
| Bill added, paused or resumed | Affected active payer/participants | Review reminder |
| Expense added, edited or cancelled | Affected active payers/participants, excluding the actor | Review details and share |
| Household renamed; member joined or left | Other active household members | Review household settings or members |

Expense edits also notify participants removed by that edit. No alerts are sent to the actor for their own changes. Invitation codes are shareable links, not invitations addressed to an account, so no recipient-specific invitation notification can be delivered before someone joins.

Opening a notification or marking it read acknowledges the update only. It does not confirm payments, post bills, or change balances. The “Action needed” label reflects a pending payment review, a rejected payment to check, or a due bill assigned to the payer. Read state is separate from completing the action. New alerts are unique per event and recipient; retries do not duplicate alerts.

These are **in-app notifications**. The foreground app polls every 10 seconds. Due reminders are created during the inbox refresh, once per bill due date; no scheduler is required. Paused or advanced occurrences disappear from the due-alert inbox. Notifications are hidden when household membership is no longer active. Phone push notifications while the app is closed are not included.

Verify with two household accounts and a third outsider: submit and decide payments; add, edit and cancel shared expenses; create and pause an overdue bill; rename the household and join another member. Verify each alert opens the correct household and record, and that outsiders cannot access or mark another person’s notifications read.
