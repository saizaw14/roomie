# Profile payment QR images

Open Me → My payment QR. Choose a PNG or JPEG image (up to 5 MB), review the full uncropped preview, and tap Save QR code. Choose another image to replace it, or use Remove QR code and confirm removal. Closing before saving discards the selection. Images are not decoded or verified as a particular bank/payment QR format.

## Supabase setup

Run the entire `docs/supabase-dashboard-payment-qr.sql` once in the Supabase SQL Editor. Expect migration `20261020000100`, name `payment_qr`. Alternatively apply `supabase/migrations/20261020000100_payment_qr.sql` through the CLI; do not apply both. The hosted migration has not been run by the agent.

The migration creates a private `payment-qr` bucket restricted to PNG/JPEG, 5 MB. The only permitted object path is `<auth-user-id>/payment-qr`. The base migration lets users read, upload, replace and delete only their own image. The QR-repayment migration described in `docs/qr-repayments-setup.md` additionally permits active housemates with a negative net balance to view a creditor’s saved QR. No profile URLs, account data, balances, settlement records or household permissions change. QR repayments add scoped housemate viewing; Roomie never initiates payments. Preview URLs expire after five minutes and refresh while the panel is open. There are no public image URLs.

`expo-image-picker` was installed using Expo's SDK-compatible installer and is included in Expo Go. Restart Expo after installing the dependencies. New custom development/production builds must include the added native module/config plugin. The plugin disables camera and microphone permissions because this feature only selects images; full library/camera access is not requested by the app. Native uploads use decoded ArrayBuffer image data, as recommended by Supabase. Web uses the selected File's bytes. Input format and byte count are validated before upload; the bucket enforces MIME/size limits as well.

## Acceptance checks

After deploying the migration, upload a QR on web and Expo Go, save, close/reopen, and sign out/in to verify persistence. Test PNG/JPEG, an oversized image, picker cancellation, replacement, discard, removal/cancellation, expired preview refresh, network failure and missing bucket setup. Sign in as a second account and confirm the first account's QR is unavailable unless the QR-repayment eligibility rules apply. Check the final saved image can be scanned using the user's payment app before relying on it.

Local tests validate file signatures/size and RLS using a PostgreSQL Storage-schema fixture, including cross-account read/write/delete, invalid object paths, owner operations, private bucket limits and exact fallback migration history. These do not replace hosted Storage API or physical-device picker testing. Live uploads/deletions and visual device testing have not been performed by the agent.
