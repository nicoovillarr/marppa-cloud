import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { FormFieldBase, FormFieldProps } from "./FormFieldBase";
import { Input, InputProps } from "../Input";
import { LuCheck, LuTrash } from "react-icons/lu";
import { Button } from "../../Button";
import { useEffect, useState } from "react";
import generateUUID from "@/libs/uuid-gen";

type ItemValue = { id: string; rows: (string | number)[] };

export interface FormInputListProps
  extends Omit<InputProps, "value" | "defaultValue">,
  FormFieldProps {
  rowMapping: string[];
  values?: ItemValue[];
}

const InputItem = ({
  value,
  rowMapping,
  type,
  leading,
  trailing,
  disabled,
  onChangedValue,
  onBlur,
}: {
  value: ItemValue;
  onChangedValue?: (value: ItemValue) => void;
  onBlur?: (value: ItemValue) => void;
} & Partial<FormInputListProps>) => {
  const handleOnChange = (newValue: string | number, index: number) => {
    const updatedValues = [...(value.rows ?? [])];
    updatedValues[index] = newValue;
    onChangedValue?.({ ...value, value: updatedValues });
  };

  const handleOnBlur = (newValue: string | number, index: number) => {
    const updatedValues = [...(value.rows ?? [])];
    updatedValues[index] = newValue;
    onBlur?.({ ...value, value: updatedValues });
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {[...Array(rowMapping.length ?? 1)].map((_, index) => (
        <Input
          key={index}
          className="flex-1"
          type={type}
          value={value.rows?.[index] ?? ""}
          placeholder={rowMapping[index]}
          onChangedValue={(value) => handleOnChange(value, index)}
          onBlur={(value) => handleOnBlur(value, index)}
          leading={leading}
          trailing={trailing}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

const InputItemSkeleton = ({ rows }: { rows: number }) => {
  return (
    <div className="flex items-center gap-2 w-full animate-pulse">
      {[...Array(rows)].map((_, index) => (
        <div key={index} className="flex-1 h-10 rounded-md bg-gray-300"></div>
      ))}

      <div className="shrink-0 w-10 h-10 rounded-md bg-gray-300"></div>
    </div>
  );
};

export function FormInputList({
  controlName,
  values,
  rowMapping,
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
}: FormInputListProps) {
  const [actualValues, setActualValues] = useState<ItemValue[]>(values ?? []);

  const handleOnBlur = async (
    field: ControllerRenderProps<FieldValues, any>,
    value: ItemValue
  ) => {
    field.onBlur();
    onBlur?.(value);
  };

  const handleOnChange = async (
    field: ControllerRenderProps<FieldValues, any>,
    value: ItemValue
  ) => {
    const newValues = actualValues.map((v) => (v.id === value.id ? value : v));
    field.onChange(newValues);
    setActualValues(newValues);
  };

  useEffect(() => {
    const actualValues =
      values?.map((item) => ({
        id: item.id,
        rows: [
          ...item.rows,
          ...Array(rowMapping.length - item.rows.length).fill(""),
        ],
      })) ?? [];

    setActualValues(actualValues);
  }, [values]);

  return (
    <FormFieldBase
      controlName={controlName}
      control={control}
      label={label}
      required={required}
      className={className}
      render={(field) => {
        return (
          <>
            {actualValues?.map((value, index) => (
              <article key={index} className="flex items-center gap-2 w-full">
                <InputItem
                  value={value}
                  rowMapping={rowMapping}
                  leading={leading}
                  trailing={trailing}
                  type={type}
                  disabled={field.disabled || disabled}
                  onBlur={(value) => handleOnBlur(field, value)}
                  onChangedValue={(value) => handleOnChange(field, value)}
                />

                <Button
                  icon={<LuTrash />}
                  style="danger"
                  type="submit"
                  className="shrink-0"
                  onClick={() => console.log("Delete", value)}
                />
              </article>
            ))}

            {/* Add new item */}
            <article className="flex items-center gap-2 w-full">
              <InputItem
                value={{
                  id: generateUUID("", 8),
                  rows: Array(rowMapping.length).fill(""),
                }}
                rowMapping={rowMapping}
                leading={leading}
                trailing={trailing}
                type={type}
                disabled={field.disabled || disabled}
                onBlur={(value) => handleOnBlur(field, value)}
                onChangedValue={(value) => handleOnChange(field, value)}
              />

              <Button icon={<LuCheck />} type="submit" style="secondary" className="shrink-0 h-full max-h-full aspect-square" />
            </article>
          </>
        );
      }}
    />
  );
}
