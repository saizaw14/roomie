import { z } from 'zod';
import { categories, parseMinor, validDate } from './domain';
export const makeExpenseSchema = (currency = 'MYR') => z.object({
 title: z.string().trim().min(1,'Enter a title.').max(120), amount: z.string().refine(value => { try { parseMinor(value,false,currency); return true; } catch { return false; } }, `Enter a valid positive ${currency} amount using its supported decimal places.`),
 category: z.enum(categories), date: z.string().refine(validDate,'Use a valid date (YYYY-MM-DD), from 2000 to 2100.'), notes: z.string().max(1000), payer: z.string().uuid('Choose a payer.'),
});
export const expenseSchema = makeExpenseSchema();
export type ExpenseValues = z.infer<typeof expenseSchema>;
export function expenseError(error: unknown) {
 const code = typeof error==='object' && error!==null && 'code' in error ? String(error.code) : '';
 if (['42P01','PGRST202','PGRST205'].includes(code)) return 'Expense setup is missing. Apply the milestone 4 migration in the setup guide.';
 if (code==='40001') return 'This expense changed. Refresh its details before trying again.';
 if (code==='42501') return 'You need active household membership and permission for this action.';
 if (code==='22023') return 'Check the details, active members, and allocation totals. If this is a retry, restore the original details or start a new expense.';
 return error instanceof Error ? error.message : 'Could not complete the expense request. Check your connection and try again.';
}
