import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { loginSchema, type LoginValues } from './schemas';
import { AuthScreen, authStyles } from './components/auth-screen';
import { FormInput } from './components/form-input';
import { authErrorMessage } from './error-message';
export function LoginForm() {
  const { signIn, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), mode: 'onBlur', defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async values => {
    setError(null);
    try { await signIn(values); } catch (failure) { setError(authErrorMessage(failure)); }
  });
  return <AuthScreen title="Welcome home." eyebrow="SIGN IN TO ROOMIE">
    <Card style={authStyles.form}>
      <FormInput control={control} name="email" label="Email" placeholder="you@example.com"
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!isSubmitting} />
      <FormInput control={control} name="password" label="Password" secureTextEntry autoCapitalize="none"
        autoCorrect={false} autoComplete="current-password" textContentType="password" editable={!isSubmitting}
        returnKeyType="go" onSubmitEditing={() => { if (configured && !isSubmitting) void submit(); }} />
      {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
      <Button label="Sign in" loading={isSubmitting} disabled={!configured} onPress={() => void submit()} />
    </Card>
    <Link href="/forgot-password" asChild><Button label="Forgot password?" variant="secondary" /></Link>
    <Text style={authStyles.body}>New to Roomie?</Text>
    <Link href="/signup" asChild><Button label="Create account" variant="secondary" /></Link>
  </AuthScreen>;
}
