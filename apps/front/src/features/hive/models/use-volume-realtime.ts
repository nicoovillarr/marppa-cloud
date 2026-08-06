"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/core/ui/WebsocketProvider";

export function useVolumeRealtime(onChanged: () => void) {
  const { subscribe, companyId } = useWebSocket();

  useEffect(() => {
    if (!companyId) return;

    return subscribe(`company:${companyId}:hive`, (message) => {
      if (message?.data?.diskId != null) {
        onChanged();
      }
    });
  }, [companyId, subscribe, onChanged]);
}
