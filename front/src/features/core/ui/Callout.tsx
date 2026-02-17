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
      className={`w-full p-4 bg-gradient-to-l from-blue-600 via-blue-400 to-blue-600 border border-gray-400 rounded-md flex gap-x-2 items-center ${className}`}
    >
      <div className="shrink-0 text-2xl text-blue-200">{icon}</div>
      <p className="text-white">{text}</p>
    </div>
  );
}
