import { ControllerRenderProps, FieldValues } from "react-hook-form";
import FormFieldBase, { FormFieldProps } from "./form-field-base";
import Slider, { SliderProps } from "../slider";

export interface FormSliderProps extends SliderProps, FormFieldProps {}

export default function FormSlider({
  controlName,
  label,
  control,
  required,
  className,
  min,
  max,
  step = 1,
  disabled = false,
  valueText = (value) => (typeof value === "number" ? `${value}` : ""),
  onChangedValue,
}: FormSliderProps) {
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
      render={(field) => {
        console.log("FormSlider field:", field);
        return (
          <Slider
            {...field}
            value={field.value}
            onValueChange={(value) => handleOnChange(field, value)}
            min={min}
            max={max}
            step={step}
            disabled={field.disabled || disabled}
            valueText={valueText}
          />
        );
      }}
    />
  );
}
