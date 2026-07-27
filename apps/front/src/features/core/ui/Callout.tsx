import { ReactNode } from "react";

export function Callout({
  text,
  icon,
  className,
}: {
  text: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full p-4 bg-amber-tint border border-amber/30 rounded-xl flex gap-x-3 items-center ${className}`}
    >
      <div className="shrink-0 text-2xl text-amber-ink">{icon}</div>
      <p className="text-amber-ink">{text}</p>
    </div>
  );
}
