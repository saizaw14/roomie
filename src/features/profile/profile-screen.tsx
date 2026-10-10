import { useState } from 'react';
import { Link } from 'expo-router';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { AuthScreen, authStyles } from '@/features/auth/components/auth-screen';
import { FormInput } from '@/features/auth/components/form-input';
import { profileSchema, type ProfileValues } from '@/features/auth/schemas';
import { useProfile, useSaveProfile } from './use-profile';
function ProfileEditor({ initialName, exists }: { initialName: string; exists: boolean }) {
  const save = useSaveProfile();
  const [saved, setSaved] = useState(false);
  const { control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema), mode: 'onBlur', defaultValues: { name: initialName },
  });
  const submit = handleSubmit(async values => {
    setSaved(false);
    try {
      const profile = await save.mutateAsync({ name: values.name, exists });
      reset({ name: profile.display_name }); setSaved(true);
    } catch { /* Mutation state exposes a recoverable error below. */ }
  });
  return <Card style={authStyles.form}>
    <FormInput control={control} name="name" label="Display name" autoCapitalize="words"
      autoComplete="name" textContentType="name" editable={!isSubmitting} hint="The name your roommates will see." />
    {save.isError ? <Text accessibilityRole="alert" style={authStyles.error}>We couldn’t save your profile. Check your connection and try again.</Text> : null}
    {saved && !isDirty ? <Text accessibilityLiveRegion="polite" style={authStyles.success}>Profile saved.</Text> : null}
    <Button label={exists ? 'Save profile' : 'Create profile'} disabled={exists && !isDirty}
      loading={isSubmitting} onPress={() => void submit()} />
  </Card>;
}
export function ProfileScreen() {
  const { session } = useAuth();
  const profile = useProfile();
  return <AuthScreen title="A little about you." eyebrow="YOUR PROFILE">
    <Text style={authStyles.body}>{session?.user.email}</Text>
    {profile.isPending ? <Text accessibilityLiveRegion="polite" style={authStyles.body}>Loading your profile…</Text> :
      profile.isError ? <Card>
        <Text accessibilityRole="alert" style={authStyles.error}>We couldn’t load your profile. Check your connection and the Roomie setup guide.</Text>
        <Button label="Retry profile" loading={profile.isFetching} onPress={() => void profile.refetch()} />
      </Card> : <ProfileEditor initialName={profile.data?.display_name ?? ''} exists={!!profile.data} />}
    <Text style={authStyles.body}>Your email is managed by your account. Email changes and avatar uploads will be added in a later milestone.</Text>
    <Link href="/households" asChild><Button label="Your households" variant="secondary" /></Link>
    <Link href="/home" asChild><Button label="Back to home" variant="secondary" /></Link>
  </AuthScreen>;
}
