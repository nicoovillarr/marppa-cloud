"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuArrowRight,
  LuBox,
  LuContainer,
  LuNetwork,
  LuServer,
} from "react-icons/lu";
import { useAuth } from "@/auth/models/useAuth";

const TICKER_STEPS = [
  "Creating the bridge",
  "Configuring DHCP",
  "Applying firewall rules",
  "Zone is live",
];

function OperationTicker() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActiveStep(TICKER_STEPS.length);
      return;
    }

    const interval = setInterval(() => {
      setActiveStep((step) => (step + 1) % (TICKER_STEPS.length + 1));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-surface-sunken px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-status-progress animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-muted">
          Operation — creating Zone
        </span>
      </div>
      <div className="p-4 sm:p-5 font-mono text-sm">
        <p className="mb-3 text-ink">
          <span className="text-ink-muted">$</span> zone create prod-net
        </p>
        <ul className="space-y-2.5">
          {TICKER_STEPS.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <li key={step} className="flex items-center gap-2.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] transition-colors ${done
                    ? "bg-status-active text-surface"
                    : active
                      ? "bg-status-progress text-surface animate-pulse"
                      : "bg-surface-sunken text-ink-faint"
                    }`}
                >
                  {done ? "✓" : ""}
                </span>
                <span
                  className={
                    done || active ? "text-ink" : "text-ink-faint"
                  }
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const PILLARS = [
  {
    icon: LuServer,
    module: "Hive",
    name: "Workers",
    copy: "Real virtual machines, provisioned with virt-install and cloud-init. You pick the size, the image, the state.",
  },
  {
    icon: LuNetwork,
    module: "Mesh",
    name: "Zones",
    copy: "Subnets with their own bridge, DHCP, and firewall rules. Connect a Worker and you'll know exactly which IP it got.",
  },
  {
    icon: LuBox,
    module: "Nucleus",
    name: "Atoms",
    copy: "Containers with every requested capability graded by blast radius — nothing runs with more permission than it declared.",
  },
  {
    icon: LuContainer,
    module: "Orbit",
    name: "Portals",
    copy: "DDNS and tunnels so your infrastructure stays reachable, without exposing more than you meant to.",
  },
];

const STORY_STEPS = [
  {
    step: "1",
    title: "You ask for something",
    copy: "A short, honest form — a name, a network range, a size. No hidden defaults.",
  },
  {
    step: "2",
    title: "You watch it happen",
    copy: "No anonymous spinner. An Operation appears, with its steps ticking from pending to done.",
  },
  {
    step: "3",
    title: "You get the result",
    copy: "The IP it landed on, the credentials it generated, the state it's in now — handed to you once, clearly.",
  },
];

export function HomeLanding() {
  const { isLoggedIn } = useAuth();
  const primaryHref = isLoggedIn ? "/dashboard" : "/login";

  return (
    <div className="w-full">
      <section className="w-full border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-amber-ink">
              Self-hosted infrastructure
            </span>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4 mb-6">
              You'll never look at your infrastructure and wonder what's
              happening.
            </h1>
            <p className="text-base sm:text-lg text-ink-muted max-w-lg mb-8">
              Marppa Cloud runs your VMs, networks, and containers on your own
              hardware. Every action it takes shows up as a live operation —
              not a black box.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center gap-2 rounded-lg bg-amber text-amber-ink px-5 py-3 font-medium hover:brightness-95 transition"
              >
                {isLoggedIn ? "Go to dashboard" : "Enter the console"}
                <LuArrowRight />
              </Link>
              <a
                href="#pillars"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 font-medium text-ink hover:bg-surface-sunken transition"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <OperationTicker />
          </div>
        </div>
      </section>

      <section id="pillars" className="w-full border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">
            Four modules, one host
          </h2>
          <p className="text-ink-muted mb-10 max-w-2xl">
            Every module maps to a real, observable part of your
            infrastructure — nothing here is a rented abstraction.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLARS.map(({ icon: Icon, module, name, copy }) => (
              <div
                key={module}
                className="rounded-xl border border-border bg-surface-raised p-5 flex flex-col gap-3"
              >
                <Icon className="h-5 w-5 text-amber" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                    {module}
                  </p>
                  <h3 className="font-display font-semibold text-lg">
                    {name}
                  </h3>
                </div>
                <p className="text-sm text-ink-muted">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-10">
            Creating infrastructure feels less like praying, more like
            watching a recipe execute.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STORY_STEPS.map(({ step, title, copy }) => (
              <div key={step}>
                <span className="font-display text-3xl text-amber">
                  {step}
                </span>
                <h3 className="font-semibold text-lg mt-2 mb-1">{title}</h3>
                <p className="text-sm text-ink-muted">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 flex flex-col items-center text-center gap-6">
          <h2 className="font-display font-bold text-2xl sm:text-3xl max-w-xl">
            It's your hardware. You should be able to see everything it's
            doing.
          </h2>
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-lg bg-amber text-amber-ink px-6 py-3 font-medium hover:brightness-95 transition"
          >
            {isLoggedIn ? "Go to dashboard" : "Enter the console"}
            <LuArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
