# QR repayments and receipts

## Deploy

Apply `docs/supabase-dashboard-qr-repayments.sql` once through Supabase SQL Editor, after the existing settlements (`20261019000100`) and profile QR storage (`20261020000100`) updates. Expect version `20261021000100`, name `qr_repayments`. Do not rerun the prior scripts if they already succeeded. The source migration is `supabase/migrations/20261021000100_qr_repayments.sql`; use either CLI or the dashboard fallback, not both. This work has not deployed the hosted migration or uploaded live payment evidence.

Expo-compatible `expo-file-system` and `expo-media-library` are installed. Both are included in Expo Go. Restart Expo after dependencies change; custom development/production binaries need a rebuild to include MediaLibrary and its save-photo permission configuration. Permissions are requested only when saving a QR; receipt selection uses the existing system image picker. No camera capture or bank integration is added.

## Flow

1. The creditor saves their payment QR from Me → Payment QR.
2. A debtor opens Home → Settle up → Pay online on a suggested repayment.
3. The screen follows the published Figma payee card, QR preview, gallery save/download, payment instructions, receipt preview and submission/result states. Real uploaded QR images replace the prototype's sample graphics; no unverified “verified” claims appear.
4. The user saves the QR, opens their bank/e-wallet independently, checks the recipient/account name, and pays outside Roomie.
5. They return and choose a PNG/JPEG receipt up to 5 MB. A receipt is required for this QR submission path. They tap Send receipt for confirmation.
6. The repayment remains pending. The recipient opens its details, reviews the receipt and confirms actual receipt of money, or rejects it. The existing recipient-only exactly-once rules apply. Receipt upload alone has no balance effect.

Settle Up uses the QR-and-receipt flow. If a QR is unavailable, retry or ask the recipient to upload their payment QR. Manual repayment entry is no longer exposed in the app. Suggestions larger than the record limit are capped at 1,000,000,000 minor units per QR submission, with the actual amount shown before payment.

## Access and retention

QR images remain in a private bucket. A creditor's saved QR is readable by an active housemate who has a negative net balance in a shared household where the QR owner has a positive net balance. It is not public and cannot be modified by other members. Eligibility is based on current household net balances, not on a particular greedy suggestion route.

Receipts use a separate private bucket, with owner-scoped upload paths and a 5 MB PNG/JPEG limit. Only the sender and the active recipient can view them. Other household members and outsiders cannot access receipt images. Submission atomically attaches an already-uploaded receipt to the pending repayment; a foreign key retains the storage row. Attached receipts cannot be overwritten/deleted via client Storage policies, and a receipt cannot be reused for another repayment. Unattached uploads can be deleted by their owner; failed uploads/submissions may leave an unattached image for administrative cleanup. No account/debt lifecycle deletion feature is added.

A retry keeps the original image path, amount, payment date, recipient and request key. It reuses an existing upload rather than replacing evidence. After an uncertain result, retry the same submission or check repayment history before recording another payment. Preview URLs expire after five minutes; access is checked when URLs are issued, so an issued URL can remain usable until expiry after a balance change. Saved downloads remain on the user's device.

## Verification

Local PostgreSQL fixture tests cover QR debtor/creditor eligibility, zero-balance/outside-household denial, cross-account writes, receipt ownership, missing receipts, immutable attached evidence, duplicate request/path handling, pending balance preservation, recipient confirmation and zero net balance after confirmation. The exact dashboard fallback is exercised. Storage HTTP, native gallery saving, picker cancellation and hosted independent-session concurrency still require acceptance testing.

Use two confirmed accounts in the same household: upload a real QR, post a 100 expense split equally, submit a 50 repayment with receipt as the debtor, verify no immediate balance change, confirm as the creditor, and verify both balances become zero. Confirm another member cannot view the receipt. Try gallery permission denial, cancelled/oversized/invalid receipt, network retries, rejected payment and account/household switching. No live payment is required to test the UI; only record/confirm actual external payments when testing financial data.
