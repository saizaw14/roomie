import { pressFeedback } from '@/lib/press-feedback';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { loginSchema, type LoginValues } from './schemas';
import { DesignAuthScreen, designAuthStyles as authStyles, GoogleSignInPlaceholder } from './components/design-auth-screen';
import { FormInput } from './components/form-input';
import { authErrorMessage } from './error-message';
export function LoginForm() {
  const { signIn, configured } = useAuth();
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, resetField, formState: { isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), mode: 'onBlur', defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async values => {
    setError(null);
    try { await signIn(values, remember); } catch (failure) { setError(authErrorMessage(failure)); } finally { resetField('password'); }
  });
  return <DesignAuthScreen title="Sign in to Roomie" eyebrow="Welcome back" description="Your household finances are right where you left them.">
    <View>
      <FormInput control={control} name="email" appearance="auth" label="Email address" placeholder="name@example.com"
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!isSubmitting} />
      <FormInput control={control} name="password" appearance="auth" label="Password" placeholder="Enter your password" revealable secureTextEntry autoCapitalize="none"
        autoCorrect={false} autoComplete="current-password" textContentType="password" editable={!isSubmitting}
        returnKeyType="go" onSubmitEditing={() => { if (configured && !isSubmitting) void submit(); }} />
      <View style={authStyles.options}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember, disabled: isSubmitting }} disabled={isSubmitting}
          onPress={() => setRemember(value => !value)} style={authStyles.remember}>
          <View style={[authStyles.check, remember && authStyles.checked]}>{remember ? <Text style={authStyles.checkText}>✓</Text> : null}</View>
          <Text style={authStyles.small}>Keep me signed in</Text>
        </Pressable>
        <Link href="/forgot-password" style={authStyles.link} onPress={pressFeedback}>Forgot password?</Link>
      </View>
      {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
      <Button appearance="auth" label="Sign in" loading={isSubmitting} disabled={!configured} onPress={() => void submit()} />
      <GoogleSignInPlaceholder />
    </View>
    <View style={authStyles.switch}><Text style={authStyles.small}>New to Roomie?</Text>
      <Link href="/signup" style={authStyles.link} onPress={pressFeedback}>Create account</Link>
    </View>
  </DesignAuthScreen>;
}
