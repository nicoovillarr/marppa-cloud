import { EXTERNAL_LINKS } from "@/core/models/external-links";

export function Footer() {
  return (
    <footer className="flex flex-col items-start justify-between gap-2 border-t border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:px-6">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">
        Marppa Cloud — self-hosted infrastructure control plane
      </p>
      <nav className="flex items-center gap-4">
        <a
          href={EXTERNAL_LINKS.repository}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ink-muted hover:text-accent-ink"
        >
          Repository
        </a>
        <a
          href={EXTERNAL_LINKS.linkedin}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ink-muted hover:text-accent-ink"
        >
          LinkedIn
        </a>
        <a
          href={EXTERNAL_LINKS.license}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ink-muted hover:text-accent-ink"
        >
          MIT License
        </a>
      </nav>
    </footer>
  );
}
