import { palette } from './palette.ts';
/** Category identity is separate from payment status (success/warning/error). */
export const categoryColors = {
 Groceries: { foreground: palette.primary, background: palette.primarySoft },
 Utilities: { foreground: palette.warning, background: palette.warningSoft },
 Rent: { foreground: palette.lavender, background: palette.lavenderSoft },
 Transport: { foreground: palette.info, background: palette.infoSoft },
 Other: { foreground: '#8A4F63', background: '#F8EDF1' },
} as const;
export function categoryColor(category: string) {
 return Object.prototype.hasOwnProperty.call(categoryColors, category)
  ? categoryColors[category as keyof typeof categoryColors]
  : { foreground: palette.muted, background: palette.neutralSoft };
}
