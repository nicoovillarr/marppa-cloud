"use client";

import { useState } from "react";
import { Button } from "@/core/ui/Button";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { systemApi } from "../api/system.api";

interface SystemResetDialogProps {
  onDone?: () => void;
}

export function SystemResetDialog({ onDone }: SystemResetDialogProps) {
  const [hard, setHard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);

    try {
      await systemApi.reset(hard);
      closeCurrentDialog();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Compares this host against the database and removes anything the
        database does not know about: virtual machines, zones, bridges, DHCP
        configs, port forwards and portals. Resources that exist in the database
        are rebuilt, not deleted.
      </p>

      <label className="flex gap-3 items-start p-3 rounded border border-red-500/40 bg-red-500/10 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={hard}
          onChange={(event) => setHard(event.target.checked)}
        />
        <span className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Hard reset</span>
          <span className="text-xs">
            Wipes every resource on the host whether or not the database knows
            about it, and then deletes every worker, zone, node, fiber, portal
            and transponder row from the database. This cannot be undone.
          </span>
        </span>
      </label>

      {hard && (
        <p className="text-xs font-semibold text-red-500">
          Everything will be destroyed. There is no backup and no way back.
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button
          text="Cancel"
          style="secondary"
          onClick={() => closeCurrentDialog()}
        />
        <Button
          text={hard ? "Hard reset" : "Reset"}
          style="danger"
          onClick={confirm}
        />
      </div>
    </div>
  );
}
