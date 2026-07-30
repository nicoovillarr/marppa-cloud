"use client";

import { workerFamilyApi } from "@/hive/api/worker-family.api";
import { WorkerFamilyWithRelationsResponseDto } from "@/hive/api/worker-family.api.types";
import { workerFlavorApi } from "@/hive/api/worker-flavor.api";
import { WorkerFlavorResponseDto } from "@/hive/api/worker-flavor.api.types";
import { workerImageApi } from "@/hive/api/worker-image.api";
import { WorkerImageResponseDto } from "@/hive/api/worker-image.api.types";
import { workerStorageTypeApi } from "@/hive/api/worker-storage-type.api";
import { WorkerStorageTypeResponseDto } from "@/hive/api/worker-storage-type.api.types";
import { ColumnMapping } from "@/core/ui/Table";
import { useCallback, useEffect, useState } from "react";
import { AdminCrudSection } from "./AdminCrudSection";
import { AdminField } from "./AdminCrudForm";
import { DeprecationBadge } from "./DeprecationBadge";

const IMAGE_COLUMNS: ColumnMapping<WorkerImageResponseDto> = {
  id: { label: "#", minWidth: "60px" },
  name: { label: "Name", width: "100%", minWidth: "160px" },
  osFamily: { label: "OS family", minWidth: "120px" },
  osVersion: { label: "Version", minWidth: "100px" },
  architecture: { label: "Arch", minWidth: "90px" },
  virtualizationType: { label: "Virtualization", minWidth: "130px" },
};

const FAMILY_COLUMNS: ColumnMapping<WorkerFamilyWithRelationsResponseDto> = {
  id: { label: "#", minWidth: "60px" },
  name: { label: "Name", width: "100%", minWidth: "160px" },
  architecture: { label: "Arch", minWidth: "90px" },
  flavors: {
    label: "Flavors",
    minWidth: "90px",
    renderFn: (row: WorkerFamilyWithRelationsResponseDto) =>
      String(row.flavors?.length ?? 0),
  },
  deprecatedAt: {
    label: "State",
    minWidth: "120px",
    renderFn: (row: WorkerFamilyWithRelationsResponseDto) => (
      <DeprecationBadge deprecatedAt={row.deprecatedAt} />
    ),
  },
};

const FLAVOR_COLUMNS: ColumnMapping<WorkerFlavorResponseDto> = {
  id: { label: "#", minWidth: "60px" },
  name: { label: "Name", width: "100%", minWidth: "140px" },
  version: { label: "Rev", minWidth: "70px" },
  cpuCores: { label: "vCPU", minWidth: "80px" },
  ramMB: { label: "RAM (MB)", minWidth: "110px" },
  pricePerHourCents: { label: "¢/h", minWidth: "80px" },
  deprecatedAt: {
    label: "State",
    minWidth: "120px",
    renderFn: (row: WorkerFlavorResponseDto) => (
      <DeprecationBadge deprecatedAt={row.deprecatedAt} />
    ),
  },
};

const STORAGE_TYPE_COLUMNS: ColumnMapping<WorkerStorageTypeResponseDto> = {
  id: { label: "#", minWidth: "60px" },
  name: { label: "Name", width: "100%", minWidth: "160px" },
  persistent: {
    label: "Persistent",
    minWidth: "110px",
    renderFn: (row: WorkerStorageTypeResponseDto) => String(row.persistent),
  },
  attachable: {
    label: "Attachable",
    minWidth: "110px",
    renderFn: (row: WorkerStorageTypeResponseDto) => String(row.attachable),
  },
  shared: {
    label: "Shared",
    minWidth: "90px",
    renderFn: (row: WorkerStorageTypeResponseDto) => String(row.shared),
  },
};

const STORAGE_TYPE_FIELDS: AdminField[] = [
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description" },
  { name: "persistent", label: "Persistent", type: "checkbox" },
  { name: "attachable", label: "Attachable", type: "checkbox" },
  { name: "shared", label: "Shared", type: "checkbox" },
];

