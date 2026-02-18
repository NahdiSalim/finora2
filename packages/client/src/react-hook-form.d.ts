import type { FieldValues, FieldPath, ControllerProps } from 'react-hook-form';

declare module 'react-hook-form' {
  export function Controller<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TTransformedValues = TFieldValues,
  >(props: ControllerProps<TFieldValues, TName, TTransformedValues>): React.JSX.Element;
}
