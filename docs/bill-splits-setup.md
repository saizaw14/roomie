# Recurring bill split options

After the recurring bills migration, run the **entire** `docs/supabase-dashboard-bill-splits.sql` once in the Supabase SQL Editor. Alternatively, apply `20261107000100_bill_split_options.sql` using the CLI. Use one method, not both. Existing recurring bills remain equal splits.

The Split option dropdown supports:

- **Split equally:** selected members share the final amount, with deterministic rounding.
- **Exact amounts:** enter each selected member’s amount in the household currency. The amounts must total the final bill amount.
- **Percentages:** enter percentages totaling 100%. The expense engine allocates minor-unit rounding consistently.
- **One person covers it:** the payer is the sole participant and covers the full amount, so this occurrence creates no shared debt.

Variable bills save default allocations. Before posting, enter the final amount and adjust exact shares if needed. Percentages automatically apply to the final amount. Review changes apply to that occurrence; they do not rewrite the template. Reminders alone never affect balances.

Test with two members: create one bill per method, review and post an occurrence, then inspect expense shares and balances. Check that submitting the same occurrence again does not create a duplicate. An owner creates templates; active members may review and post them.

Local database tests exercise all four methods, invalid totals, duplicate participants, authorization, variable exact amounts, retries and compatibility with older equal-split records. Hosted migration and device testing are still required.
