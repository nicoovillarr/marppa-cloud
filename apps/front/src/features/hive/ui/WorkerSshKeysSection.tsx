"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LuTrash2 } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { workerSshKeyApi, WorkerSshKeyDto } from "../api/worker-ssh-key.api";

interface WorkerSshKeysSectionProps {
  workerId: string;
  live: boolean;
}

export function WorkerSshKeysSection({ workerId, live }: WorkerSshKeysSectionProps) {
  const [keys, setKeys] = useState<WorkerSshKeyDto[]>([]);
  const [name, setName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setKeys(await workerSshKeyApi.list(workerId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load SSH keys");
    }
  }, [workerId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setBusy(true);
    try {
      await workerSshKeyApi.create(workerId, name.trim(), publicKey.trim());
      setName("");
      setPublicKey("");
      toast.success("Key added; applying it to the VM");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add the key");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (key: WorkerSshKeyDto) => {
    setBusy(true);
    try {
      await workerSshKeyApi.remove(workerId, key.id);
      toast.success(`${key.name} removed; applying it to the VM`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the key");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Authorized SSH keys</h3>

      <p className="text-xs text-gray-500">
        {live
          ? "Changes are written to the running VM through its guest agent."
          : "The VM is off, so changes are written straight to its disk."}
      </p>

      {keys.length === 0 ? (
        <p className="text-xs text-gray-500">No keys registered for this worker.</p>
      ) : (
        <ul className="space-y-1">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between gap-2 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-medium">{key.name}</span>
                <span className="text-xs text-gray-500 truncate">
                  {key.publicKey.slice(0, 42)}…
                </span>
              </span>
              <Button
                icon={<LuTrash2 />}
                style="danger"
                disabled={busy}
                onClick={() => remove(key)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <input
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent"
          placeholder="Label (e.g. laptop)"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <textarea
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent font-mono"
          rows={3}
          placeholder="ssh-ed25519 AAAAC3... you@laptop"
          value={publicKey}
          onChange={(event) => setPublicKey(event.target.value)}
        />
        <Button
          text="Add key"
          disabled={busy || !name.trim() || !publicKey.trim()}
          onClick={add}
        />
      </div>
    </section>
  );
}
