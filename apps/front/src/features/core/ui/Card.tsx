import { IconType } from "react-icons";

interface CardProps {
  className?: string;
  children?: React.ReactNode;
  icon?: IconType | React.ComponentType<{ className?: string }>;
  title?: string;
  subtitle?: string;
}

export function Card({
  className = "",
  children,
  icon: Icon,
  title,
  subtitle,
}: CardProps) {
  return (
    <div className={`border border-border rounded-xl p-4 bg-surface-raised ${className}`}>
      {title && (
        <header className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-amber" />}
            <h3 className="font-display font-semibold w-full line-clamp-1 text-xl">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-sm text-ink-muted line-clamp-1">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
