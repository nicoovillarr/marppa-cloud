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
import { useWorker } from "../models/use-worker";

const ResourceConsole = dynamic(
  () => import("@/core/ui/ResourceConsole").then((mod) => mod.ResourceConsole),
  { ssr: false },
);

export function WorkerConsolePage() {
  const { workerId } = useParams<{ workerId: string }>();
  const router = useRouter();
  const { workers, fetchWorker } = useWorker();
  const { setFillHeight } = useDashboardLayout();
  const [loaded, setLoaded] = useState(false);

  const worker = workers.find((w) => w.id === workerId);
  const isRunning = worker?.status === ResourceStatus.ACTIVE;

  useEffect(() => {
    fetchWorker(workerId).finally(() => setLoaded(true));
  }, [workerId]);

  useEffect(() => {
    setFillHeight(true);
    return () => setFillHeight(false);
  }, []);

  const goBack = () => router.push("/dashboard/hive/workers");

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button icon={<LuArrowLeft />} style="secondary" onClick={goBack} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{worker?.name ?? "Console"}</p>
            {worker && (
              <p className="text-xs text-ink-muted font-mono truncate">
                {worker.flavor?.name ?? "—"}
              </p>
            )}
          </div>
        </div>

        {worker && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-ink-muted">Status</span>
              <StatusBadge status={worker.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ink-muted">IP</span>
              <InlineCode code={worker.node?.ipAddress ?? "not assigned"} />
            </div>
            {worker.updatedAt && (
              <div className="flex items-center gap-2">
                <span className="text-ink-muted">Since</span>
                <ReactTimeAgo date={worker.updatedAt} />
              </div>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 min-w-0">
        {!loaded ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !worker ? (
          <p className="text-sm text-ink-muted">Worker not found.</p>
        ) : isRunning ? (
          <ResourceConsole resourceType="worker" resourceId={worker.id} />
        ) : (
          <p className="text-sm text-ink-muted">
            This worker is not running — start it from the workers list to open a console.
          </p>
        )}
      </div>
    </div>
  );
}
