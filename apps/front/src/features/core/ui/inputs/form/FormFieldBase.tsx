import React, { ReactNode } from "react";
import {
  Control,
  Controller,
  ControllerRenderProps,
  FieldValues,
} from "react-hook-form";
import { FormLabel } from "./FormLabel";

export interface FormFieldProps {
  controlName: string;
  control: Control;
  label?: string;
  errorMessage?: string;
  required?: boolean;
  className?: string;
  tooltip?: string;
  onChangedValue?: (value: any) => void;
}

export interface FormFieldBaseProps extends FormFieldProps {
  render: (field: ControllerRenderProps<FieldValues, any>) => ReactNode;
}

export function FormFieldBase({
  controlName,
  control,
  label,
  required,
  className,
  tooltip,
  render,
}: FormFieldBaseProps) {
  return (
    <Controller
      name={controlName}
      control={control}
      render={({ field, fieldState }) => (
        <div className={`flex flex-col ${className}`}>
          {label && (
            <FormLabel className="mb-1" text={label} required={required} tooltip={tooltip} />
          )}

          {render(field)}

          {fieldState.error && (
            <span className="mt-1 text-xs text-red-500">
              {fieldState.error.message}
            </span>
          )}
        </div>
      )}
    />
  );
}
