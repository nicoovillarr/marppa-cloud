"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { Select } from "@/core/ui/inputs/Select";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useWorker } from "@/hive/models/use-worker";
import { useNode } from "../models/use-node";

export function AssignWorkerDialog({
  zoneId,
  onAssigned,
}: {
  zoneId: string;
  onAssigned?: () => void;
}) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { workers, fetchWorkers, isLoading } = useWorker();
  const { createNode } = useNode();

  // Only stopped workers that are not already present in a zone can be assigned.
  const availableWorkers = useMemo(
    () =>
      workers.filter(
        (w) => w.status === ResourceStatus.INACTIVE && !w.node,
      ),
    [workers],
  );

  const onAssign = async () => {
    if (!selectedWorkerId) {
      toast.error("Select a worker to assign");
      return;
    }

    setIsSubmitting(true);
    const node = await createNode(zoneId, { workerId: selectedWorkerId });
    setIsSubmitting(false);

    if (node) {
      toast.success("Worker assignment queued");
      closeCurrentDialog();
      onAssigned?.();
    } else {
      toast.error("Failed to assign worker");
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  return (
    <div className="space-y-4 min-w-80">
      {availableWorkers.length > 0 ? (
        <Select
          options={availableWorkers.map((w) => ({
            value: w.id,
            displayText: `${w.name} (${w.id})`,
          }))}
          placeholder="Select a worker"
          isLoading={isLoading}
          onChangedValue={(value: any) => setSelectedWorkerId(value)}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          No assignable workers found. A worker must be stopped (INACTIVE) and
          not already assigned to a zone.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          text={isSubmitting ? "Assigning..." : "Assign"}
          onClick={onAssign}
        />
      </div>
    </div>
  );
}
