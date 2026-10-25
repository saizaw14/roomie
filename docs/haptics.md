# Tap feedback

Use `Pressable` from `@/components/ui/pressable` for new tappable controls, or the shared Button which already uses it. Keep normal `disabled`/loading state. Haptics fire on a completed press with an action, so canceled scrolling gestures stay quiet. Do not also call feedback from a Link-asChild parent's handler; the child already provides it. Text-only links can use `pressFeedback` from `@/lib/press-feedback`.

Expo Haptics uses light impact on iOS, Android Virtual_Key feedback, and the browser vibration API on supported web devices. Unsupported/rejected feedback is ignored without affecting the action. Native system settings, Low Power Mode and missing vibration hardware may suppress feedback. See [Expo SDK 57 haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/).

Reload Expo Go after installing dependencies. Custom development/release builds must be rebuilt to include the native module. No database changes.

On a physical phone, check a primary action, navigation tab, calendar day, participant toggle, and sheet close: each completed press should give one subtle tap. Disabled/loading buttons and scrolling past a button should not vibrate. Confirm the action still works when system haptics are disabled.
