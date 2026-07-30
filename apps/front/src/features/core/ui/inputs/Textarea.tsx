import { forwardRef, useEffect, useState } from "react";

export interface TextareaProps {
  className?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  onChangedValue?: (value: any) => void;
  onBlur?: (value: any) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      value,
      placeholder,
      rows = 4,
      disabled = false,
      onChangedValue,
      onBlur,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value ?? "");

    useEffect(() => {
      setInternalValue(value ?? "");
    }, [value]);

    return (
      <textarea
        ref={ref}
        rows={rows}
        value={internalValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setInternalValue(e.target.value);
          onChangedValue?.(e.target.value);
        }}
        onBlur={(e) => onBlur?.(e.target.value)}
        className={`w-full rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-ink transition-colors placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-faint ${className ?? ""}`}
      />
    );
  }
);

Textarea.displayName = "Textarea";
