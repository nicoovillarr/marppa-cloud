"use client";

import {
  useEffect,
  useState,
} from "react";
import FormFieldBase, { FormFieldProps } from "./form-field-base";
import { ControllerRenderProps, FieldValues } from "react-hook-form";
import Input from "../input";
import Button from "../../button";
import { LuPlus, LuTrash2 } from "react-icons/lu";

interface FormGroupProps {
  placeholder?: string;
  type: "text" | "number" | "email" | "password";
  options?: { label: string; value: string | number }[];
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
}

type SubFormProps = Partial<FormInputListProps> & {
  values?: { [key: string]: any };
  isNew?: boolean;
  onAdd?: (value: { [key: string]: any }) => void;
  onDelete?: () => void;
};

export interface FormInputListProps extends FormFieldProps {
  fields?: { [key: string]: FormGroupProps };
  defaultValues?: { [key: string]: any }[];
}

const SubForm = ({
  fields,
  values,
  isNew = false,
  onChangedValue,
  onAdd,
  onDelete,
}: SubFormProps) => {
  const [actualValues, setActualValues] = useState<{ [key: string]: any }>(
    values || {}
  );

  useEffect(() => {
    setActualValues(values || {});
  }, [values]);

  const handleOnAdd = () => {
    if (isNew === false) return;

    if (
      !!actualValues &&
      Object.values(actualValues).some((val) => val !== "" || val != null)
    ) {
      onAdd?.(actualValues);
    }

    setActualValues({});
    onChangedValue?.({});
  };

  return (
    <article className="flex gap-2 w-full items-center flex-nowrap">
      {fields != null &&
        Object.keys(fields).map((field, index) => {
          return (
            <div key={index} className="flex-1">
              <Input
                type={fields[field].type}
                placeholder={fields[field].placeholder}
                leading={fields[field].leading}
                trailing={fields[field].trailing}
                disabled={fields[field].disabled}
                value={actualValues?.[field] ?? ""}
                defaultValue={actualValues?.[field] ?? ""}
                onChangedValue={(value) => {
                  const updatedValues = { ...actualValues, [field]: value };
                  setActualValues(updatedValues);
                  onChangedValue?.(updatedValues);
                }}
              />
            </div>
          );
        })}

      {isNew === false && (
        <Button
          className="shrink-0 h-full aspect-square"
          style="secondary"
          icon={<LuTrash2 />}
          type="button"
          onClick={() => onDelete?.()}
          disableAnimations
        />
      )}

      {isNew === true && (
        <Button
          className="shrink-0 h-full aspect-square"
          style="secondary"
          icon={<LuPlus />}
          type="button"
          onClick={handleOnAdd}
          disableAnimations
        />
      )}
    </article>
  );
};

export default function FormList({
  className,
  label,
  control,
  controlName,
  fields,
  defaultValues,
  required,
  onChangedValue,
}: FormInputListProps) {
  const [values, setValues] = useState<{ [key: string]: any }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (fields && defaultValues) {
      const cleanedValues = defaultValues.map((item) => {
        const cleanedItem: { [key: string]: any } = {};

        Object.keys(fields).forEach((key) => {
          cleanedItem[key] = item[key] ?? undefined;
        });

        return cleanedItem;
      });

      setValues(cleanedValues);
    } else {
      setValues(defaultValues || []);
    }

    setIsLoading(false);
  }, [fields, defaultValues]);

  const handleOnChange = (
    field: ControllerRenderProps<FieldValues, any>,
    index: number,
    value: any
  ) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
    onChangedValue?.(newValues);
    field.onChange(newValues);
  };

  const handleOnNewEntry = (
    field: ControllerRenderProps<FieldValues, any>,
    newEntry: any
  ) => {
    if (
      !newEntry ||
      Object.values(newEntry).every((val) => val === "" || val == null)
    ) {
      return;
    }

    const newValues = [...values, newEntry];
    setValues(newValues);
    onChangedValue?.(newValues);
    field.onChange(newValues);
  };

  const handleOnDelete = (
    field: ControllerRenderProps<FieldValues, any>,
    index: number
  ) => {
    const newValues = values.filter((_, i) => i !== index);
    setValues(newValues);
    onChangedValue?.(newValues);
    field.onChange(newValues);
  };

  return (
    <FormFieldBase
      className={className}
      control={control}
      controlName={controlName}
      label={label}
      required={required}
      render={(field) => (
        <div className="flex flex-col gap-2 w-full">
          {values.map((value, index) => (
            <SubForm
              key={index}
              fields={fields}
              values={value}
              onDelete={() => handleOnDelete(field, index)}
              onChangedValue={(updatedValues) =>
                handleOnChange(field, index, updatedValues)
              }
            />
          ))}

          <SubForm
            fields={fields}
            onAdd={(newEntry) => handleOnNewEntry(field, newEntry)}
            isNew
          />
        </div>
      )}
    />
  );
}
