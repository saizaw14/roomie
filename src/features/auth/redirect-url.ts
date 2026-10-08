import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
export function authCallbackUrl() {
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : Linking.createURL('auth/callback', { scheme: 'roomie' });
}
