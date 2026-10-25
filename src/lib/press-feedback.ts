import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Feedback never delays an action or makes an unsupported device fail. */
export function pressFeedback(): void {
  try {
    const effect = Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void effect.catch(() => {});
  } catch {
    // Haptics are optional (unsupported browser, device settings, missing native module).
  }
}
