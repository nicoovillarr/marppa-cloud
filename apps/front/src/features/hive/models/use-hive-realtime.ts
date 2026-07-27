"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/core/ui/WebsocketProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useUser } from "../../users/model/useUser";
import { useWorkerStore } from "./worker.store";
import { useWorker } from "./use-worker";

export function useHiveRealtime() {
  const { subscribe } = useWebSocket();
  const { user } = useUser();
  const setWorkers = useWorkerStore((s) => s.setWorkers);
  const { fetchWorkers } = useWorker();

  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId) return;

    const channel = `company:${companyId}:hive`;

    const unsubscribe = subscribe(channel, (message) => {
      const type: string | undefined = message?.type;
      const payload = message?.data ?? {};
      const workerId: string | undefined = payload.workerId;
      const status: ResourceStatus | undefined = payload.data?.status;

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
