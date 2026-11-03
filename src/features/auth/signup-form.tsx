import { pressFeedback } from '@/lib/press-feedback';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { signupSchema, type SignupValues } from './schemas';
import { DesignAuthScreen, designAuthStyles as authStyles } from './components/design-auth-screen';
import { FormInput } from './components/form-input';
import { authErrorMessage } from './error-message';
export function SignupForm() {
  const { signUp, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, resetField, formState: { isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema), mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });
  const submit = handleSubmit(async values => {
    setError(null);
    try {
      const result = await signUp(values);
      setConfirmationEmail(values.email.trim().toLowerCase());
      resetField('password'); resetField('confirmPassword'); setSent(result.needsConfirmation);
    } catch (failure) { setError(authErrorMessage(failure)); }
  });
  return <DesignAuthScreen fixed success={sent} title={sent ? 'Check your inbox' : 'Let’s get you settled'} eyebrow="" description={sent ? undefined : 'Start making shared living simpler in just a minute.'}>
    {sent ? <View style={authStyles.successArea}>
      <View style={authStyles.successIcon}><Image source={require('../../../assets/images/auth/receipt.svg')} style={{ width: 31, height: 31 }} /></View>
      <Text accessibilityRole="header" style={authStyles.successTitle}>Check your inbox</Text>
      <Text accessibilityLiveRegion="polite" style={authStyles.success}>If this address can be registered, a confirmation email is on its way. Open the link on this device to continue.</Text>
      <Text style={authStyles.email}>{confirmationEmail}</Text>
      <Link href="/login" asChild><Button appearance="auth" label="Back to sign in" /></Link>
      <Button label="Use a different email" variant="secondary" onPress={() => setSent(false)} />
    </View> : <View>
      <FormInput reserveErrorSpace containerStyle={{ marginBottom: 8 }} control={control} name="name" appearance="auth" label="Display name" placeholder="Your full name" autoCapitalize="words"
        autoComplete="name" textContentType="name" editable={!isSubmitting} />
      <FormInput reserveErrorSpace containerStyle={{ marginBottom: 8 }} control={control} name="email" appearance="auth" label="Email address" placeholder="name@example.com" autoCapitalize="none"
        autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!isSubmitting} />
      <FormInput reserveErrorSpace containerStyle={{ marginBottom: 8 }} control={control} name="password" appearance="auth" label="Password" placeholder="At least 8 characters" revealable
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!isSubmitting} />
      <FormInput reserveErrorSpace containerStyle={{ marginBottom: 8 }} control={control} name="confirmPassword" appearance="auth" label="Confirm password" placeholder="Enter it again" revealable secureTextEntry autoComplete="new-password"
        autoCapitalize="none" autoCorrect={false} textContentType="newPassword" editable={!isSubmitting} />
      {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
      <Button appearance="auth" label="Create account" loading={isSubmitting} disabled={!configured} onPress={() => void submit()} />
    </View>}
    <View style={authStyles.switch}><Text style={authStyles.small}>Already have an account?</Text><Link href="/login" style={authStyles.link} onPress={pressFeedback}>Sign in</Link></View>
    {!sent ? <Text style={authStyles.legal}>By creating an account, you agree to Roomie’s Terms and Privacy Policy.</Text> : null}
  </DesignAuthScreen>;
}
