import { LuInfo } from "react-icons/lu";
import { Tooltip } from "../../Tooltip";

export function FormLabel({
  text,
  required = false,
  className = "",
  tooltip,
}: {
  text: string;
  required?: boolean;
  className?: string;
  tooltip?: string;
}) {
  return (
    <label className={`mb-1 text-sm font-medium text-ink ${className}`}>
      {text}
      {required && <span className="text-status-danger">*</span>}
      {tooltip && (
        <Tooltip tooltip={tooltip}>
          <LuInfo className="inline ml-1 text-ink-faint hover:text-ink-muted" />
        </Tooltip>
      )}
    </label>
  );
}
