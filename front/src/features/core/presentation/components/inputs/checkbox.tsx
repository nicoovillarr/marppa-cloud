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

const Checkbox = ({
  className,
  text,
  checked, // Controlled prop
  defaultChecked,
  disabled,
  onChangedValue,
}: CheckboxProps) => {
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
      className={`flex items-center gap-2 w-min select-none ${className} ${
        disabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
      }`}
      onClick={(e) => handleSetChecked(e, !checkedValue)}
    >
      <aside
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-1 border-gray-300 bg-white`}
      >
        {checkedValue === true ? (
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
        ) : null}
      </aside>

      {text && (
        <label
          className={`text-gray-700 select-none whitespace-nowrap text-ellipsis overflow-hidden ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {text}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
