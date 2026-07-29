"use client";

import Link from "next/link";
import { IconType } from "react-icons";
import {
  LuArrowRight,
  LuBox,
  LuExternalLink,
  LuGithub,
  LuGlobe,
  LuInfo,
  LuLinkedin,
  LuScale,
  LuServer,
  LuWaypoints,
} from "react-icons/lu";
import { useAuth } from "@/auth/models/useAuth";
import { EXTERNAL_LINKS } from "@/core/models/external-links";
import { ConsolePanel } from "./ConsolePanel";

const PROPERTIES: { key: string; value: string }[] = [
  { key: "Repository", value: "nicoovillarr/marppa-cloud" },
  { key: "License", value: "MIT" },
  { key: "Console", value: "Next.js 15, Tailwind, Zustand" },
  { key: "API", value: "NestJS, PostgreSQL, Redis" },
  { key: "Host agent", value: "Node, libvirt, nftables" },
  { key: "Runs on", value: "One machine you already own" },
];

const MODULES: {
  icon: IconType;
  module: string;
  resource: string;
  managed: string;
}[] = [
  {
    icon: LuServer,
    module: "Hive",
    resource: "Workers",
    managed: "libvirt virtual machines provisioned with cloud-init",
  },
  {
    icon: LuWaypoints,
    module: "Mesh",
    resource: "Zones",
    managed: "Linux bridges, DHCP leases and nftables rules",
  },
  {
    icon: LuBox,
    module: "Nucleus",
    resource: "Atoms",
    managed: "Containers, with each capability graded by blast radius",
  },
  {
    icon: LuGlobe,
    module: "Orbit",
    resource: "Portals",
    managed: "DDNS records and TCP tunnels into the host",
  },
];

const LINKS: {
  icon: IconType;
  label: string;
  detail: string;
  href: string;
}[] = [
  {
    icon: LuGithub,
    label: "Source code",
    detail: "github.com/nicoovillarr/marppa-cloud",
    href: EXTERNAL_LINKS.repository,
  },
  {
    icon: LuLinkedin,
    label: "Nicolás Villar",
    detail: "linkedin.com/in/nicolás-villar",
    href: EXTERNAL_LINKS.linkedin,
  },
  {
    icon: LuScale,
    label: "License",
    detail: "MIT",
    href: EXTERNAL_LINKS.license,
  },
];

function ResourceHeader({ consoleHref, consoleLabel }: {
  consoleHref: string;
  consoleLabel: string;
}) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Open source · Self-hosted IaaS
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          marppa-cloud
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-muted">
          A control plane for a single physical host: create virtual machines,
          networks and containers from a web console instead of ssh-ing in and
          running scripts by hand.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        <a
          href={EXTERNAL_LINKS.repository}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <LuGithub className="h-4 w-4" />
          View the code
        </a>
        <Link
          href={consoleHref}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-4 py-2 font-medium text-ink transition hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {consoleLabel}
          <LuArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

function DeploymentNotice() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-accent/25 bg-accent-tint px-4 py-3">
      <LuInfo className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <p className="text-sm text-accent-ink">
        The console at this address is a live deployment running on my own
        hardware. Sign in to look around — provisioning real resources is
        limited to my account.
      </p>
    </div>
  );
}

export function HomeLanding() {
  const { isLoggedIn } = useAuth();

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <ResourceHeader
          consoleHref={isLoggedIn ? "/dashboard" : "/login"}
          consoleLabel={isLoggedIn ? "Open the console" : "Sign in"}
        />

        <DeploymentNotice />

        <ConsolePanel title="Summary" meta="Overview">
          <p className="max-w-3xl text-sm text-ink-muted">
            The console talks to a NestJS API, which queues work for an agent
            running on the host. The agent is what actually calls libvirt,
            writes nftables rules and starts containers, and reports every step
            back over a WebSocket, so an action in the UI maps to something you
            can verify on the machine.
          </p>

          <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {PROPERTIES.map(({ key, value }) => (
              <div
                key={key}
                className="flex flex-col gap-0.5 border-t border-border pt-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <dt className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                  {key}
                </dt>
                <dd className="text-sm text-ink sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </ConsolePanel>

        <ConsolePanel
          title="Modules"
          description="Each module owns one kind of resource on the host."
          meta={`${MODULES.length} modules`}
        >
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 pb-2 font-mono text-xs font-medium uppercase tracking-wide text-ink-faint sm:px-5">
                    Module
                  </th>
                  <th className="px-4 pb-2 font-mono text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Resource
                  </th>
                  <th className="px-4 pb-2 font-mono text-xs font-medium uppercase tracking-wide text-ink-faint sm:px-5">
                    Managed with
                  </th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map(({ icon: Icon, module, resource, managed }) => (
                  <tr key={module} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <Icon className="h-4 w-4 shrink-0 text-accent" />
                        {module}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-muted">
                      {resource}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted sm:px-5">
                      {managed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ConsolePanel>

        <ConsolePanel title="Links">
          <ul className="flex flex-col">
            {LINKS.map(({ icon: Icon, label, detail, href }) => (
              <li key={href} className="border-b border-border last:border-b-0">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {label}
                    </span>
                    <span className="block truncate font-mono text-xs text-ink-faint">
                      {detail}
                    </span>
                  </span>
                  <LuExternalLink className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-accent" />
                </a>
              </li>
            ))}
          </ul>
        </ConsolePanel>
      </div>
    </main>
  );
}
