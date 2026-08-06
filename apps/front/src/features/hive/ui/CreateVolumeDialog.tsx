"use client";

import { useEffect, useState } from "react";
import { Button } from "@/core/ui/Button";
import { InlineCode } from "@/core/ui/InlineCode";
import { Input } from "@/core/ui/inputs/Input";
import { Select } from "@/core/ui/inputs/Select";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { workerStorageTypeApi } from "../api/worker-storage-type.api";
import { WorkerStorageTypeResponseDto } from "../api/worker-storage-type.api.types";
import { useWorkerDisk } from "../models/use-worker-disk";
import {
  MAX_WORKER_VOLUME_GB,
  MIN_WORKER_VOLUME_GB,
  WORKER_VOLUME_MOUNT_POINT,
  isReservedMountPoint,
} from "../models/worker-volume";

interface CreateVolumeDialogProps {
  onCreated?: () => void;
}

const mountPointError = (mountPoint: string): string | null => {
  if (!WORKER_VOLUME_MOUNT_POINT.test(mountPoint)) {
    return "Use an absolute path, e.g. /mnt/data";
  }

  if (isReservedMountPoint(mountPoint)) {
    return "That path belongs to the guest OS and would shadow it on boot";
  }

  return null;
};

export function CreateVolumeDialog({ onCreated }: CreateVolumeDialogProps) {
  const { createDisk, busy } = useWorkerDisk();

  const [storageTypes, setStorageTypes] = useState<
    WorkerStorageTypeResponseDto[]
  >([]);
  const [storageTypeId, setStorageTypeId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [sizeGiB, setSizeGiB] = useState(String(MIN_WORKER_VOLUME_GB * 10));
  const [mountPoint, setMountPoint] = useState("/mnt/data");

  useEffect(() => {
    workerStorageTypeApi.findAll().then((types) => {
      const attachable = types.filter((type) => type.attachable);
      setStorageTypes(attachable);
      setStorageTypeId(attachable[0]?.id ?? null);
    });
  }, []);

  const size = Number(sizeGiB);
  const sizeIsValid =
    Number.isInteger(size) &&
    size >= MIN_WORKER_VOLUME_GB &&
    size <= MAX_WORKER_VOLUME_GB;
  const pathError = mountPointError(mountPoint);

  const canSubmit =
    !busy &&
    name.trim().length > 0 &&
    sizeIsValid &&
    pathError === null &&
    storageTypeId !== null;

  const submit = async () => {
    const created = await createDisk({
      name: name.trim(),
      sizeGiB: size,
      storageTypeId: storageTypeId!,
      mountPoint,
    });

    if (created) {
      closeCurrentDialog();
      onCreated?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm text-ink-muted">Name</label>
        <Input
          value={name}
          placeholder="e.g. postgres-data"
          onChangedValue={setName}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-muted">Size (GiB)</label>
        <Input type="number" value={sizeGiB} onChangedValue={setSizeGiB} />
        {!sizeIsValid && (
          <p className="text-xs text-status-danger">
            Whole number between {MIN_WORKER_VOLUME_GB} and{" "}
            {MAX_WORKER_VOLUME_GB}.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-muted">Mount point</label>
        <Input value={mountPoint} onChangedValue={setMountPoint} />
        {pathError ? (
          <p className="text-xs text-status-danger">{pathError}</p>
        ) : (
          <p className="text-xs text-ink-muted">
            Where the volume appears inside the worker, via{" "}
            <InlineCode code="/etc/fstab" />.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-muted">Storage type</label>
        <Select
          options={storageTypes.map((type) => ({
            value: type.id,
            displayText: type.name,
          }))}
          defaultValue={storageTypeId ?? undefined}
          isLoading={storageTypes.length === 0}
          onChangedValue={(value) => setStorageTypeId(Number(value))}
        />
      </div>

      <p className="text-xs text-ink-muted">
        The volume is created detached. Attach it to a stopped worker afterwards.
      </p>

      <Button text="Create volume" disabled={!canSubmit} onClick={submit} />
    </div>
  );
}
