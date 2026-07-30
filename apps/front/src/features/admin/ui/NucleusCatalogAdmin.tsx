"use client";

import { atomImageApi } from "@/nucleus/api/atom-image.api";
import { AtomImageResponseDto } from "@/nucleus/api/atom-image.api.types";
import { atomSizeApi } from "@/nucleus/api/atom-size.api";
import { AtomSizeResponseDto } from "@/nucleus/api/atom-size.api.types";
import { ColumnMapping } from "@/core/ui/Table";
import { useCallback, useEffect, useState } from "react";
import { AdminCrudSection } from "./AdminCrudSection";
import { AdminField } from "./AdminCrudForm";
import { DeprecationBadge } from "./DeprecationBadge";

const IMAGE_COLUMNS: ColumnMapping<AtomImageResponseDto> = {
  id: { label: "#", minWidth: "60px" },
  name: { label: "Name", width: "100%", minWidth: "160px" },
  reference: {
    label: "Reference",
    minWidth: "260px",
    canCopy: true,
    renderFn: (row: AtomImageResponseDto) =>
      `${row.registry}/${row.repository}:${row.tag}`,
  },
  architecture: { label: "Arch", minWidth: "90px" },
  capabilities: {
    label: "Capabilities",
    minWidth: "140px",
    renderFn: (row: AtomImageResponseDto) =>
      row.capabilities?.join(", ") || "—",
  },
};

const SIZE_COLUMNS: ColumnMapping<AtomSizeResponseDto> = {
  id: { label: "#", minWidth: "60px" },
  name: { label: "Name", width: "100%", minWidth: "140px" },
  version: { label: "Rev", minWidth: "70px" },
  cpuCores: { label: "vCPU", minWidth: "80px" },
  ramMB: { label: "RAM (MB)", minWidth: "110px" },
  pricePerHourCents: { label: "¢/h", minWidth: "80px" },
  deprecatedAt: {
    label: "State",
    minWidth: "120px",
    renderFn: (row: AtomSizeResponseDto) => (
      <DeprecationBadge deprecatedAt={row.deprecatedAt} />
    ),
  },
};

const SIZE_FIELDS: AdminField[] = [
  { name: "name", label: "Name", required: true, omitOnEdit: true },
  { name: "cpuCores", label: "vCPU", type: "number", required: true },
  { name: "ramMB", label: "RAM (MB)", type: "number", required: true },
  {
    name: "pricePerHourCents",
    label: "Price per hour (cents)",
    type: "number",
  },
];

export function NucleusCatalogAdmin() {
  const [sizes, setSizes] = useState<AtomSizeResponseDto[]>([]);

  const loadSizes = useCallback(async () => {
    setSizes(await atomSizeApi.listSizes());
  }, []);

  useEffect(() => {
    loadSizes();
  }, [loadSizes]);

  const imageFields: AdminField[] = [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description" },
    {
      name: "registry",
      label: "Registry",
      placeholder: "docker.io",
    },
    {
      name: "repository",
      label: "Repository",
      required: true,
      placeholder: "library/redis",
    },
    { name: "tag", label: "Tag", required: true, placeholder: "7-alpine" },
    { name: "digest", label: "Digest", placeholder: "sha256:…" },
    { name: "architecture", label: "Architecture", placeholder: "amd64" },
    {
      name: "defaultSizeId",
      label: "Default size",
      type: "select",
      required: true,
      options: sizes
        .filter((size) => size.deprecatedAt == null)
        .map((size) => ({
          value: size.id,
          displayText: `${size.name} v${size.version}`,
        })),
    },
    {
      name: "capabilities",
      label: "Capabilities",
      type: "stringList",
      placeholder: "NET_ADMIN",
      tooltip: "One Linux capability per line",
    },
    {
      name: "sysctls",
      label: "Sysctls",
      type: "keyValue",
      placeholder: "net.ipv4.ip_forward=1",
      tooltip: "One key=value per line",
    },
    {
      name: "command",
      label: "Command",
      type: "stringList",
      placeholder: "sleep\ninfinity",
      tooltip: "One argument per line",
    },
    {
      name: "requiredEnvVars",
      label: "Required env vars",
      type: "stringList",
      placeholder: "POSTGRES_PASSWORD",
      tooltip: "One variable name per line",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <AdminCrudSection<AtomImageResponseDto, number>
        title="Atom image"
        description="Container images an atom is allowed to run."
        columns={IMAGE_COLUMNS}
        fields={imageFields}
        getKey={(row) => row.id}
        getLabel={(row) => row.name}
        api={{
          list: atomImageApi.listImages,
          create: atomImageApi.create,
          update: atomImageApi.update,
          remove: atomImageApi.delete,
        }}
      />

      <AdminCrudSection<AtomSizeResponseDto, number>
        title="Atom size"
        description="Editing a size publishes a new revision and deprecates the current one."
        columns={SIZE_COLUMNS}
        fields={SIZE_FIELDS}
        getKey={(row) => row.id}
        getLabel={(row) => `${row.name} v${row.version}`}
        removeText="Deprecate"
        canRemove={(row) => row.deprecatedAt == null}
        onChanged={loadSizes}
        api={{
          list: atomSizeApi.listSizes,
          create: atomSizeApi.create,
          update: atomSizeApi.revise,
          remove: atomSizeApi.deprecate,
        }}
      />
    </div>
  );
}
