"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ReactTimeAgo from "react-timeago";
import { LuArrowLeft } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { InlineCode } from "@/core/ui/InlineCode";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { useAtom } from "../models/use-atom";
import { imageRef } from "./AtomManageDialog";

const AtomConsole = dynamic(
  () => import("./AtomConsole").then((mod) => mod.AtomConsole),
  { ssr: false },
);

const MIN_CONSOLE_HEIGHT = 320;
const CONSOLE_BOTTOM_MARGIN = 32;

export function AtomConsolePage() {
  const { atomId } = useParams<{ atomId: string }>();
  const router = useRouter();
  const { atoms, fetchAtom } = useAtom();
  const [loaded, setLoaded] = useState(false);

  const atom = atoms.find((a) => a.id === atomId);
  const isRunning = atom?.status === ResourceStatus.ACTIVE;

  useEffect(() => {
    fetchAtom(atomId).finally(() => setLoaded(true));
  }, [atomId]);

  const consoleWrapperRef = useRef<HTMLDivElement>(null);
  const [consoleHeight, setConsoleHeight] = useState(480);

  useEffect(() => {
    if (!isRunning) return;

    const recomputeHeight = () => {
      const top = consoleWrapperRef.current?.getBoundingClientRect().top ?? 0;
      setConsoleHeight(
        Math.max(MIN_CONSOLE_HEIGHT, window.innerHeight - top - CONSOLE_BOTTOM_MARGIN),
      );
    };

    recomputeHeight();
    window.addEventListener("resize", recomputeHeight);
    return () => window.removeEventListener("resize", recomputeHeight);
  }, [isRunning]);

  if (!loaded) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  if (!atom) {
    return <p className="text-sm text-ink-muted">Atom not found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            icon={<LuArrowLeft />}
            style="secondary"
            onClick={() => router.push("/dashboard/nucleus/atoms")}
          />
          <div className="min-w-0">
            <p className="font-semibold truncate">{atom.name}</p>
            <p className="text-xs text-ink-muted font-mono truncate">
              {imageRef(atom.image)}
            </p>
          </div>
        </div>

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
      </header>

      {isRunning ? (
        <div ref={consoleWrapperRef} style={{ height: consoleHeight }}>
          <AtomConsole atomId={atom.id} />
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          This atom is not running — start it from the atoms list to open a console.
        </p>
      )}
    </div>
  );
}
