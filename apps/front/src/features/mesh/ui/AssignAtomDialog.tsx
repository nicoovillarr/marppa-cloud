"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { Select } from "@/core/ui/inputs/Select";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useAtom } from "@/nucleus/models/use-atom";
import { useNode } from "../models/use-node";

export function AssignAtomDialog({
  zoneId,
  onAssigned,
}: {
  zoneId: string;
  onAssigned?: () => void;
}) {
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { atoms, fetchAtoms, isLoading } = useAtom();
  const { createNode } = useNode();

  // Only stopped atoms that are not already present in a zone can be assigned.
  const availableAtoms = useMemo(
    () =>
      atoms.filter((a) => a.status === ResourceStatus.INACTIVE && !a.node),
    [atoms],
  );

  const onAssign = async () => {
    if (!selectedAtomId) {
      toast.error("Select an atom to assign");
      return;
    }

    setIsSubmitting(true);
    const node = await createNode(zoneId, { atomId: selectedAtomId });
    setIsSubmitting(false);

    if (node) {
      toast.success("Atom assigned to the zone");
      closeCurrentDialog();
      onAssigned?.();
    } else {
      toast.error("Failed to assign atom");
    }
  };

  useEffect(() => {
    fetchAtoms();
  }, []);

  return (
    <div className="space-y-4 min-w-80">
      {availableAtoms.length > 0 ? (
        <Select
          options={availableAtoms.map((a) => ({
            value: a.id,
            displayText: `${a.name} (${a.id})`,
          }))}
          placeholder="Select an atom"
          isLoading={isLoading}
          onChangedValue={(value: any) => setSelectedAtomId(value)}
        />
      ) : (
        <p className="text-sm text-gray-500">
          No assignable atoms found. An atom must be stopped (INACTIVE) and not
          already assigned to a zone.
        </p>
      )}

      <p className="text-xs text-gray-500">
        This only reserves the IP — the container is attached to the zone bridge
        when the atom starts. Publish a port with a fiber on the resulting node.
      </p>

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
