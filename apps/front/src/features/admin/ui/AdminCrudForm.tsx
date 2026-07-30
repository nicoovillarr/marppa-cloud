"use client";

import { Button } from "@/core/ui/Button";
import { FormCheckbox } from "@/core/ui/inputs/form/FormCheckbox";
import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { FormSelect } from "@/core/ui/inputs/form/FormSelect";
import { FormTextarea } from "@/core/ui/inputs/form/FormTextarea";
import { SelectOption } from "@/core/ui/inputs/Select";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { LuSave } from "react-icons/lu";

export type AdminFieldType =
  | "text"
  | "number"
  | "password"
  | "checkbox"
  | "select"
  | "stringList"
  | "keyValue";

export interface AdminField {
  name: string;
  label: string;
  type?: AdminFieldType;
  options?: SelectOption[];
  required?: boolean;
  placeholder?: string;
  tooltip?: string;
  omitOnCreate?: boolean;
  omitOnEdit?: boolean;
}

interface AdminCrudFormProps {
  fields: AdminField[];
  defaultValues?: Record<string, any>;
  isEdit: boolean;
  submitText?: string;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

export function encodeFieldValue(type: AdminFieldType, value: any): any {
  if (type === "stringList") {
    return Array.isArray(value) ? value.join("\n") : "";
  }

  if (type === "keyValue") {
    return Object.entries(value ?? {})
      .map(([key, entry]) => `${key}=${entry}`)
      .join("\n");
  }

  return value;
}

function decodeStringList(raw: string): string[] {
  return String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function decodeKeyValue(raw: string): Record<string, string> | undefined {
  const entries = decodeStringList(raw).map((line) => {
    const separator = line.indexOf("=");
    if (separator === -1) return [line, ""] as const;
    return [
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim(),
    ] as const;
  });

  if (entries.length === 0) return undefined;

  return Object.fromEntries(entries);
}

function decodeFormValues(
  fields: AdminField[],
  data: Record<string, any>
): Record<string, any> {
  const decoded: Record<string, any> = {};

  for (const field of fields) {
    const value = data[field.name];

    if (field.type === "stringList") {
      decoded[field.name] = decodeStringList(value);
      continue;
    }

    if (field.type === "keyValue") {
      decoded[field.name] = decodeKeyValue(value);
      continue;
    }

    if (field.type === "number") {
      decoded[field.name] = value === "" || value == null ? undefined : Number(value);
      continue;
    }

    if (field.type === "checkbox") {
      decoded[field.name] = value === true;
      continue;
    }

    decoded[field.name] = value === "" || value === null ? undefined : value;
  }

  return decoded;
}

export function AdminCrudForm({
  fields,
  defaultValues,
  isEdit,
  submitText = "Save",
  onSubmit,
}: AdminCrudFormProps) {
  const visibleFields = fields.filter((field) =>
    isEdit ? !field.omitOnEdit : !field.omitOnCreate
  );

  const methods = useForm({ defaultValues });
  const { control, handleSubmit } = methods;
  const [error, setError] = useState<string | null>(null);

  const submit = async (data: Record<string, any>) => {
    setError(null);

    try {
      await onSubmit(decodeFormValues(visibleFields, data));
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
      throw e;
    }
  };

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        {visibleFields.map((field) => {
          const shared = {
            key: field.name,
            className: "flex-1",
            label: field.label,
            control,
            controlName: field.name,
            required: field.required,
            tooltip: field.tooltip,
            placeholder: field.placeholder,
          };

          switch (field.type) {
            case "checkbox":
              return (
                <FormCheckbox
                  {...shared}
                  text={field.placeholder}
                  defaultChecked={defaultValues?.[field.name] === true}
                />
              );
            case "select":
              return <FormSelect {...shared} options={field.options ?? []} />;
            case "stringList":
            case "keyValue":
              return <FormTextarea {...shared} />;
            case "number":
              return <FormInput {...shared} type="number" />;
            case "password":
              return <FormInput {...shared} type="password" />;
            default:
              return <FormInput {...shared} />;
          }
        })}

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <Button
          className="ml-auto"
          type="submit"
          icon={<LuSave />}
          text={submitText}
        />
      </form>
    </FormProvider>
  );
}
