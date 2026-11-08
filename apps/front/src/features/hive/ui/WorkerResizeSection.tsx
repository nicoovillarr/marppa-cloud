"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { Select } from "@/core/ui/inputs/Select";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { WorkerWithRelationsResponseDto } from "../api/worker.api.types";
import { useWorker } from "../models/use-worker";
import { useWorkerFamily } from "../models/use-worker-family";

interface WorkerResizeSectionProps {
  worker: WorkerWithRelationsResponseDto;
  editable: boolean;
  onChanged?: () => void;
}

export function WorkerResizeSection({
  worker,
  editable,
  onChanged,
}: WorkerResizeSectionProps) {
  const { resizeWorker } = useWorker();
  const { families, isLoading, fetchFamilies } = useWorkerFamily();
  const [flavorId, setFlavorId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const architecture = families.find(
    (family) => family.id === worker.flavor?.familyId,
  )?.architecture;

  const options = useMemo(
    () =>
      families
        .filter(
          (family) =>
            family.deprecatedAt == null &&
            (architecture == null || family.architecture === architecture),
        )
        .flatMap((family) =>
          family.flavors
            .filter(
              (flavor) =>
                flavor.deprecatedAt == null && flavor.id !== worker.flavorId,
            )
            .map((flavor) => ({
              value: flavor.id,
              displayText: `${family.name}.${flavor.name} — ${flavor.cpuCores} vCPU · ${flavor.ramMB} MB`,
            })),
        ),
    [families, architecture, worker.flavorId],
  );

  const resize = async () => {
    if (flavorId == null) return;

    setBusy(true);
    const failureReason = await resizeWorker(worker.id, flavorId);
    setBusy(false);

    if (failureReason == null) {
      toast.success(`Resize of ${worker.name} queued`);
      closeCurrentDialog();
      onChanged?.();
    } else {
      toast.error(`Failed to resize ${worker.name}`, {
        description: failureReason,
      });
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Size</h3>

      <p className="text-sm">
        {worker.flavor?.name ?? "—"} — {worker.cpuCores} vCPU ·{" "}
        {worker.ramMB} MB
      </p>

      {options.length === 0 && !isLoading ? (
        <p className="text-sm text-ink-muted">
          No other instance type is available for this worker.
        </p>
      ) : (
        <>
          <Select
            options={options}
            placeholder="Select an instance type"
            isLoading={isLoading}
            disabled={!editable}
            onChangedValue={(value: string | number | null) =>
              setFlavorId(value == null ? null : Number(value))
            }
          />
          <Button
            text="Resize"
            disabled={busy || !editable || flavorId == null}
            onClick={resize}
          />
        </>
      )}

      <p className="text-xs text-ink-muted">
        {editable
          ? "Changes vCPU and memory; disks and volumes are kept. The new size applies on the next start."
          : "Stop it first to change its size."}
      </p>
    </section>
  );
}
