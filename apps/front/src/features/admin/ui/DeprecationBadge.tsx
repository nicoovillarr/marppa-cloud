interface DeprecationBadgeProps {
  deprecatedAt: Date | string | null;
}

export function DeprecationBadge({ deprecatedAt }: DeprecationBadgeProps) {
  const isDeprecated = deprecatedAt != null;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${isDeprecated
        ? "bg-status-danger-tint text-status-danger"
        : "bg-accent-tint text-accent"
        }`}
    >
      {isDeprecated ? "Deprecated" : "Active"}
    </span>
  );
}
