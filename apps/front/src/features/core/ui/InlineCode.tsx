export function InlineCode({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <code
      className={`bg-surface-sunken text-ink px-1 py-0.5 rounded font-mono text-sm ${className}`}
    >
      {code}
    </code>
  );
}
