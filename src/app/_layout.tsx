import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { InviteIntentProvider } from '@/features/households/invite-intent';
import { colors } from '@/theme/tokens';
function Navigation() {
  const { ready, session, recovering } = useAuth();
  if (!ready) return <LoadingScreen />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="explore" />
    <Stack.Screen name="auth/callback" />
    <Stack.Screen name="forgot-password" />
    <Stack.Screen name="join" />
    <Stack.Protected guard={!session}>
      <Stack.Screen name="login" /><Stack.Screen name="signup" />
    </Stack.Protected>
    <Stack.Protected guard={!!session && !recovering}>
      <Stack.Screen name="home" /><Stack.Screen name="profile" />
      <Stack.Screen name="households/index" /><Stack.Screen name="households/create" /><Stack.Screen name="households/[id]" />
    </Stack.Protected>
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="reset-password" />
    </Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><QueryProvider><AuthProvider>
    <InviteIntentProvider><StatusBar style="dark" /><Navigation /></InviteIntentProvider>
  </AuthProvider></QueryProvider></SafeAreaProvider>;
}
