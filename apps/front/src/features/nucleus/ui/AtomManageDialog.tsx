"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { Button } from "@/core/ui/Button";
import { InlineCode } from "@/core/ui/InlineCode";
import { closeCurrentDialog, useDialog } from "@/core/ui/DialogProvider";
import { AtomWithRelationsResponseDto } from "../api/atom.api.types";
import { useAtom } from "../models/use-atom";
import { AtomEnvVarsSection } from "./AtomEnvVarsSection";

const AtomConsole = dynamic(
  () => import("./AtomConsole").then((mod) => mod.AtomConsole),
  { ssr: false },
);

interface AtomManageDialogProps {
  atom: AtomWithRelationsResponseDto;
  onChanged?: () => void;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-ink-muted">{label}</span>
    <span className="text-right break-all">{value}</span>
  </div>
);

export const imageRef = (image: AtomWithRelationsResponseDto["image"]) =>
  image
    ? `${image.registry}/${image.repository}${image.digest ? `@${image.digest}` : `:${image.tag}`}`
    : "—";

export function AtomManageDialog({ atom, onChanged }: AtomManageDialogProps) {
  const { startAtom, terminateAtom, deleteAtom } = useAtom();
  const { showDialog } = useDialog();
  const [busy, setBusy] = useState(false);

  const isOff = atom.status === ResourceStatus.INACTIVE;
  const isRunning = atom.status === ResourceStatus.ACTIVE;
  const hasNode = atom.node != null;

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
      <section className="space-y-1 rounded border border-border dark: p-3">
        <InfoRow label="Name" value={atom.name} />
        <InfoRow label="Status" value={atom.status} />
        <InfoRow label="Image" value={imageRef(atom.image)} />
        <InfoRow label="IP address" value={atom.node?.ipAddress ?? "not assigned"} />
      </section>

      <section className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Button
            text="Start"
            disabled={busy || !isOff || !hasNode}
            onClick={() =>
              run(
                () => startAtom(atom.id),
                `Start of ${atom.name} queued`,
                `Failed to start ${atom.name}`,
              )
            }
          />
          <Button
            text="Stop"
            style="secondary"
            disabled={busy || !isRunning}
            onClick={() =>
              run(
                () => terminateAtom(atom.id),
                `Stop of ${atom.name} queued`,
                `Failed to stop ${atom.name}`,
              )
            }
          />
          <Button
            text="Delete"
            style="danger"
            disabled={busy || !isOff || hasNode}
            onClick={() =>
              run(
                () => deleteAtom(atom.id),
                `Deletion of ${atom.name} queued`,
                `Failed to delete ${atom.name}`,
              )
            }
          />
          <Button
            text="Console"
            style="secondary"
            disabled={!isRunning}
            onClick={() =>
              showDialog({
                title: `Console — ${atom.name}`,
                content: <AtomConsole atomId={atom.id} />,
              })
            }
          />
        </div>

        {!isOff && !isRunning && (
          <p className="text-xs text-ink-muted">
            <InlineCode code={atom.status} /> is a transient state — actions
            become available once it settles.
          </p>
        )}

        {isOff && !hasNode && (
          <p className="text-xs text-ink-muted">
            Assign this atom to a zone from Mesh → the zone's Nodes list. Without
            a node it has no address on any bridge and cannot start.
          </p>
        )}

        {isOff && hasNode && (
          <p className="text-xs text-ink-muted">
            Unassign its node in Mesh before deleting it.
          </p>
        )}

        {isRunning && (
          <p className="text-xs text-ink-muted">Stop it first to delete it.</p>
        )}
      </section>

      <AtomEnvVarsSection atomId={atom.id} editable={isOff} />
    </div>
  );
}
