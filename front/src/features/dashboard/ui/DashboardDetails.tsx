"use client";

import { Card } from "@/core/ui/Card";
import { WorkerResponseDto } from "@/hive/api/worker.api.types";
import { useWorker } from "@/hive/models/use-worker";
import { useZone } from "@/mesh/models/use-zone";
import { usePortal } from "@/orbit/models/use-portal";
import Link from "next/link";
import { useEffect } from "react";
import {
  LuActivity,
  LuChartColumn,
  LuContainer,
  LuCreditCard,
  LuNetwork,
  LuServer,
} from "react-icons/lu";
import { ZoneWithNodes } from "src/features/mesh/api/zone.api.types";
import { PortalWithTranspondersResponseDto } from "src/features/orbit/api/portal.api.types";
import { useUser } from "src/features/users/model/useUser";

const Overview = ({
  workers,
  zones,
  portals,
}: {
  workers: WorkerResponseDto[];
  zones: ZoneWithNodes[];
  portals: PortalWithTranspondersResponseDto[];
}) => {
  const createdWorkersLastMonth = workers
    ?.filter(
      (worker) => new Date(worker.createdAt).getMonth() === new Date().getMonth() - 1
    )
    .reduce((acc) => acc + 1, 0);

  const createdZonesLastMonth = zones
    ?.filter(
      (zone) => new Date(zone.createdAt).getMonth() === new Date().getMonth() - 1
    )
    .reduce((acc) => acc + 1, 0);

  const createdPortalsLastMonth = portals
    ?.filter(
      (portal) =>
        new Date(portal.createdAt).getMonth() === new Date().getMonth() - 1
    )
    .reduce((acc) => acc + 1, 0);

  const zoneNodesCount =
    zones
      ?.filter((zone) => zone.status === "running")
      .flatMap((zone) => zone.nodes || []).length || 0;

  return (
    <section className="w-full">
      <h2 className="font-semibold text-xl mb-2">Service overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <header className="flex items-center gap-2 mb-4">
            <h3 className="font-medium w-full line-clamp-1">Workers</h3>
            <LuServer className="h-4 w-4 shrink-0" />
          </header>

          <h4 className="font-bold text-3xl">{workers?.length || 0}</h4>
          <p className="text-sm text-gray-500">
            +{createdWorkersLastMonth} from last month
          </p>

          <ul className="mt-4">
            <li className="flex items-center">
              <span className="w-full">Running</span>{" "}
              <span className="text-gray-600">
                {workers?.filter((worker) => worker.status === "running").length || 0}
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-full">Stopped</span>{" "}
              <span className="text-gray-600">
                {workers?.filter((worker) => worker.status === "stopped").length || 0}
              </span>
            </li>
          </ul>

          <Link
            href="/dashboard/hive/workers"
            className="flex text-sm items-center gap-2 mt-4 border border-gray-200 rounded justify-center p-2 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
          >
            View Hive
          </Link>
        </Card>
        <Card>
          <header className="flex items-center gap-2 mb-4">
            <h3 className="font-medium w-full line-clamp-1">Zones</h3>
            <LuNetwork className="h-4 w-4 shrink-0" />
          </header>

          <h4 className="font-bold text-3xl">{zones?.length || 0}</h4>
          <p className="text-sm text-gray-500">
            +{createdZonesLastMonth} from last month
          </p>

          <ul className="mt-4">
            <li className="flex items-center">
              <span className="w-full">Active</span>{" "}
              <span className="text-gray-600">
                {zones?.filter((zone) => zone.status === "running").length || 0}
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-full">Nodes</span>{" "}
              <span className="text-gray-600">{zoneNodesCount}</span>
            </li>
          </ul>

          <Link
            href="/dashboard/mesh/zones"
            className="flex text-sm items-center gap-2 mt-4 border border-gray-200 rounded justify-center p-2 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
          >
            View Mesh
          </Link>
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <header className="flex items-center gap-2 mb-4">
            <h3 className="font-medium w-full line-clamp-1">Orbit</h3>
            <LuContainer className="h-4 w-4 shrink-0" />
          </header>

          <h4 className="font-bold text-3xl">{portals?.length || 0}</h4>
          <p className="text-sm text-gray-500">
            +{createdPortalsLastMonth} from last month
          </p>

          <Link
            href="/dashboard/orbit/portals"
            className="flex text-sm items-center gap-2 mt-4 border border-gray-200 rounded justify-center p-2 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
          >
            View Orbit
          </Link>
        </Card>
      </div>
    </section>
  );
};

