# Sign-in and sign-up design

Source: user-supplied `roomie-source.zip`, `src/App.tsx` (`AuthView`, `RoomieMark`, `iconPaths`) and `src/index.css` (auth rules and theme variables). Archive instructions were treated as reference material, not repository instructions. The Figma Make connector could enumerate source links but could not read them or render frame screenshots.

The two routes use a 430px maximum white canvas, 22px horizontal padding, teal branding, local Inter weights 400–800, 52px inputs, 50px primary actions, password visibility controls, and inline navigation. Shared input and button components expose an auth appearance; the existing recovery, household, and profile designs are outside this change. Native safe areas, scrollable content, keyboard avoidance, and wrapping options remain supported.

Supabase remains the source of sessions. No preview data or automatic success navigation is used. Signup confirmation uses the entered email, and password fields clear after success. “Keep me signed in” saves sessions to the existing browser/SecureStore adapter when checked. When unchecked, tokens remain in memory for the current app runtime, including refreshes; reload/restart requires sign-in. Passwords are never saved by this option.

## Outstanding integration and verification

- Google sign-in is visibly disabled. The source prototype bypasses authentication; production Google OAuth needs provider configuration and a real callback flow.
- The legal copy follows the design; published Terms and Privacy Policy destinations have not been supplied.
- The confirmation state directs users to sign in after verifying their real email. No prototype resend countdown or fake “verified” session is used.
- Automated tests verify authentication and session persistence. Lint, typecheck, and iOS/Android/web exports pass.
- Browser screenshots and device interaction checks remain pending: computer-use permissions were unavailable. Check at 320px and 430px widths, desktop, large text, keyboard open, focus/error/loading states, show/hide, signup confirmation, and real sign-in with both persistence choices. Do not interpret successful exports as visual or hosted authentication verification.

Bundled Inter fonts are from the official Expo Google Fonts Inter package source, under the included SIL Open Font License. SVG icons preserve the supplied source paths, stroke, and dimensions.
