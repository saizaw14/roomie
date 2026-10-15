import { useState } from 'react';
import { Text,View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/features/auth/components/form-input';
import { profileSchema,passwordUpdateSchema,type ProfileValues,type PasswordUpdateValues } from '@/features/auth/schemas';
import { authErrorMessage } from '@/features/auth/error-message';
import { useAuth } from '@/lib/auth-context';
import { useSaveProfile } from './use-profile';
import { ProfileAvatar,s } from './profile-ui';
export function ProfileEditor({initialName,email,uri,exists,onBusy,onDone}:{initialName:string;email:string;uri?:string|null;exists:boolean;onBusy:(busy:boolean)=>void;onDone:()=>void}) {
 const save=useSaveProfile();const [error,setError]=useState<string|null>(null);
 const {control,handleSubmit,reset,formState:{isSubmitting,isDirty}}=useForm<ProfileValues>({resolver:zodResolver(profileSchema),mode:'onBlur',defaultValues:{name:initialName}});
 async function submit(){await handleSubmit(async values=>{onBusy(true);setError(null);try{const profile=await save.mutateAsync({name:values.name,exists});reset({name:profile.display_name});onDone();}catch{setError('We couldn’t save your profile. Check your connection and try again.');}finally{onBusy(false);}})();}
 return <><View style={{flexDirection:'row',alignItems:'center',gap:14}}><ProfileAvatar name={initialName||'Roomie member'} uri={uri} large/><Text style={[s.body,{flex:1}]}>Your roommates see this name. Photo changes are coming soon.</Text></View>
  <FormInput appearance="auth" control={control} name="name" label="Display name" autoCapitalize="words" autoComplete="name" textContentType="name" editable={!isSubmitting}/>
  <Input appearance="auth" label="Email address" value={email} editable={false}/>
  <Text style={s.body}>Your sign-in email is managed by your account.</Text>
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  <Button appearance="auth" label="Save profile" disabled={exists&&!isDirty} loading={isSubmitting} onPress={()=>void submit()}/>
 </>;
}
export function ProfilePasswordForm({onBusy,onDone}:{onBusy:(busy:boolean)=>void;onDone:()=>void}) {
 const {updatePassword}=useAuth();const [error,setError]=useState<string|null>(null);
 const {control,handleSubmit,formState:{isSubmitting}}=useForm<PasswordUpdateValues>({resolver:zodResolver(passwordUpdateSchema),mode:'onBlur',defaultValues:{password:'',confirmPassword:''}});
 const submit=handleSubmit(async values=>{onBusy(true);setError(null);try{await updatePassword(values);onDone();}catch(failure){setError(authErrorMessage(failure));}finally{onBusy(false);}});
 return <><FormInput appearance="auth" control={control} name="password" label="New password" placeholder="At least 8 characters" revealable secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!isSubmitting}/><FormInput appearance="auth" control={control} name="confirmPassword" label="Confirm new password" revealable secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" editable={!isSubmitting}/>{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}<Button appearance="auth" label="Save new password" loading={isSubmitting} onPress={()=>void submit()}/></>;
}
