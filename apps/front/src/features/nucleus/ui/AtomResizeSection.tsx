"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { Select } from "@/core/ui/inputs/Select";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { AtomWithRelationsResponseDto } from "../api/atom.api.types";
import { useAtom } from "../models/use-atom";
import { useAtomSize } from "../models/use-atom-size";

interface AtomResizeSectionProps {
  atom: AtomWithRelationsResponseDto;
  editable: boolean;
  onChanged?: () => void;
}

export function AtomResizeSection({
  atom,
  editable,
  onChanged,
}: AtomResizeSectionProps) {
  const { resizeAtom } = useAtom();
  const { sizes, isLoading, fetchSizes } = useAtomSize();
  const [sizeId, setSizeId] = useState<number>(atom.sizeId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSizes();
  }, [fetchSizes]);

  const options = useMemo(() => {
    const available = sizes
      .filter((size) => size.deprecatedAt == null || size.id === atom.sizeId)
      .map((size) => ({
        value: size.id,
        displayText: `${size.name} — ${size.cpuCores} vCPU · ${size.ramMB} MB`,
      }));

    if (available.some((option) => option.value === atom.sizeId)) {
      return available;
    }

    return [
      {
        value: atom.sizeId,
        displayText: `current — ${atom.cpuCores} vCPU · ${atom.ramMB} MB`,
      },
      ...available,
    ];
  }, [sizes, atom]);

  const hasChanged = sizeId !== atom.sizeId;

  const resize = async () => {
    if (!hasChanged) return;

    setBusy(true);
    const failureReason = await resizeAtom(atom.id, sizeId);
    setBusy(false);

    if (failureReason == null) {
      toast.success(`${atom.name} resized`, {
        description: "The new size applies on the next start.",
      });
      closeCurrentDialog();
      onChanged?.();
    } else {
      toast.error(`Failed to resize ${atom.name}`, {
        description: failureReason,
      });
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Size</h3>

      <Select
        options={options}
        defaultValue={atom.sizeId}
        isLoading={isLoading}
        disabled={!editable}
        onChangedValue={(value: string | number | null) =>
          setSizeId(value == null ? atom.sizeId : Number(value))
        }
      />
      <Button
        text="Resize"
        disabled={busy || !editable || !hasChanged}
        onClick={resize}
      />

      <p className="text-xs text-ink-muted">
        {editable
          ? "Changes the vCPU and memory limits of the container. The new size applies on the next start."
          : "Stop it first to change its size."}
      </p>
    </section>
  );
}
