# Household currency selection

New households can choose a currency from the searchable Create household sheet. Existing households and their historical expenses remain MYR. Every member sees that household's chosen currency. A household's currency is immutable after creation; to use a different currency, create a separate household. No exchange rates, conversion, mixed-currency totals, or personal display-currency override is implemented.

The bundled catalog contains 165 current ISO 4217 currency/funds codes with defined numeric minor units, from SIX Group's List One retrieved 2026-10-15:
https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml

Codes whose minor unit is `N.A.` (including metals/testing/no-currency codes) are excluded. Crypto is outside the app scope. Search uses English names and ISO codes. Display uses the code for unambiguous amounts, preserving RM for MYR. Zero-, two-, three-, and four-digit minor units are handled using integer arithmetic; percentage allocations always use two-decimal basis points independently of currency. The per-expense limit stays 1,000,000,000 minor units, so its major-unit equivalent differs by currency. Catalog changes require updating both the bundled data and database catalog together.

## Deploy

After the profiles, households, and expenses migrations, run the entire `docs/supabase-dashboard-currencies.sql` once in Supabase SQL Editor. It applies `supabase/migrations/20261015000100_household_currencies.sql` and records its exact source in CLI migration history in the same transaction. Expect version `20261015000100`, name `household_currencies`. With working CLI connectivity, use the normal dry-run/push workflow instead; do not run both methods or rerun a successful migration. Hosted deployment has not been performed by the implementation task.

The migration replaces the MYR-only constraints with catalog foreign keys, extends household creation with a defaulted currency argument, and derives new expense currency from its household on the server. Currency mismatch/household reassignment and later household currency changes are rejected by triggers. Client currencies are not trusted as an authority. Existing financial data is not rescaled or relabeled.

Checks cover matching catalog precision, existing MYR retention, JPY/USD/KWD/CLF creation and expense propagation, currency immutability, invalid-code rejection, direct catalog-write denial, exact fallback history, and parsing/formatting precision. UI/device verification remains pending. Test creating a new household, currency search/selection, equal/exact/percentage expenses, edits, history, and switching between households using different currencies after applying the migration.
