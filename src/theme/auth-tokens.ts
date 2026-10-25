import { palette } from './palette';
// Compatibility names for existing screens; all colors come from the shared app palette.
export const authColors = {
 primary: palette.primary, soft: palette.primarySoft, ink: palette.ink, muted: palette.muted,
 line: palette.border, inputBorder: palette.inputBorder, placeholder: palette.placeholder,
 error: palette.error, white: palette.surface, canvas: palette.canvas,
} as const;
export const authFonts = { regular: 'RoomieInter', medium: 'RoomieInterMedium', semibold: 'RoomieInterSemiBold', bold: 'RoomieInterBold', extra: 'RoomieInterExtraBold' } as const;
