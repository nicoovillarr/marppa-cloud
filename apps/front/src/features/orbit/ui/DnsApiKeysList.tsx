"use client";

import { useCallback, useEffect, useMemo } from "react";
import { LuListPlus } from "react-icons/lu";
import { toast } from "sonner";
import { useVisibleCompanies } from "@/company/models/use-visible-companies";
import { Button } from "@/core/ui/Button";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { useDialog } from "@/core/ui/DialogProvider";
import { DnsApiKeyResponseDto } from "../api/dns-api-key.api.types";
import { useDnsApiKey } from "../models/use-dns-api-key";
import { usePortal } from "../models/use-portal";
import { formatPortalType } from "../models/format-portal-type";
import { DnsApiKeyDialog } from "./DnsApiKeyDialog";

const COLUMNS: ColumnMapping<DnsApiKeyResponseDto> = {
  name: {
    label: "Name",
    width: "100%",
    minWidth: "200px",
    renderFn: (value: DnsApiKeyResponseDto) => (
      <div className="min-w-0">
        <p className="truncate">{value.name}</p>
        {value.description && (
          <p className="text-xs text-ink-muted truncate">{value.description}</p>
        )}
      </div>
    ),
  },
  type: {
    label: "Provider",
    minWidth: "150px",
    renderFn: (value: DnsApiKeyResponseDto) => formatPortalType(value.type),
  },
  portalCount: {
    label: "Portals",
    minWidth: "100px",
  },
  updatedAt: {
    label: "Updated",
    minWidth: "150px",
    renderFn: (value: DnsApiKeyResponseDto) =>
      new Date(value.updatedAt).toLocaleDateString(),
  },
};

export function DnsApiKeysList() {
  const { nameOf, hasMoreThanOne } = useVisibleCompanies();
  const { showDialog } = useDialog();
  const { portalTypes, fetchPortalTypes } = usePortal();
  const { dnsApiKeys, fetchDnsApiKeys, deleteDnsApiKey } = useDnsApiKey();

  const columns = useMemo(
    () =>
      hasMoreThanOne
        ? {
            ...COLUMNS,
            ownerId: {
              label: "Company",
              minWidth: "160px",
              renderFn: (row: DnsApiKeyResponseDto) => nameOf(row.ownerId),
            },
          }
        : COLUMNS,
    [hasMoreThanOne, nameOf]
  );

  useEffect(() => {
    fetchPortalTypes();
    fetchDnsApiKeys();
  }, []);

  const openCreate = () =>
    showDialog({
      title: "Add API key",
      content: (
        <DnsApiKeyDialog
          portalTypes={portalTypes}
          onSaved={() => toast.success("API key added")}
        />
      ),
    });

  const openEdit = (key: DnsApiKeyResponseDto) =>
    showDialog({
      title: key.name,
      content: (
        <DnsApiKeyDialog
          dnsApiKey={key}
          portalTypes={portalTypes}
          onSaved={() => toast.success("API key updated")}
        />
      ),
    });

  const confirmDelete = (key: DnsApiKeyResponseDto) =>
    showDialog({
      type: "confirm",
      title: "Delete API key",
      description: `Delete ${key.name}? Only keys that no portal uses can be deleted.`,
      confirmText: "Delete",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        if (await deleteDnsApiKey(key.id)) {
          toast.success("API key deleted");
        }
      },
    });

  const contextMenuGroups = useCallback(
    (key: DnsApiKeyResponseDto) => [
      { label: "Edit", action: () => openEdit(key) },
      ...(key.portalCount === 0
        ? [{ label: "Delete", color: "red", action: () => confirmDelete(key) }]
        : []),
    ],
    [portalTypes]
  );

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Dynamic DNS API Keys
        </h2>
        <Button
          text="Add API Key"
          icon={<LuListPlus />}
          disabled={portalTypes.length === 0}
          onClick={openCreate}
        />
      </header>

      {dnsApiKeys && dnsApiKeys.length > 0 ? (
        <Table
          columns={columns}
          data={dnsApiKeys}
          contextMenuGroups={contextMenuGroups}
          onRowClick={(row: DnsApiKeyResponseDto) => openEdit(row)}
          getKey={(row: DnsApiKeyResponseDto) => row.id}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          No API keys yet. Add one here or while creating a portal, then reuse it across portals.
        </p>
      )}
    </section>
  );
}