export function HiveCatalogAdmin() {
  const [storageTypes, setStorageTypes] = useState<
    WorkerStorageTypeResponseDto[]
  >([]);
  const [families, setFamilies] = useState<
    WorkerFamilyWithRelationsResponseDto[]
  >([]);

  const loadReferences = useCallback(async () => {
    const [types, loadedFamilies] = await Promise.all([
      workerStorageTypeApi.findAll(),
      workerFamilyApi.findAll(),
    ]);

    setStorageTypes(types);
    setFamilies(loadedFamilies);
  }, []);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  const imageFields: AdminField[] = [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description" },
    { name: "osType", label: "OS type", required: true, placeholder: "linux" },
    {
      name: "osFamily",
      label: "OS family",
      required: true,
      placeholder: "debian",
    },
    { name: "osVersion", label: "OS version", placeholder: "12" },
    {
      name: "imageUrl",
      label: "Image URL",
      required: true,
      placeholder: "https://cloud.debian.org/…/debian-12-generic-amd64.qcow2",
    },
    {
      name: "architecture",
      label: "Architecture",
      required: true,
      placeholder: "x86_64",
    },
    {
      name: "virtualizationType",
      label: "Virtualization",
      required: true,
      placeholder: "hvm",
    },
    {
      name: "workerStorageTypeId",
      label: "Storage type",
      type: "select",
      options: storageTypes.map((type) => ({
        value: type.id,
        displayText: type.name,
      })),
    },
  ];

  const familyFields: AdminField[] = [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description" },
    {
      name: "architecture",
      label: "Architecture",
      required: true,
      placeholder: "x86_64",
    },
  ];

  const flavorFields: AdminField[] = [
    { name: "name", label: "Name", required: true, omitOnEdit: true },
    {
      name: "familyId",
      label: "Family",
      type: "select",
      required: true,
      omitOnEdit: true,
      options: families.map((family) => ({
        value: family.id,
        displayText: family.name,
      })),
    },
    { name: "cpuCores", label: "vCPU", type: "number", required: true },
    { name: "ramMB", label: "RAM (MB)", type: "number", required: true },
    {
      name: "pricePerHourCents",
      label: "Price per hour (cents)",
      type: "number",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <AdminCrudSection<WorkerImageResponseDto, number>
        title="Worker image"
        description="Base disk images a worker can boot from."
        columns={IMAGE_COLUMNS}
        fields={imageFields}
        getKey={(row) => row.id}
        getLabel={(row) => row.name}
        api={{
          list: workerImageApi.listImages,
          create: workerImageApi.create,
          update: workerImageApi.update,
          remove: workerImageApi.delete,
        }}
      />

      <AdminCrudSection<WorkerFamilyWithRelationsResponseDto, number>
        title="Worker family"
        description="Groups flavors that share an architecture."
        columns={FAMILY_COLUMNS}
        fields={familyFields}
        getKey={(row) => row.id}
        getLabel={(row) => row.name}
        removeText="Deprecate"
        canRemove={(row) => row.deprecatedAt == null}
        onChanged={loadReferences}
        api={{
          list: workerFamilyApi.findAll,
          create: workerFamilyApi.create,
          update: workerFamilyApi.update,
          remove: workerFamilyApi.deprecate,
        }}
      />

      <AdminCrudSection<WorkerFlavorResponseDto, number>
        title="Worker flavor"
        description="Editing a flavor publishes a new revision and deprecates the current one."
        columns={FLAVOR_COLUMNS}
        fields={flavorFields}
        getKey={(row) => row.id}
        getLabel={(row) => `${row.name} v${row.version}`}
        removeText="Deprecate"
        canRemove={(row) => row.deprecatedAt == null}
        api={{
          list: workerFlavorApi.findAll,
          create: workerFlavorApi.create,
          update: workerFlavorApi.revise,
          remove: workerFlavorApi.deprecate,
        }}
      />

      <AdminCrudSection<WorkerStorageTypeResponseDto, number>
        title="Storage type"
        description="Disk classes a worker image or volume can be backed by."
        columns={STORAGE_TYPE_COLUMNS}
        fields={STORAGE_TYPE_FIELDS}
        getKey={(row) => row.id}
        getLabel={(row) => row.name}
        onChanged={loadReferences}
        api={{
          list: workerStorageTypeApi.findAll,
          create: workerStorageTypeApi.create,
          update: workerStorageTypeApi.update,
          remove: workerStorageTypeApi.delete,
        }}
      />
    </div>
  );
}
