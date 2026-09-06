"use client";

import { useState } from "react";
import { Button } from "@/core/ui/Button";
import { AtomVolumeResponseDto } from "../api/atom-volume.api.types";

const DEFAULT_SIZE_GIB = 1;

interface CreateProps {
  busy: boolean;
  onSubmit: (name: string, sizeGiB: number) => void;
}

export function CreateAtomVolumeDialog({ busy, onSubmit }: CreateProps) {
  const [name, setName] = useState("");
  const [sizeGiB, setSizeGiB] = useState(DEFAULT_SIZE_GIB);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        The mount point is chosen when the volume is attached to an atom, since
        it is the image that decides where its state lives.
      </p>

      <input
        className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent"
        placeholder="Volume name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <input
        className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent"
        type="number"
        min={1}
        value={sizeGiB}
        onChange={(event) => setSizeGiB(Number(event.target.value))}
      />

      <Button
        text="Create volume"
        disabled={busy || !name.trim() || sizeGiB < 1}
        onClick={() => onSubmit(name.trim(), sizeGiB)}
      />
    </div>
  );
}

interface ResizeProps {
  volume: AtomVolumeResponseDto;
  busy: boolean;
  onSubmit: (sizeGiB: number) => void;
}

export function ResizeAtomVolumeDialog({
  volume,
  busy,
  onSubmit,
}: ResizeProps) {
  const [sizeGiB, setSizeGiB] = useState(volume.sizeGiB + 1);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        A volume can only grow — shrinking an ext4 filesystem needs it unmounted
        and checked, and gets the data wrong when it goes wrong. Currently{" "}
        {volume.sizeGiB} GiB.
      </p>

      <input
        className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent"
        type="number"
        min={volume.sizeGiB + 1}
        value={sizeGiB}
        onChange={(event) => setSizeGiB(Number(event.target.value))}
      />

      <Button
        text="Resize"
        disabled={busy || sizeGiB <= volume.sizeGiB}
        onClick={() => onSubmit(sizeGiB)}
      />
    </div>
  );
}

interface RenameProps {
  volume: AtomVolumeResponseDto;
  busy: boolean;
  onSubmit: (name: string) => void;
}

export function RenameAtomVolumeDialog({
  volume,
  busy,
  onSubmit,
}: RenameProps) {
  const [name, setName] = useState(volume.name);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        Only the label changes; the data is untouched.
      </p>

      <input
        className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <Button
        text="Rename"
        disabled={busy || !name.trim() || name.trim() === volume.name}
        onClick={() => onSubmit(name.trim())}
      />
    </div>
  );
}
