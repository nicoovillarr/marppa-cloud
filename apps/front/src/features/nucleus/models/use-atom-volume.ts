"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { atomVolumeApi } from "../api/atom-volume.api";
import {
  AtomVolumeResponseDto,
  CreateAtomVolumeDto,
} from "../api/atom-volume.api.types";

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useAtomVolume() {
  const [volumes, setVolumes] = useState<AtomVolumeResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (atomId?: string) => {
    setIsLoading(true);
    try {
      setVolumes(
        atomId
          ? await atomVolumeApi.listByAtom(atomId)
          : await atomVolumeApi.list(),
      );
    } catch (error) {
      toast.error(messageOf(error, "Failed to load volumes"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      done: string,
      failed: string,
    ): Promise<boolean> => {
      setBusy(true);
      try {
        await action();
        toast.success(done);
        return true;
      } catch (error) {
        toast.error(messageOf(error, failed));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const createVolume = useCallback(
    (data: CreateAtomVolumeDto) =>
      run(
        () => atomVolumeApi.create(data),
        `Creation of ${data.name} queued`,
        `Failed to create ${data.name}`,
      ),
    [run],
  );

  const renameVolume = useCallback(
    (volume: AtomVolumeResponseDto, name: string) =>
      run(
        () => atomVolumeApi.update(volume.id, { name }),
        `${volume.name} renamed to ${name}`,
        `Failed to rename ${volume.name}`,
      ),
    [run],
  );

  const resizeVolume = useCallback(
    (volume: AtomVolumeResponseDto, sizeGiB: number) =>
      run(
        () => atomVolumeApi.resize(volume.id, { sizeGiB }),
        `Resize of ${volume.name} to ${sizeGiB}GiB queued`,
        `Failed to resize ${volume.name}`,
      ),
    [run],
  );

  const attachVolume = useCallback(
    (volume: AtomVolumeResponseDto, atomId: string, mountPoint: string) =>
      run(
        () => atomVolumeApi.attach(volume.id, atomId, mountPoint),
        `${volume.name} attached on ${mountPoint}; it mounts on the next start`,
        `Failed to attach ${volume.name}`,
      ),
    [run],
  );

  const detachVolume = useCallback(
    (volume: AtomVolumeResponseDto) =>
      run(
        () => atomVolumeApi.detach(volume.id),
        `${volume.name} detached`,
        `Failed to detach ${volume.name}`,
      ),
    [run],
  );

  const deleteVolume = useCallback(
    (volume: AtomVolumeResponseDto) =>
      run(
        () => atomVolumeApi.delete(volume.id),
        `Deletion of ${volume.name} queued`,
        `Failed to delete ${volume.name}`,
      ),
    [run],
  );

  return {
    volumes,
    isLoading,
    busy,
    load,
    createVolume,
    renameVolume,
    resizeVolume,
    attachVolume,
    detachVolume,
    deleteVolume,
  };
}
