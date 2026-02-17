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
    <label className={`mb-1 text-sm font-medium ${className}`}>
      {text}
      {required && <span className="text-red-500">*</span>}
      {tooltip && (
        <Tooltip tooltip={tooltip}>
          <LuInfo className="inline ml-1 text-gray-400 hover:text-gray-600" />
        </Tooltip>
      )}
    </label>
  );
}
