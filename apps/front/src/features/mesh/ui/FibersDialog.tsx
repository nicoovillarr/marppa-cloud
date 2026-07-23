"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LuCopy, LuPlus, LuPower, LuPowerOff, LuRefreshCcw, LuTrash2 } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { InlineCode } from "@/core/ui/InlineCode";
import { closeCurrentDialog, useDialog } from "@/core/ui/DialogProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useFiber } from "../models/use-fiber";
import { FiberResponseDto } from "../api/fiber.api.types";
import { FiberCreateDialog } from "./FiberCreateDialog";

function hostAddress(): string {
  const configured = process.env.NEXT_PUBLIC_HOST_ADDRESS?.trim();
  if (configured) return configured;
  if (typeof window === "undefined") return "<host-ip>";
  return window.location.hostname || "<host-ip>";
}

function connectHint(fiber: FiberResponseDto): string {
  const host = hostAddress();
  if (fiber.protocol === "tcp" && fiber.targetPort === 22) {
    return `ssh -p ${fiber.hostPort} ubuntu@${host}`;
  }
  return `${host}:${fiber.hostPort} → :${fiber.targetPort}/${fiber.protocol}`;
}

export function FibersDialog({
  zoneId,
  nodeId,
  nodeIp,
  onChanged,
}: {
  zoneId: string;
  nodeId: string;
  nodeIp: string;
  onChanged?: () => void;
}) {
  const [fibers, setFibers] = useState<FiberResponseDto[] | null>(null);
  const { fetchFibers, deleteFiber, stopFiber, startFiber } = useFiber();
  const { showDialog } = useDialog();

  const refresh = useCallback(async () => {
    const list = await fetchFibers(zoneId, nodeId);
    setFibers(list ?? []);
  }, [fetchFibers, zoneId, nodeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    showDialog({
      title: `Create Fiber on ${nodeIp}`,
      content: (
        <FiberCreateDialog
          zoneId={zoneId}
          nodeId={nodeId}
          onCreated={() => {
            refresh();
            onChanged?.();
          }}
        />
      ),
    });
  };

  const onDelete = (fiber: FiberResponseDto) => {
    showDialog({
      type: "confirm",
      title: "Delete Fiber",
      description: `Remove the port-forward on host port ${fiber.hostPort}?`,
      confirmText: "Delete",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await deleteFiber(zoneId, nodeId, fiber.id);
        if (ok) {
          toast.success("Fiber deletion queued");
          refresh();
          onChanged?.();
        } else {
          toast.error("Failed to delete fiber");
        }
      },
    });
  };

  const onToggle = async (fiber: FiberResponseDto) => {
    const active = fiber.status === ResourceStatus.ACTIVE;
    const ok = active
      ? await stopFiber(zoneId, nodeId, fiber.id)
      : await startFiber(zoneId, nodeId, fiber.id);

    if (ok) {
      toast.success(active ? "Fiber stop queued" : "Fiber start queued");
      refresh();
      onChanged?.();
    } else {
      toast.error(active ? "Failed to stop fiber" : "Failed to start fiber");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4 min-w-96">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Port-forwards from the host to <InlineCode code={nodeIp} />. The host
          port is allocated automatically; use it to reach the VM from your LAN.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          style="secondary"
          icon={<LuRefreshCcw />}
          onClick={refresh}
        />
        <Button
          type="button"
          text="Create Fiber"
          icon={<LuPlus />}
          onClick={openCreate}
        />
      </div>

      {fibers === null ? (
        <p className="text-sm text-gray-500">Loading fibers…</p>
      ) : fibers.length === 0 ? (
        <p className="text-sm text-gray-500">
          No fibers yet. Create one (e.g. <InlineCode code="tcp / 22" /> for SSH)
          to expose a port of this node.
        </p>
      ) : (
        <ul className="space-y-2">
          {fibers.map((fiber) => {
            const hint = connectHint(fiber);
            const active = fiber.status === ResourceStatus.ACTIVE;
            const togglable =
              active ||
              fiber.status === ResourceStatus.INACTIVE ||
              fiber.status === ResourceStatus.FAILED;
            return (
              <li
                key={fiber.id}
                className="rounded-md border border-gray-200 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {fiber.protocol.toUpperCase()} host:{fiber.hostPort} → :
                    {fiber.targetPort}
                  </span>
                  <span
                    className={`text-xs rounded px-2 py-0.5 ${
                      active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {fiber.status}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <InlineCode code={hint} className="truncate" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      style="secondary"
                      icon={<LuCopy />}
                      onClick={() => copy(hint)}
                    />
                    {togglable && (
                      <Button
                        type="button"
                        style="secondary"
                        icon={active ? <LuPowerOff /> : <LuPower />}
                        onClick={() => onToggle(fiber)}
                      />
                    )}
                    <Button
                      type="button"
                      style="danger"
                      icon={<LuTrash2 />}
                      onClick={() => onDelete(fiber)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          style="secondary"
          text="Close"
          onClick={() => closeCurrentDialog()}
        />
      </div>
    </div>
  );
}
