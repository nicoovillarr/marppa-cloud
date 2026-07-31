"use client";
import { useVisibleCompanies } from "@/company/models/use-visible-companies";

import { ColumnMapping, Table } from "@/core/ui/Table";
import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { LuListPlus, LuPlay, LuRefreshCcw, LuTrash2 } from "react-icons/lu";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useDialog } from "@/core/ui/DialogProvider";
import { useAtom } from "../models/use-atom";
import { useNucleusRealtime } from "../models/use-nucleus-realtime";
import { AtomWithRelationsResponseDto } from "../api/atom.api.types";
import { AtomManageDialog, imageRef } from "./AtomManageDialog";
import { StatusBadge } from "@/core/ui/StatusBadge";

const COLUMNS: ColumnMapping<AtomWithRelationsResponseDto> = {
  id: {
    label: "#",
    minWidth: "150px",
  },
  name: {
    label: "Name",
    width: "100%",
    minWidth: "150px",
  },
  image: {
    label: "Image",
    minWidth: "250px",
    renderFn: (atom: AtomWithRelationsResponseDto) => imageRef(atom),
  },
  IP: {
    label: "IP Address",
    minWidth: "125px",
    renderFn: (atom: AtomWithRelationsResponseDto) =>
      atom.node?.ipAddress || "N/A",
  },
  status: {
    label: "Status",
    minWidth: "150px",
    renderFn: (atom: AtomWithRelationsResponseDto) => (
      <StatusBadge status={atom.status} />
    ),
  },
};

export function AtomsList() {
  const { nameOf, hasMoreThanOne } = useVisibleCompanies();

  const columns = useMemo(
    () =>
      hasMoreThanOne
        ? {
            ...COLUMNS,
            ownerId: {
              label: "Company",
              minWidth: "160px",
              renderFn: (row: any) => nameOf(row.ownerId),
            },
          }
        : COLUMNS,
    [hasMoreThanOne, nameOf]
  );

  const { atoms, fetchAtoms, startAtom, terminateAtom } = useAtom();
  const { showDialog } = useDialog();

  useNucleusRealtime();

  const [selectedAtoms, setSelectedAtoms] = useState<Set<string>>(new Set());

  const selectAtoms = useCallback(
    (indexes: Set<string>) => {
      const source = Array.from(indexes)
        .map((i) => atoms.find((a) => a.id === i)?.id)
        .filter((id) => id !== null);
      setSelectedAtoms(new Set(source));
    },
    [atoms],
  );

  const selectAtom = useCallback(
    (atomId: string) => {
      const next = new Set(selectedAtoms);
      if (next.has(atomId)) {
        next.delete(atomId);
      } else {
        next.add(atomId);
      }

      setSelectedAtoms(next);
    },
    [selectedAtoms],
  );

  const onRowClick = (atomId: string) => {
    const atom = atoms.find((a) => a.id === atomId);
    if (!atom) {
      toast.error("There was an error fetching the atom.");
      return;
    }

    if (atom.status === ResourceStatus.DELETED) {
      toast.info("This atom has been deleted.");
      return;
    }

    showDialog({
      title: `Manage ${atom.name}`,
      content: <AtomManageDialog atom={atom} onChanged={() => fetchAtoms()} />,
    });
  };

  const selectedAtom =
    selectedAtoms.size === 1
      ? atoms.find((a) => a.id === Array.from(selectedAtoms)[0]) ?? null
      : null;

  const onStart = async (atom: AtomWithRelationsResponseDto) => {
    if (!atom.node) {
      toast.error(
        `${atom.name} has no node: assign it to a zone in Mesh before starting it`,
      );
      return;
    }

    const ok = await startAtom(atom.id);
    if (ok) {
      toast.success(`Start of ${atom.name} queued`);
      await fetchAtoms();
    } else {
      toast.error(`Failed to start ${atom.name}`);
    }
  };

  const onTerminate = (atom: AtomWithRelationsResponseDto) => {
    showDialog({
      type: "confirm",
      title: "Stop Atom",
      description: `This removes the container of ${atom.name}. It is rebuilt from scratch on the next start. Continue?`,
      confirmText: "Stop",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await terminateAtom(atom.id);
        if (ok) {
          toast.success(`Stop of ${atom.name} queued`);
          await fetchAtoms();
        } else {
          toast.error(`Failed to stop ${atom.name}`);
        }
      },
    });
  };

  const contextMenuGroups = (rowData: AtomWithRelationsResponseDto) => [
    {
      label: selectedAtoms.has(rowData.id) ? "Unselect" : "Select",
      action: () => selectAtom(rowData.id),
    },
  ];

  useEffect(() => {
    fetchAtoms();
  }, []);

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Atoms
        </h2>

        <Button
          icon={<LuRefreshCcw />}
          onClick={() => fetchAtoms()}
          style="secondary"
        />

        <Button
          className="ml-2"
          text="Create New"
          icon={<LuListPlus />}
          href="/dashboard/nucleus/atoms/create"
        />
      </header>
      {atoms && atoms.length > 0 ? (
        <>
          <Table
            select="multiple"
            columns={columns}
            data={atoms}
            contextMenuGroups={contextMenuGroups}
            onRowClick={(rowData) => onRowClick(rowData.id)}
            onSelectionChange={selectAtoms}
            getKey={(atom) => atom.id}
          />
          <div className="flex justify-between items-center gap-4 mt-4">
            <p className="text-sm text-ink-muted">
              Selected Atoms:
              <span className="font-bold ml-1">{selectedAtoms.size}</span>
            </p>
            {selectedAtom && (
              <aside className="flex items-center gap-2">
                {selectedAtom.status === ResourceStatus.INACTIVE && (
                  <Button
                    text="Start"
                    icon={<LuPlay />}
                    onClick={() => onStart(selectedAtom)}
                  />
                )}
                {selectedAtom.status === ResourceStatus.ACTIVE && (
                  <Button
                    text="Stop"
                    icon={<LuTrash2 />}
                    style="danger"
                    onClick={() => onTerminate(selectedAtom)}
                  />
                )}
              </aside>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-muted">No atoms found.</p>
      )}
    </section>
  );
}
