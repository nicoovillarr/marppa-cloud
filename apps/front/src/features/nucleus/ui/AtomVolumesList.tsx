"use client";

import { useCallback, useEffect, useMemo } from "react";
import { LuHardDrive, LuRefreshCcw } from "react-icons/lu";
import { toast } from "sonner";
import { useVisibleCompanies } from "@/company/models/use-visible-companies";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { Button } from "@/core/ui/Button";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { useDialog } from "@/core/ui/DialogProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { AtomVolumeResponseDto } from "../api/atom-volume.api.types";
import { useAtomVolume } from "../models/use-atom-volume";
import {
  CreateAtomVolumeDialog,
  RenameAtomVolumeDialog,
  ResizeAtomVolumeDialog,
} from "./AtomVolumeDialogs";

const COLUMNS: ColumnMapping<AtomVolumeResponseDto> = {
  id: {
    label: "#",
    minWidth: "80px",
  },
  name: {
    label: "Name",
    width: "100%",
    minWidth: "150px",
  },
  sizeGiB: {
    label: "Size",
    minWidth: "100px",
    renderFn: (volume: AtomVolumeResponseDto) => `${volume.sizeGiB} GiB`,
  },
  atomId: {
    label: "Attached to",
    minWidth: "220px",
    renderFn: (volume: AtomVolumeResponseDto) =>
      volume.atomId
        ? `${volume.atomId} · ${volume.mountPoint}`
        : "Not attached",
  },
  status: {
    label: "Status",
    minWidth: "150px",
    renderFn: (volume: AtomVolumeResponseDto) => (
      <StatusBadge status={volume.status} />
    ),
  },
};

export function AtomVolumesList() {
  const { nameOf, hasMoreThanOne } = useVisibleCompanies();
  const { showDialog, closeDialog } = useDialog();

  const {
    volumes,
    isLoading,
    busy,
    load,
    createVolume,
    renameVolume,
    resizeVolume,
    deleteVolume,
  } = useAtomVolume();

  const columns = useMemo(
    () =>
      hasMoreThanOne
        ? {
            ...COLUMNS,
            ownerId: {
              label: "Company",
              minWidth: "160px",
              renderFn: (volume: AtomVolumeResponseDto) =>
                nameOf(volume.ownerId),
            },
          }
        : COLUMNS,
    [hasMoreThanOne, nameOf],
  );

  const reload = useCallback(() => load(), [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const runAndClose = async (action: Promise<boolean>) => {
    if (await action) {
      closeDialog();
      await reload();
    }
  };

  const onCreate = () =>
    showDialog({
      title: "New volume",
      content: (
        <CreateAtomVolumeDialog
          busy={busy}
          onSubmit={(name, sizeGiB) =>
            runAndClose(createVolume({ name, sizeGiB }))
          }
        />
      ),
    });

  const onRename = (volume: AtomVolumeResponseDto) =>
    showDialog({
      title: `Rename ${volume.name}`,
      content: (
        <RenameAtomVolumeDialog
          volume={volume}
          busy={busy}
          onSubmit={(name) => runAndClose(renameVolume(volume, name))}
        />
      ),
    });

  const onResize = (volume: AtomVolumeResponseDto) => {
    if (volume.status !== ResourceStatus.INACTIVE) {
      toast.error(`${volume.name} must be idle to resize (is ${volume.status})`);
      return;
    }

    showDialog({
      title: `Resize ${volume.name}`,
      content: (
        <ResizeAtomVolumeDialog
          volume={volume}
          busy={busy}
          onSubmit={(sizeGiB) => runAndClose(resizeVolume(volume, sizeGiB))}
        />
      ),
    });
  };

  const onDelete = (volume: AtomVolumeResponseDto) => {
    if (volume.atomId) {
      toast.error(
        `${volume.name} is attached to ${volume.atomId}: detach it from the atom first`,
      );
      return;
    }

    showDialog({
      type: "confirm",
      title: "Delete volume",
      description: `This destroys ${volume.name} and everything on it. There is no undo. Continue?`,
      confirmText: "Delete",
      confirmButtonStyle: "danger",
      onConfirm: () => {
        void runAndClose(deleteVolume(volume));
      },
    });
  };

  const contextMenuGroups = (volume: AtomVolumeResponseDto) => [
    { label: "Rename", action: () => onRename(volume) },
    {
      label: "Resize",
      action: () => onResize(volume),
      disabled: volume.status !== ResourceStatus.INACTIVE,
    },
    {
      label: "Delete",
      action: () => onDelete(volume),
      disabled: volume.atomId != null,
    },
  ];

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Atom Volumes
        </h2>

        <Button
          icon={<LuRefreshCcw />}
          onClick={reload}
          style="secondary"
          disabled={isLoading}
        />

        <Button
          className="ml-2"
          text="Create New"
          icon={<LuHardDrive />}
          onClick={onCreate}
          disabled={busy}
        />
      </header>

      {volumes.length > 0 ? (
        <Table
          columns={columns}
          data={volumes}
          getKey={(volume: AtomVolumeResponseDto) => volume.id}
          onRowClick={(volume: AtomVolumeResponseDto) => onRename(volume)}
          contextMenuGroups={contextMenuGroups}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          No volumes yet. An image that keeps state needs one before an atom can
          be created from it.
        </p>
      )}
    </section>
  );
}
