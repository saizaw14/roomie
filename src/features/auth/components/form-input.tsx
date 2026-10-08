import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { ComponentProps } from 'react';
type Props<T extends FieldValues> = Omit<ComponentProps<typeof Input>, 'value' | 'onChangeText' | 'onBlur' | 'error' | 'ref'> & {
  control: Control<T>; name: FieldPath<T>;
};
export function FormInput<T extends FieldValues>({ control, name, ...props }: Props<T>) {
  const { field: { value, onChange, onBlur, ref: inputRef }, fieldState } = useController({ control, name });
  return <Input {...props} value={value} onChangeText={onChange} onBlur={onBlur}
    ref={inputRef} error={fieldState.error?.message} />;
}
