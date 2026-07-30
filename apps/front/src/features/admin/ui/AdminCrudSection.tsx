"use client";

import { Button } from "@/core/ui/Button";
import { useDialog } from "@/core/ui/DialogProvider";
import { ContextMenuGroup } from "@/core/ui/ContextMenu";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { useCallback, useEffect, useState } from "react";
import { LuListPlus } from "react-icons/lu";
import { toast } from "sonner";
import { AdminCrudForm, AdminField, encodeFieldValue } from "./AdminCrudForm";

export interface AdminCrudApi<T, K> {
  list: () => Promise<T[]>;
  create?: (data: any) => Promise<unknown>;
  update?: (id: K, data: any) => Promise<unknown>;
  remove?: (id: K) => Promise<void>;
}

export interface AdminCrudSectionProps<T, K extends string | number> {
  title: string;
  description?: string;
  columns: ColumnMapping<T>;
  fields: AdminField[];
  api: AdminCrudApi<T, K>;
  getKey: (row: T) => K;
  getLabel: (row: T) => string;
  removeText?: string;
  canRemove?: (row: T) => boolean;
  emptyText?: string;
  onChanged?: () => void;
}

export function AdminCrudSection<T, K extends string | number>({
  title,
  description,
  columns,
  fields,
  api,
  getKey,
  getLabel,
  removeText = "Delete",
  canRemove,
  emptyText = "Nothing here yet.",
  onChanged,
}: AdminCrudSectionProps<T, K>) {
  const { showDialog, closeDialog } = useDialog();

  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      setRows(await api.list());
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
      setRows([]);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const toFormValues = (row: T): Record<string, any> =>
    Object.fromEntries(
      fields.map((field) => [
        field.name,
        encodeFieldValue(field.type ?? "text", (row as any)[field.name]),
      ])
    );

  const openCreate = () => {
    showDialog({
      title: `New ${title}`,
      content: (
        <AdminCrudForm
          fields={fields}
          isEdit={false}
          submitText="Create"
          onSubmit={async (data) => {
            await api.create!(data);
            toast.success(`${title} created`);
            closeDialog();
            await refresh();
          }}
        />
      ),
    });
  };

  const openEdit = (row: T) => {
    if (!api.update) return;

    showDialog({
      title: getLabel(row),
      content: (
        <AdminCrudForm
          fields={fields}
          isEdit
          defaultValues={toFormValues(row)}
          onSubmit={async (data) => {
            await api.update!(getKey(row), data);
            toast.success(`${title} saved`);
            closeDialog();
            await refresh();
          }}
        />
      ),
    });
  };

  const confirmRemove = (row: T) => {
    showDialog({
      type: "confirm",
      title: `${removeText} ${getLabel(row)}?`,
      content: `This affects every tenant that relies on it.`,
      confirmText: removeText,
      cancelText: "Cancel",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        try {
          await api.remove!(getKey(row));
          toast.success(`${getLabel(row)} ${removeText.toLowerCase()}d`);
          await refresh();
        } catch (e: any) {
          toast.error(e.message ?? "Unknown error");
        }
      },
    });
  };

  const contextMenu = useCallback(
    (row: T) => {
      const groups: ContextMenuGroup[] = [];

      if (api.update) {
        groups.push({ label: "Edit", action: () => openEdit(row) });
      }

      if (api.remove && (canRemove?.(row) ?? true)) {
        groups.push({
          label: removeText,
          color: "red",
          action: () => confirmRemove(row),
        });
      }

      return groups;
    },
    [api, canRemove, removeText, fields]
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-xl">{title}</h2>
          {description && (
            <p className="text-sm text-ink-muted">{description}</p>
          )}
        </div>

        {api.create && (
          <Button text="Create New" icon={<LuListPlus />} onClick={openCreate} />
        )}
      </header>

      {error && <p className="text-sm text-status-danger">{error}</p>}

      {rows && rows.length > 0 ? (
        <Table
          columns={columns}
          data={rows}
          contextMenuGroups={contextMenu}
          onRowClick={openEdit}
          getKey={getKey}
        />
      ) : (
        rows && <p className="text-sm text-ink-muted">{emptyText}</p>
      )}
    </section>
  );
}