const Billing = () => {
  return (
    <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card
        icon={LuChartColumn}
        title="Resource Usage"
        subtitle="Current month usage across all services"
      >
        <ul>
          <li className="mb-4">
            <div className="flex items-center mb-1">
              <span className="flex-1">CPU Hours</span>{" "}
              <span className="text-gray-600">1,240 / 2,000</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-black rounded-full"
                style={{ width: "62%" }}
              ></div>
            </div>
          </li>

          <li className="mb-4">
            <div className="flex items-center mb-1">
              <span className="flex-1">Storage (GB)</span>{" "}
              <span className="text-gray-600">8.3 / 14</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-black rounded-full"
                style={{ width: "60%" }}
              ></div>
            </div>
          </li>

          <li className="mb-2">
            <div className="flex items-center mb-1">
              <span className="flex-1">Bandwidth (GB)</span>{" "}
              <span className="text-gray-600">120 / 200</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-black rounded-full"
                style={{ width: "40%" }}
              ></div>
            </div>
          </li>
        </ul>
      </Card>
      <Card
        icon={LuCreditCard}
        title="Billing Overview"
        subtitle="Current month charges and payment status"
      >
        <div className="flex flex-col mb-6">
          <span className="text-2xl font-bold">$247.83</span>
          <span className="text-sm text-gray-500">Due in 5 days</span>
        </div>

        <ul className="gap-y-4">
          <li className="flex items-center mb-2">
            <span className="flex-1">Hive</span>{" "}
            <span className="text-gray-600">$156.20</span>
          </li>

          <li className="flex items-center mb-2">
            <span className="flex-1">Mesh</span>{" "}
            <span className="text-gray-600">$32.40</span>
          </li>

          <li className="flex items-center mb-2">
            <span className="flex-1">Nibble</span>{" "}
            <span className="text-gray-600">$59.23</span>
          </li>

          <hr className="my-4 border-gray-300" />

          <li className="flex items-center text-lg font-semibold">
            <span className="flex-1">Estimated Total</span> <span>247.83</span>
          </li>
        </ul>
      </Card>
    </section>
  );
};

const RecentActivity = () => {
  return (
    <Card
      title="Recent Activity"
      subtitle="Last 30 days"
      icon={LuActivity}
      className="w-full"
    >
      <ul className="space-y-4">
        <li className="flex items-center">
          <div>
            <h4>VPS instance "web-server-01" started</h4>
            <p className="text-xs text-gray-500">2 minutes ago</p>
          </div>

          <span className="ml-auto text-gray-700 bg-gray-100 rounded-full px-2 py-0.5 text-sm font-semibold">
            VPS
          </span>
        </li>
        <li className="flex items-center">
          <div>
            <h4>Container "nginx-app" deployed</h4>
            <p className="text-xs text-gray-500">1 hour ago</p>
          </div>

          <span className="ml-auto text-gray-700 bg-gray-100 rounded-full px-2 py-0.5 text-sm font-semibold">
            Container
          </span>
        </li>
        <li className="flex items-center">
          <div>
            <h4>VPC network "prod-network" created</h4>
            <p className="text-xs text-gray-500">3 hours ago</p>
          </div>

          <span className="ml-auto text-gray-700 bg-gray-100 rounded-full px-2 py-0.5 text-sm font-semibold">
            VPC
          </span>
        </li>
        <li className="flex items-center">
          <div>
            <h4>VPS instance "db-server-02" stopped</h4>
            <p className="text-xs text-gray-500">5 hours ago</p>
          </div>

          <span className="ml-auto text-gray-700 bg-gray-100 rounded-full px-2 py-0.5 text-sm font-semibold">
            VPS
          </span>
        </li>
      </ul>

      <Link
        href="/dashboard/vps"
        className="flex text-sm items-center gap-2 mt-4 border border-gray-200 rounded justify-center p-2 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
      >
        View all activity
      </Link>
    </Card>
  );
};

export function DashboardDetails() {
  const { user } = useUser();

  const {
    workers,
    fetchWorkers,
  } = useWorker();

  const {
    zones,
    fetchZones,
  } = useZone();

  const {
    portals,
    fetchPortals,
  } = usePortal();

  useEffect(() => {
    fetchWorkers();
    fetchZones();
    fetchPortals();
  }, []);

  return (
    <main className="flex flex-col gap-8 w-full mx-auto">
      <header className="w-full flex flex-col">
        <h1 className="font-bold text-2xl">
          Welcome back, {user?.name || "User"}
        </h1>
        <p className="text-sm text-gray-500">
          Here's what's happening with your cloud infrastructure today.
        </p>
      </header>

      <Overview
        workers={workers}
        zones={zones}
        portals={portals}
      />

      <Billing />

      <RecentActivity />
    </main>
  );
}
