"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { workerDiskApi } from "../api/worker-disk.api";
import {
  CreateWorkerDiskDto,
  WorkerDiskResponseDto,
} from "../api/worker-disk.api.types";

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useWorkerDisk() {
  const [disks, setDisks] = useState<WorkerDiskResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (workerId?: string) => {
    setIsLoading(true);
    try {
      setDisks(
        workerId
          ? await workerDiskApi.listByWorker(workerId)
          : await workerDiskApi.list(),
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
      queued: string,
      failed: string,
    ): Promise<boolean> => {
      setBusy(true);
      try {
        await action();
        toast.success(queued);
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

  const createDisk = useCallback(
    (data: CreateWorkerDiskDto) =>
      run(
        () => workerDiskApi.create(data),
        `Creation of ${data.name} queued`,
        `Failed to create ${data.name}`,
      ),
    [run],
  );

  const attachDisk = useCallback(
    (disk: WorkerDiskResponseDto, workerId: string) =>
      run(
        () => workerDiskApi.attach(disk.id, workerId),
        `Attach of ${disk.name} queued`,
        `Failed to attach ${disk.name}`,
      ),
    [run],
  );

  const detachDisk = useCallback(
    (disk: WorkerDiskResponseDto) =>
      run(
        () => workerDiskApi.detach(disk.id),
        `Detach of ${disk.name} queued`,
        `Failed to detach ${disk.name}`,
      ),
    [run],
  );

  const deleteDisk = useCallback(
    (disk: WorkerDiskResponseDto) =>
      run(
        () => workerDiskApi.delete(disk.id),
        `Deletion of ${disk.name} queued`,
        `Failed to delete ${disk.name}`,
      ),
    [run],
  );

  return {
    disks,
    isLoading,
    busy,
    load,
    createDisk,
    attachDisk,
    detachDisk,
    deleteDisk,
  };
}
