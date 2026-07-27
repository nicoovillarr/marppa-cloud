"use client";

import { useState, useEffect } from "react";

export interface CheckboxProps {
  className?: string;
  text?: string;
  checked?: boolean; // Controlled mode
  defaultChecked?: boolean; // Uncontrolled mode
  disabled?: boolean;
  onChangedValue?: (value: any) => void;
}

export function Checkbox({
  className,
  text,
  checked, // Controlled prop
  defaultChecked,
  disabled,
  onChangedValue,
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = useState<boolean | undefined>(
    defaultChecked
  );

  const isControlled = checked !== undefined;

  useEffect(() => {
    if (!isControlled && checked !== undefined) {
      setInternalChecked(checked);
    }
  }, [isControlled, checked]);

  const checkedValue = isControlled ? checked : internalChecked;

  const handleSetChecked = (e, value: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (!isControlled) {
      setInternalChecked(value);
    }

    onChangedValue?.(value);
  };

  return (
    <div
      tabIndex={1}
      className={`flex items-center gap-2 w-min select-none ${className} ${disabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
        }`}
      onClick={(e) => handleSetChecked(e, !checkedValue)}
    >
      <aside
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border border-border bg-surface-raised`}
      >
        {checkedValue === true ? (
          <div className="w-3 h-3 bg-amber rounded-full"></div>
        ) : null}
      </aside>

      {text && (
        <label
          className={`text-ink select-none whitespace-nowrap text-ellipsis overflow-hidden ${disabled ? "cursor-not-allowed" : "cursor-pointer"
            }`}
        >
          {text}
        </label>
      )}
    </div>
  );
};
