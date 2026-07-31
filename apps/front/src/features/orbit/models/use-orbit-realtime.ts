"use client";

import { useEffect, useRef } from "react";
import { useWebSocket } from "@/core/ui/WebsocketProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { usePortalStore } from "./portal.store";
import { usePortal } from "./use-portal";

export function useOrbitRealtime() {
  const { subscribe, companyId } = useWebSocket();
  const setPortals = usePortalStore((s) => s.setPortals);
  const { fetchPortals } = usePortal();

  useEffect(() => {
    if (!companyId) return;

    const channel = `company:${companyId}:orbit`;

    const unsubscribe = subscribe(channel, (message) => {
      const type: string | undefined = message?.type;
      const payload = message?.data ?? {};
      const portalId: string | undefined = payload.portalId;
      const status: ResourceStatus | undefined = payload.data?.status;

      if (payload.transponderId) return;

      const portals = usePortalStore.getState().portals;
      const knownPortal = portalId && portals.some((p) => p.id === portalId);

      if (type === "DELETED" && portalId && knownPortal) {
        setPortals(portals.filter((p) => p.id !== portalId));
        return;
      }

      if (type === "UPDATED" && portalId && status && knownPortal) {
        setPortals(
          portals.map((p) => (p.id === portalId ? { ...p, status } : p)),
        );
        return;
      }

      fetchPortals();
    });

    return unsubscribe;
  }, [companyId, subscribe, setPortals, fetchPortals]);
}

export function usePortalRealtime(portalId: string, onChanged: () => void) {
  const { subscribe, companyId } = useWebSocket();
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    if (!companyId || !portalId) return;

    const channel = `company:${companyId}:orbit`;

    const unsubscribe = subscribe(channel, (message) => {
      if (message?.data?.portalId !== portalId) return;
      onChangedRef.current();
    });

    return unsubscribe;
  }, [companyId, portalId, subscribe]);
}
