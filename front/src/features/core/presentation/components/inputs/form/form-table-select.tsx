import { ControllerRenderProps, FieldValues } from "react-hook-form";
import FormFieldBase, { FormFieldProps } from "./form-field-base";
import Table, { TableProps } from "../../table";

export interface FormTableProps<T>
  extends Omit<TableProps<T>, "onRowClick" | "columns">,
    FormFieldProps {
  columns: TableProps<T>["columns"];
  multiSelect?: boolean;
}

export default function FormTable<T>({
  controlName,
  control,
  label,
  required,
  className,
  columns,
  data,
  multiSelect = false,
  contextMenuGroups,
}: FormTableProps<T>) {
  return (
    <FormFieldBase
      controlName={controlName}
      control={control}
      label={label}
      required={required}
      className={className}
      render={(field: ControllerRenderProps<FieldValues, any>) => {
        const selectionColumn = {
          __select__: {
            label: "",
            width: "40px",
            minWidth: "40px",
            renderFn: (row: any) => {
              const isSelected = multiSelect
                ? Array.isArray(field.value) && field.value.includes(row.id)
                : field.value === row.id;

              return (
                <input
                  type={multiSelect ? "checkbox" : "radio"}
                  checked={isSelected}
                  onChange={(e) => {
                    if (multiSelect) {
                      let newValue = Array.isArray(field.value)
                        ? [...field.value]
                        : [];
                      if (e.target.checked) {
                        newValue.push(row.id);
                      } else {
                        newValue = newValue.filter((id) => id !== row.id);
                      }
                      field.onChange(newValue);
                    } else {
                      field.onChange(row.id);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                />
              );
            },
          },
        };

        const finalColumns = {
          ...selectionColumn,
          ...columns,
        };

        return (
          <Table
            columns={finalColumns}
            data={data}
            contextMenuGroups={contextMenuGroups}
            onRowClick={(row) => {
              if (multiSelect) {
                let newValue = Array.isArray(field.value)
                  ? [...field.value]
                  : [];
                if (newValue.includes(row.id)) {
                  newValue = newValue.filter((id) => id !== row.id);
                } else {
                  newValue.push(row.id);
                }
                field.onChange(newValue);
              } else {
                field.onChange(row.id);
              }
            }}
          />
        );
      }}
    />
  );
}
