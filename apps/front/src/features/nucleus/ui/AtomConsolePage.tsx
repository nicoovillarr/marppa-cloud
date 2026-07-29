"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ReactTimeAgo from "react-timeago";
import { LuArrowLeft } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { InlineCode } from "@/core/ui/InlineCode";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { useAtom } from "../models/use-atom";
import { imageRef } from "./AtomManageDialog";

const AtomConsole = dynamic(
  () => import("./AtomConsole").then((mod) => mod.AtomConsole),
  { ssr: false },
);

export function AtomConsolePage() {
  const { atomId } = useParams<{ atomId: string }>();
  const router = useRouter();
  const { atoms, fetchAtom } = useAtom();
  const { setFillHeight } = useDashboardLayout();
  const [loaded, setLoaded] = useState(false);

  const atom = atoms.find((a) => a.id === atomId);
  const isRunning = atom?.status === ResourceStatus.ACTIVE;

  useEffect(() => {
    fetchAtom(atomId).finally(() => setLoaded(true));
  }, [atomId]);

  useEffect(() => {
    setFillHeight(true);
    return () => setFillHeight(false);
  }, []);

  const goBack = () => router.push("/dashboard/nucleus/atoms");

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button icon={<LuArrowLeft />} style="secondary" onClick={goBack} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{atom?.name ?? "Console"}</p>
            {atom && (
              <p className="text-xs text-ink-muted font-mono truncate">
                {imageRef(atom.image)}
              </p>
            )}
          </div>
        </div>

        {atom && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-ink-muted">Status</span>
              <StatusBadge status={atom.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ink-muted">IP</span>
              <InlineCode code={atom.node?.ipAddress ?? "not assigned"} />
            </div>
            {atom.updatedAt && (
              <div className="flex items-center gap-2">
                <span className="text-ink-muted">Since</span>
                <ReactTimeAgo date={atom.updatedAt} />
              </div>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 min-w-0">
        {!loaded ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !atom ? (
          <p className="text-sm text-ink-muted">Atom not found.</p>
        ) : isRunning ? (
          <AtomConsole atomId={atom.id} />
        ) : (
          <p className="text-sm text-ink-muted">
            This atom is not running — start it from the atoms list to open a console.
          </p>
        )}
      </div>
    </div>
  );
}
