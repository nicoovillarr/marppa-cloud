import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { RadioCardsWrapper, RadioCardsWrapperProps } from "../../radio-cards";
import FormFieldBase, { FormFieldProps } from "./form-field-base";

export interface FormRadioCardsProps
  extends RadioCardsWrapperProps,
    FormFieldProps {}

export default function FormRadioCards({
  controlName,
  control,
  label,
  required,
  className,
  options,
  defaultValue,
  onValueChange,
  renderFn,
}: FormRadioCardsProps) {
  const handleValueChange = (
    field: ControllerRenderProps<FieldValues, any>,
    value: string | number
  ) => {
    if (onValueChange) {
      onValueChange(value);
    }

    field.onChange(value);
  };

  return (
    <FormFieldBase
      controlName={controlName}
      control={control}
      label={label}
      required={required}
      className={className}
      render={(field) => (
        <RadioCardsWrapper
          options={options}
          defaultValue={defaultValue}
          onValueChange={(value) => handleValueChange(field, value)}
          renderFn={renderFn}
        />
      )}
    />
  );
}
