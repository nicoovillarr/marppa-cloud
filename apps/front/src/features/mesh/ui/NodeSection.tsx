"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { Select } from "@/core/ui/inputs/Select";
import { useDialog } from "@/core/ui/DialogProvider";
import { NodeResponseDto, CreateNodeDto } from "../api/node.api.types";
import { useNode } from "../models/use-node";
import { useZone } from "../models/use-zone";
import { FibersDialog } from "./FibersDialog";

interface NodeSectionProps {
  node: NodeResponseDto | null;
  target: CreateNodeDto;
  editable: boolean;
  onChanged?: () => void;
}

export function NodeSection({
  node,
  target,
  editable,
  onChanged,
}: NodeSectionProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { zones, fetchZones, isLoading } = useZone();
  const { createNode, deleteNode } = useNode();
  const { showDialog } = useDialog();

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const attachedZoneName =
    zones.find((zone) => zone.id === node?.zoneId)?.name ?? node?.zoneId ?? "";

  const attach = async () => {
    if (!selectedZoneId) {
      toast.error("Select a zone");
      return;
    }

    setBusy(true);
    const created = await createNode(selectedZoneId, target);
    setBusy(false);

    if (created) {
      toast.success("Zone assignment queued");
      onChanged?.();
    } else {
      toast.error("Failed to assign it to the zone");
    }
  };

  const detach = async () => {
    if (!node) return;

    setBusy(true);
    const ok = await deleteNode(node.zoneId, node.id);
    setBusy(false);

    if (ok) {
      toast.success("Zone unassignment queued");
      onChanged?.();
    } else {
      toast.error("Failed to unassign it from the zone");
    }
  };

  const openFibersDialog = () => {
    if (!node) return;

    showDialog({
      title: `Fibers — ${node.ipAddress}`,
      content: (
        <FibersDialog
          zoneId={node.zoneId}
          nodeId={node.id}
          nodeIp={node.ipAddress}
        />
      ),
    });
  };

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Zone</h3>

      {node ? (
        <>
          <p className="text-sm">
            {attachedZoneName} — {node.ipAddress}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              text="Manage Fibers"
              style="secondary"
              onClick={openFibersDialog}
            />
            <Button
              text="Unassign"
              style="danger"
              disabled={busy || !editable}
              onClick={detach}
            />
          </div>
        </>
      ) : zones.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No zones yet. Create one in Mesh first.
        </p>
      ) : (
        <>
          <Select
            options={zones.map((zone) => ({
              value: zone.id,
              displayText: `${zone.name} (${zone.cidr})`,
            }))}
            placeholder="Select a zone"
            isLoading={isLoading}
            disabled={!editable}
            onChangedValue={(value: any) => setSelectedZoneId(value)}
          />
          <Button
            text="Assign"
            disabled={busy || !editable || !selectedZoneId}
            onClick={attach}
          />
        </>
      )}

      <p className="text-xs text-ink-muted">
        {editable
          ? "Assigning reserves an IP in the zone; unassigning releases it."
          : "Stop it first to change its zone."}
      </p>
    </section>
  );
}
