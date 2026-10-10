import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthScreen, authStyles } from '@/features/auth/components/auth-screen';
import { FormInput } from '@/features/auth/components/form-input';
import { useAuth } from '@/lib/auth-context';
import { createHousehold } from './api';
import { householdError, householdSchema } from './validation';
export function CreateHouseholdScreen() {
 const { session } = useAuth();
 const client = useQueryClient();
 const [error, setError] = useState<string | null>(null);
 const form = useForm<z.infer<typeof householdSchema>>({ resolver: zodResolver(householdSchema), defaultValues: { name: '' } });
 const mutation = useMutation({ mutationFn: createHousehold, retry: false, onSuccess: async id => {
  client.setQueryData(['household-selection', session?.user.id], id);
  await client.invalidateQueries({ queryKey: ['households'] });
  router.replace('/home');
 } });
 return <AuthScreen title="Make a shared home." eyebrow="CREATE HOUSEHOLD"><Card style={authStyles.form}>
  <FormInput control={form.control} name="name" label="Household name" placeholder="Our apartment" maxLength={80} editable={!mutation.isPending} />
  <Text style={authStyles.body}>Currency: MYR (RM)</Text>
  {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
  <Button label="Create household" loading={mutation.isPending} onPress={() => void form.handleSubmit(async values => {
   setError(null); try { await mutation.mutateAsync(values.name); } catch (e) { setError(householdError(e)); }
  })()} />
 </Card></AuthScreen>;
}
