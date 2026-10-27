# Roomie color direction

The shared palette is defined in `src/theme/palette.ts`. The existing core and auth token exports both use it, so new screens should use these tokens rather than introduce new hex values.

The direction is warm and calm: forest green actions, sage selections, warm ivory page backgrounds, white cards and dark green-gray text. It suits shared living while keeping money-related actions clear. Color choices are design decisions, not a claim that one palette is perfect for every customer.

| Role | Color | Use |
| --- | --- | --- |
| Primary | `#285F52` | Actions, active navigation, links |
| Strong primary | `#1D4A40` | Balance gradient, emphasis |
| Soft sage | `#E8F1EB` | Selected states and quiet highlights |
| Ivory | `#F7F7F2` | Main page background |
| White | `#FFFFFF` | Cards, fields, sheet headers |
| Ink | `#213D35` | Titles and primary text |
| Muted | `#5E7067` | Descriptions and labels |
| Amber | `#865B17` | Pending/overdue reminders with explicit labels |
| Red | `#AC3E3E` | Errors, rejected and destructive actions |
| Blue | `#365E7B` | Information and guidance |

The theme covers auth, welcome art, Home, Expenses and its form, Bills, profile, household sheets, repayments, QR/receipt screens, notifications, local SVG icons and illustrations. Google’s identity color and uploaded QR/receipt images are preserved. Starter shared themed components also use matching neutral/green colors. This is a light-first app theme; it does not introduce a full dark-mode treatment for all feature screens.

Measured contrast: white on primary 7.37:1, ink on ivory 10.96:1, muted on ivory 4.90:1, and placeholder text on white 4.61:1. Tests guard key text/status combinations at 4.5:1 and input boundaries against white at 3:1, following the [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). This is token-level checking, not certification of every rendered screen, opacity, image, disabled state or user setting. Labels and icons continue to communicate status alongside color.

Splash and Android adaptive background configuration now match the theme. A new native build is needed to see native splash/config changes; normal screen colors update with the app bundle. Existing launcher/splash bitmap artwork is unchanged.

## Category identities

Expense and bill categories use `src/theme/category-colors.ts`: Groceries sage, Utilities amber, Rent lavender, Transport blue, and Other muted rose. Apply the same foreground/soft background through CategoryIcon and CategoryChoice. Status badges stay independent; voided/paused icons use neutral styling. All five category foreground/background pairs pass the 4.5:1 token contrast check, with labels and selected checkmarks so color is not the sole identifier.
