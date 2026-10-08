Continue building my project, **Roomie**, using the specification below. Treat this as the product brief and implementation guidance.

Inspect the existing project before editing. Then implement the next milestone described at the end. Work through routine implementation decisions autonomously, explain changes clearly, and verify your work.

**1. Product and purpose**

Roomie is a mobile application for people living together to manage shared household expenses, recurring bills, balances, and repayments.

The intended users are university students, international students, and young professionals, typically living in households of 2–6 people.

The initial market is Malaysia. V1 uses MYR, displayed as RM.

The application should immediately answer:

- How much do I owe?
- Who owes me?
- What household bills are coming soon?

This is a real portfolio/product project intended for eventual testing with real roommates.

**2. Current project status**

The project was created on my Mac using `create-expo-app`.

The previously identified project location is `/Users/sai/roomie`. Use the actual open workspace as authoritative.

Expo Metro started successfully. Its output identified `src/app` as the Expo Router root.

VS Code was opened, and instructions were given to create feature folders and replace the starter home screen. Those edits have not been verified.

Do not assume the following are already complete:

- Starter screen replacement.
- Feature folder creation.
- Successful device testing.
- Initial Git commit.
- Dependency installation beyond the Expo starter.
- Supabase setup.
- Authentication.
- Database migrations.
- Figma designs.

Inspect the repository, package.json, routing files, Git status, and any AGENTS.md instructions before proceeding. Preserve existing work.

**3. V1 scope**

Build these features over successive milestones:

- Email registration, login, logout, password recovery, and session persistence.
- User profile creation and editing.
- Create and join households.
- Membership in multiple households and a household switcher.
- Owner-managed invitations through codes and links.
- Shared expenses with categories.
- Equal, exact-amount, and percentage splits.
- Calculated member balances.
- Settlement suggestions that reduce unnecessary transfers.
- Record repayments.
- Recipient confirmation or rejection of repayments.
- Expense detail, editing, voiding, and history.
- Fixed and variable recurring bill templates.
- Upcoming bill information and reminders within the app.
- Member management.
- Activity and financial change history.
- MYR support.

Later features include receipt attachments, push notifications, spending analytics, monthly reports, custom categories, exports, and offline expense creation.

Potential future features include receipt OCR, grocery item splitting, DuitNow QR, deposit tracking, moving-out settlement, and a shared shopping list.

Do not implement banking integration, actual money transfers, card processing, cryptocurrency, chat, landlord management, chores, an AI chatbot, receipt recognition, multi-currency, or a social feed in V1.

A recorded repayment represents money transferred outside Roomie.

**4. Chosen architecture and stack**

Use:

- React Native with Expo.
- TypeScript.
- Expo Router.
- Supabase Auth.
- Supabase PostgreSQL.
- PostgreSQL Row Level Security.
- PostgreSQL RPC functions for transactional business operations.
- Supabase Edge Functions or scheduled jobs where justified.
- React Hook Form and Zod for forms and validation.
- TanStack Query for server data.
- Zustand only when shared client state actually requires it.
- Expo-compatible test tooling; use an appropriate unit-test runner for pure domain logic.
- Maestro for later device E2E testing.
- GitHub Actions for later CI.
- EAS for later builds.

Do not introduce NestJS for V1.

Check installed Expo and React Native versions before installing dependencies. Follow current official documentation and Expo-compatible package versions. Avoid unnecessary dependencies and disruptive forced upgrades.

Keep Supabase public configuration separate from secrets. Never include a service-role key or privileged credentials in the mobile application.

**5. Code organization**

Preserve the existing `src/app` Router structure.

Keep route files focused on navigation and screen composition. Put business logic and feature-specific UI in feature folders.

Use this organization as a guide:

- `src/app/` — routes and layouts.
- `src/components/` — reusable UI.
- `src/theme/` — design tokens and shared visual styles.
- `src/features/auth/`.
- `src/features/households/`.
- `src/features/expenses/`.
- `src/features/balances/`.
- `src/features/settlements/`.
- `src/features/bills/`.
- `src/hooks/`.
- `src/lib/`.
- `src/types/`.
- `src/utils/`.
- `supabase/migrations/` — versioned database changes.
- `supabase/functions/` — server functions when needed.
- `tests/` — where appropriate for the chosen test setup.

Do not maintain duplicate Router roots under both `app` and `src/app`.

**6. Navigation and screens**

