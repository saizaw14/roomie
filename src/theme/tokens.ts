import { palette } from './palette';
export const colors = {
 background: palette.background, surface: palette.surface, ink: palette.ink, muted: palette.muted,
 primary: palette.primary, soft: palette.primarySoft, border: palette.border, accent: palette.accent,
 error: palette.error, white: palette.surface,
} as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { input: 12, card: 24, pill: 999 } as const;
export const typography = { caption: 12, body: 16, heading: 24, hero: 42 } as const;
