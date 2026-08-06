"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/core/ui/WebsocketProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useWorkerStore } from "./worker.store";
import { useWorker } from "./use-worker";

export function useHiveRealtime() {
  const { subscribe, companyId } = useWebSocket();
  const setWorkers = useWorkerStore((s) => s.setWorkers);
  const { fetchWorkers } = useWorker();

  useEffect(() => {
    if (!companyId) return;

    const channel = `company:${companyId}:hive`;

    const unsubscribe = subscribe(channel, (message) => {
      const type: string | undefined = message?.type;
      const payload = message?.data ?? {};
      const workerId: string | undefined = payload.workerId;
      const status: ResourceStatus | undefined = payload.data?.status;

      if (payload.diskId != null) {
        return;
      }

      const workers = useWorkerStore.getState().workers;
      const knownWorker = workerId && workers.some((w) => w.id === workerId);

      if (type === "UPDATED" && workerId && status && knownWorker) {
        setWorkers(
          workers.map((w) => (w.id === workerId ? { ...w, status } : w)),
        );
        return;
      }

      fetchWorkers();
    });

    return unsubscribe;
  }, [companyId, subscribe, setWorkers, fetchWorkers]);
}
