import { Pressable as NativePressable, type PressableProps } from 'react-native';
import type { ComponentProps } from 'react';
import { pressFeedback } from '@/lib/press-feedback';

/** Shared tap feedback, including Link asChild navigation. Preserve native refs and press behavior. */
export function Pressable({ onPress, disabled, ...props }: ComponentProps<typeof NativePressable>) {
  const handlePress: NonNullable<PressableProps['onPress']> = event => {
    if (disabled) return;
    if (onPress) pressFeedback();
    onPress?.(event);
  };
  return <NativePressable {...props} disabled={disabled} onPress={onPress ? handlePress : undefined}/>;
}
