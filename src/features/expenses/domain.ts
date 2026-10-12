export const MAX_MINOR = 1_000_000_000;
export const categories = ['Groceries', 'Utilities', 'Rent', 'Transport', 'Other'] as const;
export type SplitMethod = 'equal' | 'exact' | 'percentage';
export type Allocation = { member_id: string; value?: number };
export function parseMinor(input: string, allowZero = false): number {
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(input.trim())) throw new Error('Enter an amount with at most two decimal places.');
  const [whole, fraction = ''] = input.trim().split('.');
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(value) || value > MAX_MINOR || value < (allowZero ? 0 : 1)) throw new Error('Amount must be between RM0.01 and RM10,000,000.00.');
  return value;
}
export function parseBps(input: string): number {
  const value = parseMinor(input, true);
  if (value > 10000) throw new Error('Enter a percentage between 0 and 100.');
  return value;
}
export function safeMinor(value: number | string): number {
  if (typeof value === 'string' && !/^\d+$/.test(value)) throw new Error('Invalid server amount.');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0 || result > MAX_MINOR) throw new Error('Server amount exceeds supported bounds.');
  return result;
}
export function decimal(value: number): string { return `${Math.trunc(value / 100)}.${String(value % 100).padStart(2, '0')}`; }
export function money(value: number): string { return `RM${decimal(value)}`; }
export function splitExpense(amount: number, method: SplitMethod, participants: Allocation[]) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_MINOR || participants.length < 1 || participants.length > 50 || new Set(participants.map(p => p.member_id.toLowerCase())).size !== participants.length) throw new Error('Select unique participants and a valid amount.');
  if (!['equal','exact','percentage'].includes(method)) throw new Error('Invalid split method.');
  const sorted = [...participants].sort((a,b) => a.member_id.toLowerCase().localeCompare(b.member_id.toLowerCase()));
  if (method !== 'equal' && sorted.some(p => !Number.isSafeInteger(p.value) || p.value! < 0 || p.value! > (method === 'percentage' ? 10000 : amount))) throw new Error('Invalid allocation.');
  if (method === 'exact') {
    if (sorted.reduce((s,p) => s+p.value!,0) !== amount) throw new Error('Exact shares must equal the expense amount.');
    return sorted.map(p => ({ member_id: p.member_id, owed_minor: p.value!, percentage_bps: null }));
  }
  if (method === 'percentage' && sorted.reduce((s,p) => s+p.value!,0) !== 10000) throw new Error('Percentages must total exactly 100.00%.');
  const rows = sorted.map(p => ({ member_id: p.member_id, owed_minor: method === 'equal' ? Math.floor(amount/sorted.length) : Math.floor(amount*p.value!/10000), percentage_bps: method === 'percentage' ? p.value! : null, remainder: method === 'equal' ? 0 : amount*p.value!%10000 }));
  const remaining = amount - rows.reduce((s,p) => s+p.owed_minor,0);
  const ranked = [...rows].sort((a,b) => b.remainder-a.remainder || a.member_id.toLowerCase().localeCompare(b.member_id.toLowerCase()));
  for (let i=0;i<remaining;i++) ranked[i].owed_minor++;
  return rows.map(({ remainder: _, ...row }) => row);
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31') return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

export const isExpenseId = (value:string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
