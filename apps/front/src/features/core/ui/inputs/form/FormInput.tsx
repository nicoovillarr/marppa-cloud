import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { FormFieldBase, FormFieldProps } from "./FormFieldBase";
import { Input, InputProps } from "../Input";

export interface FormInputProps extends InputProps, FormFieldProps { }

export function FormInput({
  controlName,
  type = "text",
  label,
  control,
  leading,
  trailing,
  required,
  className,
  disabled = false,
  disabledText,
  placeholder,
  onBlur,
  onChangedValue,
}: FormInputProps) {
  const handleOnBlur = async (
    field: ControllerRenderProps<FieldValues, any>,
    value: any
  ) => {
    field.onBlur();
    onBlur?.(value);
  };

  const handleOnChange = async (
    field: ControllerRenderProps<FieldValues, any>,
    value: string | number
  ) => {
    field.onChange(value);
    onChangedValue?.(value);
  };

  return (
    <FormFieldBase
      className={className}
      controlName={controlName}
      control={control}
      label={label}
      required={required}
      render={(field) => {
        return (
          <Input
            {...field}
            ref={field.ref}
            type={type}
            value={field.value ?? ""}
            onChangedValue={(value) => handleOnChange(field, value)}
            onBlur={(value) => handleOnBlur(field, value)}
            leading={leading}
            trailing={trailing}
            disabled={field.disabled || disabled}
            disabledText={disabledText}
            placeholder={placeholder}
          />
        );
      }}
    />
  );
}
