import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { FormFieldBase, FormFieldProps } from "./FormFieldBase";
import { Table, TableProps } from "../../Table";

export interface FormTableProps<T, K>
  extends Omit<TableProps<T, K>, "onRowClick" | "columns">,
  FormFieldProps {
  columns: TableProps<T, K>["columns"];
  multiSelect?: boolean;
}

export function FormTable<T, K>({
  controlName,
  control,
  label,
  required,
  className,
  columns,
  data,
  multiSelect = false,
  contextMenuGroups,
  getKey,
}: FormTableProps<T, K>) {
  const onSelectionChange = (field: ControllerRenderProps<FieldValues, any>, indexes: Set<K>) => {
    if (multiSelect) {
      field.onChange(Array.from(indexes));
    } else {
      field.onChange(Array.from(indexes)[0]);
    }
  };

  return (
    <FormFieldBase
      controlName={controlName}
      control={control}
      label={label}
      required={required}
      className={className}
      render={(field: ControllerRenderProps<FieldValues, any>) => {
        return (
          <Table
            columns={columns}
            data={data}
            contextMenuGroups={contextMenuGroups}
            select={multiSelect ? "multiple" : "single"}
            onSelectionChange={(indexes) => onSelectionChange(field, indexes)}
            getKey={getKey}
          />
        );
      }}
    />
  );
}
