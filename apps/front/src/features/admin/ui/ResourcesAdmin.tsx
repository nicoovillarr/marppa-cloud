"use client";

import { Button } from "@/core/ui/Button";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { Select } from "@/core/ui/inputs/Select";
import ReactTimeAgo from "react-timeago";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/admin.api";
import {
  AdminCompanyResponseDto,
  AdminResourceResponseDto,
  AdminResourceType,
} from "../api/admin.api.types";

const PAGE_SIZE = 50;

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
  const [companies, setCompanies] = useState<AdminCompanyResponseDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<AdminResourceType | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setError(null);

    try {
      const result = await adminApi.findResources({
        page,
        pageSize: PAGE_SIZE,
        type: type ?? undefined,
        companyId: companyId ?? undefined,
      });

      setResources(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
      setResources([]);
      setTotal(0);
    }
  }, [page, type, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi.findCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

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
          onChangedValue={(value) => changeFilter(() => setType(value))}
        />
        <Select
          className="w-full sm:w-64"
          placeholder="All companies"
          clearText="All companies"
          options={companies.map((company) => ({
            value: company.id,
            displayText: company.name,
          }))}
          onChangedValue={(value) => changeFilter(() => setCompanyId(value))}
        />
      </div>

      {error && <p className="text-sm text-status-danger">{error}</p>}

      {resources.length > 0 ? (
        <Table
          columns={COLUMNS}
          data={resources}
          getKey={(row: AdminResourceResponseDto) => `${row.type}:${row.id}`}
        />
      ) : (
        <p className="text-sm text-ink-muted">No resources match the filter.</p>
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
