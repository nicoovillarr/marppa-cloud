import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { FormFieldBase, FormFieldProps } from "./FormFieldBase";
import { Textarea, TextareaProps } from "../Textarea";

export interface FormTextareaProps extends TextareaProps, FormFieldProps { }

export function FormTextarea({
  controlName,
  label,
  control,
  required,
  className,
  tooltip,
  rows,
  placeholder,
  disabled = false,
  onChangedValue,
}: FormTextareaProps) {
  const handleOnChange = (
    field: ControllerRenderProps<FieldValues, any>,
    value: string
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
      tooltip={tooltip}
      render={(field) => (
        <Textarea
          {...field}
          ref={field.ref}
          rows={rows}
          value={field.value ?? ""}
          placeholder={placeholder}
          disabled={field.disabled || disabled}
          onChangedValue={(value) => handleOnChange(field, value)}
        />
      )}
    />
  );
}
