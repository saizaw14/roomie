import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { passwordUpdateSchema, type PasswordUpdateValues } from './schemas';
import { AuthScreen, authStyles } from './components/auth-screen';
import { FormInput } from './components/form-input';
import { authErrorMessage } from './error-message';
export function PasswordUpdateForm() {
  const { updatePassword, session, finishRecovery } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<PasswordUpdateValues>({
    resolver: zodResolver(passwordUpdateSchema), mode: 'onBlur', defaultValues: { password: '', confirmPassword: '' },
  });
  const submit = handleSubmit(async values => {
    setError(null);
    try { await updatePassword(values); router.replace('/home'); }
    catch (failure) { setError(authErrorMessage(failure)); }
  });
  return <AuthScreen title="Choose a new password." eyebrow="WELCOME BACK">
    <Card style={authStyles.form}>
      <Text style={authStyles.body}>Updating the password for {session?.user.email}.</Text>
      <FormInput control={control} name="password" label="New password" hint="Use at least 8 characters."
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!isSubmitting} />
      <FormInput control={control} name="confirmPassword" label="Confirm new password" secureTextEntry
        autoCapitalize="none" autoCorrect={false} textContentType="newPassword" editable={!isSubmitting} />
      {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
      <Button label="Save new password" loading={isSubmitting} onPress={() => void submit()} />
      <Button label="Cancel" variant="secondary" disabled={isSubmitting} onPress={finishRecovery} />
    </Card>
  </AuthScreen>;
}
