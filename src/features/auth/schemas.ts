import { z } from 'zod';
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
export const nameSchema = z.string().trim().min(1, 'Add your name.').max(80, 'Use no more than 80 characters.');
const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(128, 'Use no more than 128 characters.');
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.').max(128) });
export const signupSchema = z.object({ name: nameSchema, email: emailSchema,
  password: passwordSchema, confirmPassword: z.string() }).refine(value => value.password === value.confirmPassword,
  { path: ['confirmPassword'], message: 'Passwords do not match.' });
export const recoverySchema = z.object({ email: emailSchema });
const passwordUpdateFields = z.object({ password: passwordSchema, confirmPassword: z.string(), currentPassword: z.string().min(1, 'Enter your current password.').max(128).optional() });
export const passwordUpdateSchema = passwordUpdateFields
  .refine(value => value.password === value.confirmPassword,
    { path: ['confirmPassword'], message: 'Passwords do not match.' });
export const passwordChangeSchema = passwordUpdateFields.extend({ currentPassword: z.string().min(1, 'Enter your current password.').max(128) })
 .refine(value => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
export const profileSchema = z.object({ name: nameSchema });
export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type RecoveryValues = z.infer<typeof recoverySchema>;
export type PasswordUpdateValues = z.infer<typeof passwordUpdateSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
