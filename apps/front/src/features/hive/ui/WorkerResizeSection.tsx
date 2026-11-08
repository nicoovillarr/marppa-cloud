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
  const [flavorId, setFlavorId] = useState<number>(worker.flavorId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const architecture = families.find(
    (family) => family.id === worker.flavor?.familyId,
  )?.architecture;

  const options = useMemo(() => {
    const available = families
      .filter(
        (family) =>
          family.deprecatedAt == null &&
          (architecture == null || family.architecture === architecture),
      )
      .flatMap((family) =>
        family.flavors
          .filter(
            (flavor) =>
              flavor.deprecatedAt == null || flavor.id === worker.flavorId,
          )
          .map((flavor) => ({
            value: flavor.id,
            displayText: `${family.name}.${flavor.name} — ${flavor.cpuCores} vCPU · ${flavor.ramMB} MB`,
          })),
      );

    if (available.some((option) => option.value === worker.flavorId)) {
      return available;
    }

    return [
      {
        value: worker.flavorId,
        displayText: `${worker.flavor?.name ?? "current"} — ${worker.cpuCores} vCPU · ${worker.ramMB} MB`,
      },
      ...available,
    ];
  }, [families, architecture, worker]);

  const hasChanged = flavorId !== worker.flavorId;

  const resize = async () => {
    if (!hasChanged) return;

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

      <Select
        options={options}
        defaultValue={worker.flavorId}
        isLoading={isLoading}
        disabled={!editable}
        onChangedValue={(value: string | number | null) =>
          setFlavorId(value == null ? worker.flavorId : Number(value))
        }
      />
      <Button
        text="Resize"
        disabled={busy || !editable || !hasChanged}
        onClick={resize}
      />

      <p className="text-xs text-ink-muted">
        {editable
          ? "Changes vCPU and memory; disks and volumes are kept. The new size applies on the next start."
          : "Stop it first to change its size."}
      </p>
    </section>
  );
}
