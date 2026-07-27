"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LuTrash2 } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { atomEnvVarApi, AtomEnvVarDto } from "../api/atom-env-var.api";

interface AtomEnvVarsSectionProps {
  atomId: string;
  editable: boolean;
}

export function AtomEnvVarsSection({ atomId, editable }: AtomEnvVarsSectionProps) {
  const [envVars, setEnvVars] = useState<AtomEnvVarDto[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEnvVars(await atomEnvVarApi.list(atomId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load env vars");
    }
  }, [atomId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleReveal = (id: number) => {
    const next = new Set(revealed);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setRevealed(next);
  };

  const upsert = async () => {
    setBusy(true);
    try {
      await atomEnvVarApi.upsert(atomId, key.trim(), value);
      setKey("");
      setValue("");
      toast.success("Saved; it applies on the next start");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the variable");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (envVar: AtomEnvVarDto) => {
    setBusy(true);
    try {
      await atomEnvVarApi.remove(atomId, envVar.id);
      toast.success(`${envVar.key} removed`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the variable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Environment variables</h3>

      <p className="text-xs text-ink-muted">
        {editable
          ? "The container is rebuilt from these on every start."
          : "Stop the atom to edit them — the running container was built from the values it had at start."}
      </p>

      {envVars.length === 0 ? (
        <p className="text-xs text-ink-muted">No variables set for this atom.</p>
      ) : (
        <ul className="space-y-1">
          {envVars.map((envVar) => (
            <li
              key={envVar.id}
              className="flex items-center justify-between gap-2 text-sm border border-border dark: rounded px-2 py-1"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-medium font-mono">{envVar.key}</span>
                <button
                  type="button"
                  className="text-xs text-ink-muted truncate text-left font-mono hover:text-amber-ink"
                  onClick={() => toggleReveal(envVar.id)}
                >
                  {revealed.has(envVar.id) ? envVar.value : "•••••••• (click to reveal)"}
                </button>
              </span>
              {editable && (
                <Button
                  icon={<LuTrash2 />}
                  style="danger"
                  disabled={busy}
                  onClick={() => remove(envVar)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="space-y-2">
          <input
            className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent font-mono"
            placeholder="POSTGRES_PASSWORD"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
          <input
            className="w-full text-sm border border-border dark: rounded px-2 py-1 bg-transparent font-mono"
            placeholder="value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Button
            text="Save variable"
            disabled={busy || !key.trim() || !value}
            onClick={upsert}
          />
        </div>
      )}
    </section>
  );
}
