import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { FormFieldBase, FormFieldProps } from "./FormFieldBase";
import { Select, SelectProps } from "../Select";

export interface FormSelectProps extends SelectProps, FormFieldProps { }

export function FormSelect({
  controlName,
  label,
  control,
  leading,
  trailing,
  className,
  options,
  placeholder,
  clearText,
  isLoading,
  disabled = false,
  required = false,
  tooltip,
  onChangedValue,
}: FormSelectProps) {
  const handleOnChange = (
    field: ControllerRenderProps<FieldValues, any>,
    value: boolean
  ) => {
    field.onChange(value);
    onChangedValue?.(value);
  };

  return (
    <FormFieldBase
      controlName={controlName}
      control={control}
      label={label}
      className={className}
      required={required}
      tooltip={tooltip}
      render={(field) => (
        <Select
          {...field}
          options={options}
          defaultValue={field.value}
          placeholder={placeholder}
          clearText={clearText}
          onChangedValue={(value) => handleOnChange(field, value)}
          leading={leading}
          trailing={trailing}
          isLoading={isLoading}
          disabled={field.disabled || disabled}
        />
      )}
    />
  );
}
