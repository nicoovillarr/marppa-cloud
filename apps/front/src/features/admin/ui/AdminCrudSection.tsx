"use client";

import { Button } from "@/core/ui/Button";
import { useDialog } from "@/core/ui/DialogProvider";
import { ContextMenuGroup } from "@/core/ui/ContextMenu";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { useCallback, useEffect, useState } from "react";
import { LuListPlus, LuRefreshCw } from "react-icons/lu";
import { toast } from "sonner";
import { AdminCrudForm, AdminField, encodeFieldValue } from "./AdminCrudForm";
import { ConfirmByNameForm } from "./ConfirmByNameForm";

export interface AdminPage<T> {
  items: T[];
  total: number;
}

export interface AdminCrudApi<T, K> {
  list: (page: number, pageSize: number) => Promise<T[] | AdminPage<T>>;
  create?: (data: any) => Promise<unknown>;
  update?: (id: K, data: any) => Promise<unknown>;
  remove?: (id: K) => Promise<void>;
  restore?: (id: K) => Promise<void>;
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
  canRestore?: (row: T) => boolean;
  confirmRemoveByName?: boolean;
  removeWarning?: string;
  emptyText?: string;
  pageSize?: number;
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
  canRestore,
  confirmRemoveByName = false,
  removeWarning = "This affects every tenant that relies on it.",
  emptyText = "Nothing here yet.",
  pageSize = 50,
  onChanged,
}: AdminCrudSectionProps<T, K>) {
  const { showDialog, closeDialog } = useDialog();

  const [rows, setRows] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (target: number) => {
      setError(null);

      try {
        const result = await api.list(target, pageSize);

        if (Array.isArray(result)) {
          setRows(result);
          setTotal(result.length);
          return;
        }

        setRows(result.items);
        setTotal(result.total);
      } catch (e: any) {
        setError(e.message ?? "Unknown error");
        setRows([]);
        setTotal(0);
      }
    },
    [api, pageSize]
  );

  useEffect(() => {
    load(page);
  }, [page]);

  const refresh = async () => {
    await load(page);
    onChanged?.();
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

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

  const remove = async (row: T) => {
    try {
      await api.remove!(getKey(row));
      toast.success(`${getLabel(row)} ${removeText.toLowerCase()}d`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Unknown error");
      throw e;
    }
  };

  const confirmRemove = (row: T) => {
    if (confirmRemoveByName) {
      showDialog({
        title: `${removeText} ${getLabel(row)}`,
        content: (
          <ConfirmByNameForm
            expected={getLabel(row)}
            actionText={removeText}
            warning={removeWarning}
            onConfirm={async () => {
              await remove(row);
              closeDialog();
            }}
          />
        ),
      });
      return;
    }

    showDialog({
      type: "confirm",
      title: `${removeText} ${getLabel(row)}?`,
      content: removeWarning,
      confirmText: removeText,
      cancelText: "Cancel",
      confirmButtonStyle: "danger",
      onConfirm: () => remove(row).catch(() => undefined),
    });
  };

  const restore = async (row: T) => {
    try {
      await api.restore!(getKey(row));
      toast.success(`${getLabel(row)} restored`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Unknown error");
    }
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

      if (api.restore && (canRestore?.(row) ?? false)) {
        groups.push({ label: "Restore", action: () => restore(row) });
      }

      return groups;
    },
    [api, canRemove, canRestore, removeText, fields]
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

        <div className="flex shrink-0 items-center gap-2">
          <Button
            style="secondary"
            text="Refresh"
            icon={<LuRefreshCw />}
            onClick={refresh}
          />

          {api.create && (
            <Button
              text="Create New"
              icon={<LuListPlus />}
              onClick={openCreate}
            />
          )}
        </div>
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

      {pageCount > 1 && (
        <footer className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            Page {page} of {pageCount} · {total} total
          </p>

          <div className="flex items-center gap-2">
            <Button
              style="secondary"
              text="Previous"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            />
            <Button
              style="secondary"
              text="Next"
              disabled={page >= pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            />
          </div>
        </footer>
      )}
    </section>
  );
}