The eventual primary tabs are Home, Expenses, Bills, and Me.

Provide an obvious Add Expense action. Respect safe areas and avoid obscuring navigation or content.

Required screens:

- Welcome: Roomie, “Shared living. Simpler money.”, Get Started, and Sign In.
- Login: email, password, password recovery, and signup link.
- Signup: name, email, password, and confirmation.
- Household selector: household names and the current user’s balance in each.
- Create household: name and MYR currency.
- Join household: invitation code and invitation-link handling.
- Home: selected household, personal net balance, suggested repayments, pending confirmations, upcoming bills, and recent activity.
- Expenses: expense history, period filtering, household spending totals, and categories.
- Add/edit expense: description, amount, payer, date, category, selected participants, and split method.
- Expense detail: payer, participants’ shares, date, status, and permitted actions.
- Settle Up: repayment suggestions and payment-recording form.
- Settlement detail/history: pending, confirmed, and rejected repayments.
- Bills: recurring templates and upcoming occurrences.
- Create/edit recurring bill: fixed or variable amount, payer, participants, split, frequency, and due date.
- Members: names, roles, membership status, and permitted invitation/removal actions.
- Household settings: name, members, invitations, recurring bills, activity, and leaving the household.
- Me: profile, household navigation, and logout.

Use a clean, approachable mobile design with consistent spacing, typography, colors, rounded cards, and clear hierarchy.

Create reusable Button, Input, and Card components. Include accessibility labels, readable contrast, useful validation, and appropriate loading, empty, and error states.

Figma was discussed, but no approved design file is supplied. Do not assume a completed design exists. Use a coherent initial design system and keep it easy to revise.

**7. Money and splitting rules**

Store money as integer minor units.

Examples:

- RM24.90 = 2490 sen.
- RM100.00 = 10000 sen.

Do not use floating-point currency values as authoritative financial data.

Parse input deliberately. Reject invalid amounts, excessive decimal places, non-finite values, and values outside supported bounds. Define safe handling for PostgreSQL BIGINT values at the TypeScript boundary.

Every posted expense must satisfy:

- Total paid by all payers = expense amount.
- Total owed by all participants = expense amount.
- All payer and participant memberships belong to the same household.

The first UI supports one payer, but the database should support multiple payers.

For equal splits, distribute remaining sen deterministically.

Example: RM100 split among three people produces 3334, 3333, and 3333 sen.

For exact splits, require the selected shares to sum exactly to the expense amount.

For percentage splits, store percentages as integer basis points:

- 25% = 2500 basis points.
- 100% = 10000 basis points.

Require a total of 10000 basis points. Use integer arithmetic and deterministic remainder allocation so the resulting shares exactly match the expense total.

Do not rely only on frontend validation. Enforce financial invariants on the server.

**8. Balances and repayments**

Do not create an authoritative mutable balances table.

Derive balances from posted expenses and confirmed settlements:

Net balance = expense payments − expense shares + confirmed repayments sent − confirmed repayments received.

Positive means the member is owed money. Negative means the member owes money.

The sum of all household member balances must always equal zero.

Example: Alex pays RM400 shared equally among four members.

- Alex: +RM300.
- Each other member: −RM100.

A RM100 confirmed repayment from one debtor to Alex brings that debtor to zero and reduces Alex’s outstanding credit to RM200.

Pending and rejected settlements must not change balances.

Settlement flow:

- The payer records a repayment to another household member.
- The repayment is pending.
- The recipient confirms or rejects it.
- Confirmation changes the calculated balances exactly once.

Validate identity, household membership, positive amount, distinct sender/recipient, and allowed status transitions on the server.

Prevent duplicate effects from repeated taps, retries, or concurrent requests.

Build deterministic settlement suggestions as a pure domain function. Preserve every member’s net balance. A greedy debtor/creditor matching algorithm is acceptable for V1; do not claim it always produces the mathematically smallest number of transfers.

**9. Database design**

Use migrations committed alongside the application. Do not create undocumented tables manually in the Supabase dashboard.

The starting entities are:

