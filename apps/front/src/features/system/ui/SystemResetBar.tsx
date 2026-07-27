"use client";

import { useEffect, useState } from "react";
import { Button } from "@/core/ui/Button";
import { useDialog } from "@/core/ui/DialogProvider";
import { systemApi } from "../api/system.api";
import { SystemResetDialog } from "./SystemResetDialog";

export function SystemResetBar() {
  const { showDialog } = useDialog();
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    let active = true;

    systemApi
      .availability()
      .then((availability) => {
        if (active) setCanReset(availability.canReset);
      })
      .catch(() => {
        if (active) setCanReset(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!canReset) return null;

  const openDialog = () =>
    showDialog({
      title: "Reset system",
      content: <SystemResetDialog />,
    });

  return (
    <section className="w-full flex items-center justify-end gap-4 flex-wrap rounded border border-status-danger bg-status-danger/10 p-4">
      <p className="text-sm text-right">
        <span className="font-semibold">Danger zone.</span> Reconciles this host
        against the database, deleting host resources the database does not know
        about.
      </p>

      <Button text="Reset" style="danger" onClick={openDialog} />
    </section>
  );
}
