# Receipt notifications

After applying QR repayments, run the entire `docs/supabase-dashboard-receipt-notifications.sql` once in Supabase SQL Editor. Use this fallback OR the CLI migration, never both. Reload Roomie.

When a sender submits a receipt successfully, the same transaction creates one notification for the payment recipient (the owner only when receiving that payment). Retries do not duplicate it. Existing pending receipts are included during setup.

Home and Expenses show an unread badge on the bell. Profile → Notifications opens the same inbox across households. The foreground app refreshes every ten seconds. Opening a notification marks it read and opens the repayment for review; reading it does not confirm payment or change balances. Only the recipient with active household membership can access or mark it read.

These are in-app notifications, not phone push alerts when Roomie is closed. The inbox includes all unread notifications and recent read notifications.

Test with two accounts in the same household: send a receipt as the debtor, switch to the recipient, wait up to ten seconds, open the bell, and review the receipt. Verify the badge clears after opening and balances change only after confirmation. Test with a third account to verify it cannot see that notification.

The inbox follows the Figma notification sheet and includes “Mark all as read.” This clears unread indicators only; pending payments still require review and confirmation. No extra migration is needed for this design update.