- `profiles`: Auth-linked ID, display name, optional avatar, timestamps.
- `households`: name, currency, creator, timestamps.
- `household_members`: household, user, owner/member role, active/left status, joined/left timestamps; unique household/user combination.
- `household_invites`: household, unique code or token, creator, expiry, maximum uses, use count, and revocation support.
- `expenses`: household, title, category, amount_minor, currency, date, split method, draft/posted/void status, creator, timestamps, and void metadata.
- `expense_payers`: expense, member, paid_minor.
- `expense_splits`: expense, member, owed_minor, and percentage_bps where applicable.
- `settlements`: household, sender, recipient, amount_minor, currency, pending/confirmed/rejected status, creator, and decision timestamps.
- `recurring_expense_templates`: household, title, category, fixed amount or null for variable amount, weekly/monthly frequency, payer, split configuration, next due date, active status, creator, and timestamps.
- `activity_events`: household, actor, event type, entity type/ID, metadata, timestamp.

Extend this schema where required for correctness, particularly recurring participants, recurring occurrences, and expense revision history. Document additions.

Historical financial records must retain valid references after members leave. Do not delete membership records needed by expenses or settlements.

Define ownership transfer, departure, rejoining, and outstanding-debt behavior before implementing membership removal. Do not silently lose debts or leave a household without an owner.

**10. Authorization and audit history**

Enable RLS on exposed tables.

Users must not access another household’s private data. Active membership is the default requirement for household access.

Enforce owner/member permissions, authorizations for expense changes, invitation management, and settlement decisions on the server.

Invitation redemption must be atomic, validate expiration/revocation/usage limits, and prevent duplicate membership creation.

Creating or changing an expense should atomically update its financial rows and audit history.

Prefer voiding to deleting financial records. Keep who changed a record, when, and what changed. Expense edits need sufficient revision history to reconstruct previous financial values.

Activity history should be server-controlled.

Review RPC permissions and security-definer functions carefully. RLS must not be bypassed through an overly permissive RPC.

Expected operations include create/join household, invite management, create/update/void expense, record/confirm/reject settlement, and household balance retrieval.

**11. Recurring bill behavior**

Support fixed bills, such as rent or Wi-Fi, and variable bills, such as electricity.

A null template amount means the amount must be entered for an occurrence.

Upcoming bills must not affect balances until an expense is explicitly posted.

For V1, prepare occurrences or reminders and let a member review/post the expense. Do not silently assume an upcoming bill has already been paid.

Prevent duplicate expenses for the same recurring occurrence. Define month-end date behavior and distinguish date-only due dates from timestamps.

**12. Verification and development milestones**

Prioritize meaningful tests for:

- Equal split rounding, including amounts smaller than the participant count.
- Invalid exact totals.
- Invalid percentage totals and percentage rounding.
- Safe money parsing.
- Zero-sum household balances.
- Pending/rejected settlements having no financial effect.
- Confirmed settlements affecting balances exactly once.
- Edited and voided expense effects.
- Retained history after membership changes.
- Cross-household access denial.
- Unauthorized settlement confirmation.
- Concurrent invitation redemption and financial requests.
- Duplicate recurring occurrence posting.

Performance goals are a usable dashboard within roughly two seconds and typical database operations within roughly 500 ms under normal conditions. Treat these as measured targets, not guarantees.

Develop in stages:

1. Project inspection, source structure, design system, and first Roomie screen.
2. Supabase configuration, authentication, profile, and protected navigation.
3. Household migrations, RLS, create/join/invitation/member flows.
4. Expense creation, splitting, editing, voiding, and history.
5. Balances and settlement suggestions.
6. Repayment recording and confirmation.
7. Recurring bills.
8. UX polish, security verification, E2E testing, and beta preparation.

**13. What to implement now**

Implement only milestone 1 in this task.

- Inspect the current project and summarize what already exists.
- Preserve the current Expo setup and `src/app` Router root.
- Establish the feature organization.
- Create shared design tokens and reusable Button, Input, and Card components.
- Replace the default starter home content with a polished initial Roomie screen.
- Use “Shared living. Simpler money.” as the product tagline.
- Clearly identify any sample data. Do not present a placeholder balance as a verified account balance.
- Avoid dead controls that imply an implemented feature.
- Remove or adapt unused starter routes/components where appropriate without breaking navigation.
- Run available lint and TypeScript checks.
- Verify rendering if a device, simulator, or suitable preview is available. Explain any verification limitations.
- Record the product specification and current progress in repository documentation for future Codex sessions.

Do not configure a live Supabase project, deploy, publish, or push to GitHub during this milestone.

At completion, explain what changed, what checks passed, any remaining problems, and the exact command I should run to view the result. Then identify the next milestone.

Proceed with the work, rather than only giving me instructions to edit the files manually.