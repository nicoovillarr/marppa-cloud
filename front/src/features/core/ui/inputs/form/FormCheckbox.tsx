import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { Checkbox, CheckboxProps } from "../Checkbox";
import { FormFieldBase, FormFieldProps } from "./FormFieldBase";

export interface FormCheckboxProps extends CheckboxProps, FormFieldProps { }

export function FormCheckbox({
  controlName,
  text,
  label,
  control,
  required,
  className,
  defaultChecked,
  disabled = false,
  onChangedValue,
}: FormCheckboxProps) {
  const handleOnChange = async (
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
      required={required}
      className={className}
      render={(field) => {
        return (
          <Checkbox
            {...field}
            className="h-[42px] items-center"
            defaultChecked={defaultChecked}
            disabled={disabled}
            onChangedValue={(value) => handleOnChange(field, value)}
            text={text}
          />
        );
      }}
    />
  );
}
