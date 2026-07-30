"use client";

import { ColumnMapping, Table } from "@/core/ui/Table";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { Select } from "@/core/ui/inputs/Select";
import ReactTimeAgo from "react-timeago";
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/admin.api";
import {
  AdminResourceResponseDto,
  AdminResourceType,
} from "../api/admin.api.types";

const COLUMNS: ColumnMapping<AdminResourceResponseDto> = {
  id: { label: "#", minWidth: "140px", canCopy: true },
  type: { label: "Type", minWidth: "100px" },
  name: { label: "Name", width: "100%", minWidth: "180px" },
  status: {
    label: "Status",
    minWidth: "150px",
    renderFn: (row: AdminResourceResponseDto) => (
      <StatusBadge status={row.status} />
    ),
  },
  companyName: { label: "Company", minWidth: "180px" },
  createdAt: {
    label: "Created",
    minWidth: "160px",
    renderFn: (row: AdminResourceResponseDto) => (
      <ReactTimeAgo date={new Date(row.createdAt)} />
    ),
  },
};

const TYPE_OPTIONS = [
  { value: "Worker", displayText: "Workers" },
  { value: "Atom", displayText: "Atoms" },
  { value: "Zone", displayText: "Zones" },
  { value: "Portal", displayText: "Portals" },
];

export function ResourcesAdmin() {
  const [resources, setResources] = useState<AdminResourceResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<AdminResourceType | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .findResources()
      .then(setResources)
      .catch((e) => setError(e.message ?? "Unknown error"));
  }, []);

  const companyOptions = useMemo(
    () =>
      Array.from(
        new Map(
          resources.map((resource) => [resource.companyId, resource.companyName])
        )
      ).map(([value, displayText]) => ({ value, displayText })),
    [resources]
  );

  const filtered = useMemo(
    () =>
      resources.filter(
        (resource) =>
          (!typeFilter || resource.type === typeFilter) &&
          (!companyFilter || resource.companyId === companyFilter)
      ),
    [resources, typeFilter, companyFilter]
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-bold text-xl">Resources</h2>
        <p className="text-sm text-ink-muted">
          Every worker, atom, zone and portal on the platform, read-only.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          className="w-full sm:w-56"
          placeholder="All types"
          clearText="All types"
          options={TYPE_OPTIONS}
          onChangedValue={setTypeFilter}
        />
        <Select
          className="w-full sm:w-64"
          placeholder="All companies"
          clearText="All companies"
          options={companyOptions}
          onChangedValue={setCompanyFilter}
        />
      </div>

      {error && <p className="text-sm text-status-danger">{error}</p>}

      {filtered.length > 0 ? (
        <Table
          columns={COLUMNS}
          data={filtered}
          getKey={(row: AdminResourceResponseDto) => `${row.type}:${row.id}`}
        />
      ) : (
        <p className="text-sm text-ink-muted">No resources match the filter.</p>
      )}
    </section>
  );
}
