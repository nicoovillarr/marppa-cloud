"use client";

import { ResourceStatus } from "@/core/models/resource-status.enum";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { WorkerResponseDto } from "@/hive/api/worker.api.types";
import { useWorker } from "@/hive/models/use-worker";
import { AtomWithRelationsResponseDto } from "@/nucleus/api/atom.api.types";
import { useAtom } from "@/nucleus/models/use-atom";
import { useZone } from "@/mesh/models/use-zone";
import { usePortal } from "@/orbit/models/use-portal";
import Link from "next/link";
import { useEffect } from "react";
import {
  LuActivity,
  LuBox,
  LuContainer,
  LuNetwork,
  LuServer,
} from "react-icons/lu";
import { ZoneWithNodes } from "src/features/mesh/api/zone.api.types";
import { PortalWithTranspondersResponseDto } from "src/features/orbit/api/portal.api.types";
import { useUser } from "src/features/users/model/useUser";

const CardLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="flex text-sm items-center gap-2 mt-4 border border-border rounded-lg justify-center p-2 text-ink hover:text-accent-ink hover:bg-surface-sunken transition-colors"
  >
    {label}
  </Link>
);

const Overview = ({
  workers,
  atoms,
  zones,
  portals,
}: {
  workers: WorkerResponseDto[];
  atoms: AtomWithRelationsResponseDto[];
  zones: ZoneWithNodes[];
  portals: PortalWithTranspondersResponseDto[];
}) => {
  const zoneNodesCount =
    zones?.flatMap((zone) => zone.nodes || []).length || 0;

  return (
    <section className="w-full">
      <h2 className="font-display font-semibold text-xl mb-4">
        Your three pillars
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <header className="flex items-center gap-2 mb-4">
            <h3 className="font-medium w-full line-clamp-1">Workers</h3>
            <LuServer className="h-4 w-4 shrink-0 text-accent" />
          </header>

          <h4 className="font-display font-bold text-3xl">
            {workers?.length || 0}
          </h4>
          <p className="text-sm text-ink-muted">VMs under your control</p>

          <ul className="mt-4">
            <li className="flex items-center">
              <span className="w-full">Active</span>{" "}
              <span className="text-ink-muted">
                {workers?.filter((w) => w.status === ResourceStatus.ACTIVE)
                  .length || 0}
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-full">Inactive</span>{" "}
              <span className="text-ink-muted">
                {workers?.filter((w) => w.status === ResourceStatus.INACTIVE)
                  .length || 0}
              </span>
            </li>
          </ul>

          <CardLink href="/dashboard/hive/workers" label="View Hive" />
        </Card>
        <Card>
          <header className="flex items-center gap-2 mb-4">
            <h3 className="font-medium w-full line-clamp-1">Zones</h3>
            <LuNetwork className="h-4 w-4 shrink-0 text-accent" />
          </header>

          <h4 className="font-display font-bold text-3xl">
            {zones?.length || 0}
          </h4>
          <p className="text-sm text-ink-muted">Networks you manage</p>

          <ul className="mt-4">
            <li className="flex items-center">
              <span className="w-full">Active</span>{" "}
              <span className="text-ink-muted">
                {zones?.filter((z) => z.status === ResourceStatus.ACTIVE)
                  .length || 0}
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-full">Connected nodes</span>{" "}
              <span className="text-ink-muted">{zoneNodesCount}</span>
            </li>
          </ul>

          <CardLink href="/dashboard/mesh/zones" label="View Mesh" />
        </Card>
        <Card>
          <header className="flex items-center gap-2 mb-4">
            <h3 className="font-medium w-full line-clamp-1">Atoms</h3>
            <LuBox className="h-4 w-4 shrink-0 text-accent" />
          </header>

          <h4 className="font-display font-bold text-3xl">
            {atoms?.length || 0}
          </h4>
          <p className="text-sm text-ink-muted">Containers in your zones</p>

          <ul className="mt-4">
            <li className="flex items-center">
              <span className="w-full">Active</span>{" "}
              <span className="text-ink-muted">
                {atoms?.filter((atom) => atom.status === ResourceStatus.ACTIVE)
                  .length || 0}
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-full">Unassigned</span>{" "}
              <span className="text-ink-muted">
                {atoms?.filter((atom) => !atom.node).length || 0}
              </span>
            </li>
          </ul>

          <CardLink href="/dashboard/nucleus/atoms" label="View Nucleus" />
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <header className="flex items-center gap-2 mb-4">
            <h3 className="font-medium w-full line-clamp-1">Orbit</h3>
            <LuContainer className="h-4 w-4 shrink-0 text-accent" />
          </header>

          <h4 className="font-display font-bold text-3xl">
            {portals?.length || 0}
          </h4>
          <p className="text-sm text-ink-muted">Active DDNS portals</p>

          <CardLink href="/dashboard/orbit/portals" label="View Orbit" />
        </Card>
      </div>
    </section>
  );
};

const RecentActivity = ({ hasResources }: { hasResources: boolean }) => {
  return (
    <Card
      title="Recent activity"
      subtitle="What happened across your infrastructure"
      icon={LuActivity}
      className="w-full"
    >
      {hasResources ? (
        <p className="text-sm text-ink-muted">
          A detailed operations log isn't available in this view yet. Check
          each resource from its module to see its current state.
        </p>
      ) : (
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <p className="text-sm text-ink-muted max-w-sm">
            You haven't created any resources yet. Start with a network in
            Mesh or a VM in Hive, and you'll see every step of the operation
            here.
          </p>
          <div className="flex gap-2">
            <Button
              text="Create Zone"
              icon={<LuNetwork />}
              href="/dashboard/mesh/zones/create"
              style="secondary"
            />
            <Button
              text="Create Worker"
              icon={<LuServer />}
              href="/dashboard/hive/workers/create"
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export function DashboardDetails() {
  const { user } = useUser();

  const { workers, fetchWorkers } = useWorker();
  const { zones, fetchZones } = useZone();
  const { portals, fetchPortals } = usePortal();
  const { atoms, fetchAtoms } = useAtom();

  useEffect(() => {
    fetchWorkers();
    fetchZones();
    fetchPortals();
    fetchAtoms();
  }, []);

  const hasResources =
    (workers?.length || 0) > 0 ||
    (zones?.length || 0) > 0 ||
    (atoms?.length || 0) > 0 ||
    (portals?.length || 0) > 0;

  return (
    <main className="flex flex-col gap-8 w-full mx-auto">
      <header className="w-full flex flex-col">
        <h1 className="font-display font-bold text-2xl sm:text-3xl">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-ink-muted">
          Here's what's happening with your infrastructure today.
        </p>
      </header>

      <Overview workers={workers} atoms={atoms} zones={zones} portals={portals} />

      <RecentActivity hasResources={hasResources} />
    </main>
  );
}
