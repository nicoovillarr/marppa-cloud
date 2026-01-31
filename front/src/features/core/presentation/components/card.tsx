import { IconType } from "react-icons";

export interface CardProps {
  className?: string;
  children?: React.ReactNode;
  icon?: IconType | React.ComponentType<{ className?: string }>;
  title?: string;
  subtitle?: string;
}

export default function Card({
  className = "",
  children,
  icon: Icon,
  title,
  subtitle,
}: CardProps) {
  return (
    <div className={`border border-gray-200 rounded-md p-4 bg-white ${className}`}>
      {title && (
        <header className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {Icon && <Icon className="h-5 w-5 shrink-0" />}
            <h3 className="font-semibold w-full line-clamp-1 text-xl">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 line-clamp-1">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
