"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/core/ui/WebsocketProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useUser } from "../../users/model/useUser";
import { useAtomStore } from "./atom.store";
import { useAtom } from "./use-atom";

export function useNucleusRealtime() {
  const { subscribe } = useWebSocket();
  const { user } = useUser();
  const setAtoms = useAtomStore((s) => s.setAtoms);
  const { fetchAtoms } = useAtom();

  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId) return;

    const channel = `company:${companyId}:nucleus`;

    const unsubscribe = subscribe(channel, (message) => {
      const type: string | undefined = message?.type;
      const payload = message?.data ?? {};
      const atomId: string | undefined = payload.atomId;
      const status: ResourceStatus | undefined = payload.data?.status;

      const atoms = useAtomStore.getState().atoms;
      const knownAtom = atomId && atoms.some((a) => a.id === atomId);

      if (type === "UPDATED" && atomId && status && knownAtom) {
        setAtoms(
          atoms.map((a) => (a.id === atomId ? { ...a, status } : a)),
        );
        return;
      }

      fetchAtoms();
    });

    return unsubscribe;
  }, [companyId, subscribe, setAtoms, fetchAtoms]);
}
