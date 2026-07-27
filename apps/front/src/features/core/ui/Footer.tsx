export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 sm:px-6 bg-surface-raised border-t border-border">
      <p className="text-sm text-ink-faint">
        Marppa Cloud — your infrastructure, in view.
      </p>
      <nav className="flex items-center gap-4">
        <a href="/privacy" className="text-sm text-ink-muted hover:text-amber-ink">
          Privacy
        </a>
        <a href="/terms" className="text-sm text-ink-muted hover:text-amber-ink">
          Terms
        </a>
      </nav>
    </footer>
  );
}
