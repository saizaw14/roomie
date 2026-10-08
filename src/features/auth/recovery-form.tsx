import { useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { recoverySchema, type RecoveryValues } from './schemas';
import { AuthScreen, authStyles } from './components/auth-screen';
import { FormInput } from './components/form-input';
import { authErrorMessage } from './error-message';
export function RecoveryForm() {
  const { requestRecovery, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema), mode: 'onBlur', defaultValues: { email: '' },
  });
  const submit = handleSubmit(async values => {
    setError(null);
    try { await requestRecovery(values); setSent(true); }
    catch (failure) { setError(authErrorMessage(failure)); }
  });
  return <AuthScreen title={sent ? 'Check your inbox.' : 'Let’s get you back in.'} eyebrow="RESET YOUR PASSWORD">
    <Card style={authStyles.form}>
      {sent ? <>
        <Text accessibilityLiveRegion="polite" style={authStyles.success}>If an account exists for that address, you’ll receive a password reset email. Open its link on this device.</Text>
        <Button label="Try another email" variant="secondary" onPress={() => setSent(false)} />
      </> : <>
        <Text style={authStyles.body}>We’ll send you a link to choose a new password.</Text>
        <FormInput control={control} name="email" label="Email" placeholder="you@example.com" autoCapitalize="none"
          autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!isSubmitting} />
        {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
        <Button label="Send reset link" loading={isSubmitting} disabled={!configured} onPress={() => void submit()} />
      </>}
    </Card>
  </AuthScreen>;
}
