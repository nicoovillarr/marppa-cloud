"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { Button } from "@/core/ui/Button";
import { InlineCode } from "@/core/ui/InlineCode";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { WorkerWithRelationsResponseDto } from "../api/worker.api.types";
import { useWorker } from "../models/use-worker";

interface WorkerManageDialogProps {
  worker: WorkerWithRelationsResponseDto;
  onChanged?: () => void;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="text-right break-all">{value}</span>
  </div>
);

export function WorkerManageDialog({
  worker,
  onChanged,
}: WorkerManageDialogProps) {
  const { startWorker, terminateWorker, deleteWorker } = useWorker();
  const [busy, setBusy] = useState(false);

  const isOff = worker.status === ResourceStatus.INACTIVE;
  const isRunning = worker.status === ResourceStatus.ACTIVE;

  const run = async (
    action: () => Promise<boolean>,
    queued: string,
    failed: string,
  ) => {
    setBusy(true);
    const ok = await action();
    setBusy(false);

    if (ok) {
      toast.success(queued);
      closeCurrentDialog();
      onChanged?.();
    } else {
      toast.error(failed);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-1 rounded border border-gray-200 dark:border-gray-700 p-3">
        <InfoRow label="Name" value={worker.name} />
        <InfoRow label="Status" value={worker.status} />
        <InfoRow label="MAC address" value={worker.macAddress} />
        <InfoRow label="Instance type" value={worker.flavor?.name ?? "—"} />
        <InfoRow label="IP address" value={worker.node?.ipAddress ?? "not assigned"} />
      </section>

      <section className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Button
            text="Start"
            disabled={busy || !isOff}
            onClick={() =>
              run(
                () => startWorker(worker.id),
                `Start of ${worker.name} queued`,
                `Failed to start ${worker.name}`,
              )
            }
          />
          <Button
            text="Stop"
            style="secondary"
            disabled={busy || !isRunning}
            onClick={() =>
              run(
                () => terminateWorker(worker.id),
                `Stop of ${worker.name} queued`,
                `Failed to stop ${worker.name}`,
              )
            }
          />
          <Button
            text="Delete"
            style="danger"
            disabled={busy || !isOff}
            onClick={() =>
              run(
                () => deleteWorker(worker.id),
                `Deletion of ${worker.name} queued`,
                `Failed to delete ${worker.name}`,
              )
            }
          />
        </div>

        {!isOff && !isRunning && (
          <p className="text-xs text-gray-500">
            <InlineCode code={worker.status} /> is a transient state — actions
            become available once it settles.
          </p>
        )}

        {isRunning && (
          <p className="text-xs text-gray-500">
            Stop it first to delete it.
          </p>
        )}
      </section>
    </div>
  );
}
