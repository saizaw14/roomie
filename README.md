# Roomie

Shared living. Simpler money.

Roomie is an Expo / React Native app for Malaysian roommates to track shared expenses, bills, balances, and repayments in MYR. The app includes the UI foundation, a fictional household preview, and account/profile flows plus household, invitation, member, and milestone 4 expense flows backed by Supabase when configured.

## Run locally

From `/Users/sai/roomie`:

```sh
npx expo start
```

Scan the QR code with a compatible Expo Go client, or press `w` for a web preview. For web only: `npx expo start --web`. Native device testing is still required.

```sh
npm run lint
npm run typecheck
npm test
```

This project uses npm / package-lock.json, Expo SDK 57, React Native 0.86, React 19, TypeScript, and Expo Router. Install future dependencies with `npx expo install <package>` after consulting matching SDK docs.

## Organization

- `src/app`: Router layouts and thin screen entry points; the only Router root.
- `src/features`: auth, households, expenses, balances, settlements, bills.
- `src/components/ui`: shared Button, Input, Card.
- `src/theme`: Roomie palette, spacing, radii, typography.
- `src/hooks`, `src/lib`, `src/types`, `src/utils`: shared code as needed.
- `docs/product-specification.md`: complete user-provided product brief.
- `docs/progress.md`: implementation status and handoff.
- `docs/supabase-setup.md`: development project, migration, public configuration, redirects, and connected verification.
- `docs/households-setup.md`: milestone 3 migration deployment, household flows, lifecycle policy, and two-account acceptance checks.
- `supabase/migrations`: versioned database changes; profiles are the first migration.
- `tests`: Node tests for auth/storage and PostgreSQL profile authorization.

Public configuration now points to the user’s Supabase project, and the profiles migration was applied through the SQL Editor. Live email confirmation testing is pending after reaching the default sender’s quota. Follow [the setup guide](docs/supabase-setup.md) to apply the profile migration and fill `.env.local` using `.env.example`. Missing configuration produces an honest setup state and disables account submissions. The implementation includes email signup/confirmation, sign-in, recovery, persistent sessions, logout, profile editing, and protected Home/Profile routes.

The welcome illustration uses clearly labeled fictional figures. No illustration values are account balances; household creation/joining/invites/member views are implemented; expense creation, equal/exact/percentage splits, editing, voiding, and revision history are implemented. Balances and repayments remain later milestones. Apply the household and expense migrations before using those flows (see [expense setup](docs/expenses-setup.md)); the signed-in Home shows your selected household or an empty household state. Node 22.18+ is required for the dependency-free test runner (Node 24 is used here).

Do not use the original starter reset script: it can replace the Roomie source. Some inactive starter helper components/assets are retained to preserve the original setup; the layout no longer mounts their tabs or animated overlay. `/explore` redirects to `/` for old links.
