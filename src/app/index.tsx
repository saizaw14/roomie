import { Redirect } from 'expo-router';
import { WelcomeScreen } from '@/features/households/welcome-screen';
import { useAuth } from '@/lib/auth-context';
export default function Index() {
  const { session, recovering } = useAuth();
  return session ? <Redirect href={recovering ? '/reset-password' : '/home'} /> : <WelcomeScreen />;
}
