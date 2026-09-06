"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/core/ui/Button";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { ResourceStatus, STATUS_KIND } from "@/core/models/resource-status.enum";
import { AtomVolumeResponseDto } from "../api/atom-volume.api.types";
import { useAtomVolume } from "../models/use-atom-volume";

interface AtomVolumesSectionProps {
  atomId: string;
  dataPaths: string[];
  editable: boolean;
}

const SETTLE_POLL_MS = 3000;

export function AtomVolumesSection({
  atomId,
  dataPaths,
  editable,
}: AtomVolumesSectionProps) {
  const { volumes, busy, load, attachVolume, detachVolume } = useAtomVolume();

  const [mountPoint, setMountPoint] = useState(dataPaths[0] ?? "");

  const reload = useCallback(() => load(), [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    setMountPoint((current) =>
      dataPaths.includes(current) ? current : dataPaths[0] ?? "",
    );
  }, [dataPaths]);

  const attached = useMemo(
    () => volumes.filter((volume) => volume.atomId === atomId),
    [volumes, atomId],
  );

  const unattached = useMemo(
    () => volumes.filter((volume) => volume.atomId == null),
    [volumes],
  );

  const freePaths = useMemo(
    () =>
      dataPaths.filter(
        (path) => !attached.some((volume) => volume.mountPoint === path),
      ),
    [dataPaths, attached],
  );

  const settling = useMemo(
    () => volumes.some((volume) => STATUS_KIND[volume.status] === "transition"),
    [volumes],
  );

  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!settling) return;

    poll.current = setInterval(reload, SETTLE_POLL_MS);
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [settling, reload]);

  const runAndReload = async (action: Promise<boolean>) => {
    if (await action) await reload();
  };

  const target = freePaths.includes(mountPoint) ? mountPoint : freePaths[0];

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Volumes</h3>

      <p className="text-xs text-ink-muted">
        {editable
          ? "Everything outside a volume is discarded when the container is rebuilt on the next start."
          : "Stop the atom to attach or detach volumes."}{" "}
        <Link className="underline" href="/dashboard/nucleus/volumes">
          Manage volumes
        </Link>
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

      {editable && freePaths.length > 1 && (
        <select
          className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent font-mono"
          value={target}
          onChange={(event) => setMountPoint(event.target.value)}
        >
          {freePaths.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
      )}

      {editable && freePaths.length > 0 && unattached.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-ink-muted">Unattached volumes</p>
          {unattached.map((volume: AtomVolumeResponseDto) => (
            <div
              key={volume.id}
              className="flex items-center justify-between gap-2 text-sm border border-border dark: rounded px-2 py-1"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-medium">{volume.name}</span>
                <span className="text-xs text-ink-muted font-mono truncate">
                  {volume.sizeGiB} GiB
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <StatusBadge status={volume.status} />
                <Button
                  text={`Attach on ${target}`}
                  disabled={busy || volume.status !== ResourceStatus.INACTIVE}
                  onClick={() =>
                    runAndReload(attachVolume(volume, atomId, target))
                  }
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
