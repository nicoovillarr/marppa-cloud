import React, { ReactNode } from "react";
import {
  Control,
  Controller,
  ControllerRenderProps,
  FieldValues,
} from "react-hook-form";

export interface FormFieldProps {
  controlName: string;
  control: Control;
  label?: string;
  errorMessage?: string;
  required?: boolean;
  className?: string;
  onChangedValue?: (value: any) => void;
}

export interface FormFieldBaseProps extends FormFieldProps {
  render: (field: ControllerRenderProps<FieldValues, any>) => ReactNode;
}

export default function FormFieldBase({
  controlName,
  control,
  label,
  required,
  className,
  render,
}: FormFieldBaseProps) {
  return (
    <Controller
      name={controlName}
      control={control}
      render={({ field, fieldState }) => (
        <div className={`flex flex-col ${className}`}>
          {label && (
            <label className="mb-1 text-sm font-medium">
              {label}
              {required && <span className="text-red-500">*</span>}
            </label>
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
