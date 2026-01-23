import { ControllerRenderProps, FieldValues } from "react-hook-form";
import FormFieldBase, { FormFieldProps } from "./form-field-base";
import Input, { InputProps } from "../input";

export interface FormInputProps extends InputProps, FormFieldProps {}

export default function FormInput({
  controlName,
  type = "text",
  label,
  control,
  leading,
  trailing,
  required,
  className,
  disabled = false,
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
      controlName={controlName}
      control={control}
      label={label}
      required={required}
      className={className}
      render={(field) => (
        <Input
          {...field}
          type={type}
          value={field.value ?? ""}
          onChangedValue={(value) => handleOnChange(field, value)}
          onBlur={(value) => handleOnBlur(field, value)}
          leading={leading}
          trailing={trailing}
          disabled={field.disabled || disabled}
        />
      )}
    />
  );
}
