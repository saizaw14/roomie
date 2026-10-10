import { useLocalSearchParams } from 'expo-router';
import { JoinHouseholdScreen } from '@/features/households/join-household-screen';
export default function Join() {
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  return <JoinHouseholdScreen key={JSON.stringify(code ?? '')} />;
}
