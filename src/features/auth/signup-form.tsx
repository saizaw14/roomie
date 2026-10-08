import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { signupSchema, type SignupValues } from './schemas';
import { AuthScreen, authStyles } from './components/auth-screen';
import { FormInput } from './components/form-input';
import { authErrorMessage } from './error-message';
export function SignupForm() {
  const { signUp, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, resetField, formState: { isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema), mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });
  const submit = handleSubmit(async values => {
    setError(null);
    try {
      const result = await signUp(values);
      resetField('password'); resetField('confirmPassword'); setSent(result.needsConfirmation);
    } catch (failure) { setError(authErrorMessage(failure)); }
  });
  return <AuthScreen title={sent ? 'Check your inbox.' : 'Make yourself at home.'} eyebrow="CREATE YOUR ROOMIE ACCOUNT">
    {sent ? <Card>
      <Text accessibilityLiveRegion="polite" style={authStyles.success}>If this address can be registered, a confirmation email is on its way. Open the link on this device to continue.</Text>
      <Text style={authStyles.body}>Already registered? You can sign in instead. Check your spam folder if needed.</Text>
      <Button label="Use a different email" variant="secondary" onPress={() => setSent(false)} />
    </Card> : <Card style={authStyles.form}>
      <FormInput control={control} name="name" label="Name" placeholder="Your name" autoCapitalize="words"
        autoComplete="name" textContentType="name" editable={!isSubmitting} />
      <FormInput control={control} name="email" label="Email" placeholder="you@example.com" autoCapitalize="none"
        autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!isSubmitting} />
      <FormInput control={control} name="password" label="Password" hint="Use at least 8 characters."
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!isSubmitting} />
      <FormInput control={control} name="confirmPassword" label="Confirm password" secureTextEntry
        autoCapitalize="none" autoCorrect={false} textContentType="newPassword" editable={!isSubmitting} />
      {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
      <Button label="Create account" loading={isSubmitting} disabled={!configured} onPress={() => void submit()} />
    </Card>}
    <Link href="/login" asChild><Button label="Already have an account? Sign in" variant="secondary" /></Link>
  </AuthScreen>;
}
