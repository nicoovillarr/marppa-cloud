"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { AtomVolumeResponseDto } from "../api/atom-volume.api.types";
import { useAtomVolume } from "../models/use-atom-volume";

interface AtomVolumesSectionProps {
  atomId: string;
  dataPaths: string[];
  editable: boolean;
}

const DEFAULT_SIZE_GIB = 1;

export function AtomVolumesSection({
  atomId,
  dataPaths,
  editable,
}: AtomVolumesSectionProps) {
  const {
    volumes,
    busy,
    load,
    createVolume,
    attachVolume,
    detachVolume,
    deleteVolume,
  } = useAtomVolume();

  const [name, setName] = useState("");
  const [sizeGiB, setSizeGiB] = useState(DEFAULT_SIZE_GIB);
  const [mountPoint, setMountPoint] = useState(dataPaths[0] ?? "");

  const reload = useCallback(() => load(), [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const attached = useMemo(
    () => volumes.filter((volume) => volume.atomId === atomId),
    [volumes, atomId],
  );

  const attachable = useMemo(
    () =>
      volumes.filter(
        (volume) =>
          volume.atomId == null && volume.status === ResourceStatus.INACTIVE,
      ),
    [volumes],
  );

  const runAndReload = async (action: Promise<boolean>) => {
    if (await action) await reload();
  };

  const create = async () => {
    const created = await createVolume({
      name: name.trim(),
      sizeGiB,
      mountPoint: mountPoint.trim(),
    });

    if (created) {
      setName("");
      await reload();
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Volumes</h3>

      <p className="text-xs text-ink-muted">
        {editable
          ? "Everything outside a volume is discarded when the container is rebuilt on the next start."
          : "Stop the atom to attach or detach volumes."}
      </p>

      {attached.length === 0 ? (
        <p className="text-xs text-ink-muted">
          No volumes attached — this atom keeps nothing between starts.
        </p>
      ) : (
        <ul className="space-y-1">
          {attached.map((volume) => (
            <li
              key={volume.id}
              className="flex items-center justify-between gap-2 text-sm border border-border dark: rounded px-2 py-1"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-medium">{volume.name}</span>
                <span className="text-xs text-ink-muted font-mono truncate">
                  {volume.mountPoint} · {volume.sizeGiB} GiB
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <StatusBadge status={volume.status} />
                {editable && (
                  <Button
                    text="Detach"
                    style="secondary"
                    disabled={busy}
                    onClick={() => runAndReload(detachVolume(volume))}
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {editable && attachable.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-ink-muted">Available volumes</p>
          {attachable.map((volume: AtomVolumeResponseDto) => (
            <div
              key={volume.id}
              className="flex items-center justify-between gap-2 text-sm border border-border dark: rounded px-2 py-1"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-medium">{volume.name}</span>
                <span className="text-xs text-ink-muted font-mono truncate">
                  {volume.mountPoint} · {volume.sizeGiB} GiB
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <Button
                  text="Attach"
                  disabled={busy}
                  onClick={() => runAndReload(attachVolume(volume, atomId))}
                />
                <Button
                  icon={<LuTrash2 />}
                  style="danger"
                  disabled={busy}
                  onClick={() => runAndReload(deleteVolume(volume))}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="space-y-2">
          <input
            className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent"
            placeholder="Volume name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent font-mono"
            list="atom-volume-data-paths"
            placeholder="/data"
            value={mountPoint}
            onChange={(event) => setMountPoint(event.target.value)}
          />
          <datalist id="atom-volume-data-paths">
            {dataPaths.map((path) => (
              <option key={path} value={path} />
            ))}
          </datalist>
          <input
            className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent"
            type="number"
            min={1}
            value={sizeGiB}
            onChange={(event) => setSizeGiB(Number(event.target.value))}
          />
          <Button
            text="Create volume"
            disabled={busy || !name.trim() || !mountPoint.trim() || sizeGiB < 1}
            onClick={create}
          />
        </div>
      )}
    </section>
  );
}
