"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/core/ui/WebsocketProvider";
import { useUser } from "../../users/model/useUser";
import { useZoneStore } from "./zone.store";
import { useZone } from "./use-zone";

export function useMeshRealtime() {
  const { subscribe } = useWebSocket();
  const { user } = useUser();
  const setZones = useZoneStore((s) => s.setZones);
  const { fetchZones } = useZone();

  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId) return;

    const channel = `company:${companyId}:mesh`;

    const unsubscribe = subscribe(channel, (message) => {
      const payload = message?.data ?? {};
      const zoneId: string | undefined = payload.zoneId;
      const status: string | undefined = payload.data?.status;

      const zones = useZoneStore.getState().zones;
      const knownZone = zoneId && zones.some((z) => z.id === zoneId);

      if (zoneId && status && knownZone) {
        setZones(
          zones.map((z) => (z.id === zoneId ? { ...z, status } : z)),
        );
        return;
      }

      fetchZones();
    });

    return unsubscribe;
  }, [companyId, subscribe, setZones, fetchZones]);
}
