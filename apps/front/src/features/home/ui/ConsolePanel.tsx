import { ReactNode } from "react";

interface ConsolePanelProps {
  title: string;
  description?: string;
  meta?: string;
  children: ReactNode;
}

export function ConsolePanel({
  title,
  description,
  meta,
  children,
}: ConsolePanelProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
          )}
        </div>
        {meta && (
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
            {meta}
          </span>
        )}
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}
