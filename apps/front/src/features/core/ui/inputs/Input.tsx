import { forwardRef, ReactNode, useState, useEffect } from "react";

export interface InputProps {
  className?: string;
  value?: string | number;
  placeholder?: string;
  defaultValue?: string | number;
  type?: "text" | "number" | "email" | "password";
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  disabledText?: string;
  onChangedValue?: (value: any) => void;
  onBlur?: (value: any) => void;
  onFocus?: (value: any) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      value,
      placeholder,
      defaultValue,
      type = "text",
      leading,
      trailing,
      disabled = false,
      disabledText,
      onChangedValue,
      onBlur,
      onFocus,
      onKeyDown,
      ...rest
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(String(value));
      }
    }, [value]);

    const isValidNumberInput = (val: string): boolean => {
      return /^-?\d*\.?\d*$/.test(val);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;

      if (type === "number") {
        if (isValidNumberInput(val)) {
          setInternalValue(val);
          const parsed = Number(val);
          if (!isNaN(parsed)) {
            onChangedValue?.(parsed);
          } else {
            onChangedValue?.(undefined);
          }
        }
      } else {
        setInternalValue(val);
        onChangedValue?.(val);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;

      if (type === "number") {
        const parsed = Number(val);
        if (val !== "" && !isNaN(parsed)) {
          setInternalValue(String(parsed));
          onBlur?.(parsed);
        } else {
          setInternalValue("");
          onBlur?.(undefined);
        }
      } else {
        onBlur?.(val);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;

      if (type === "number") {
        const parsed = Number(val);
        if (val !== "" && !isNaN(parsed)) {
          setInternalValue(String(parsed));
          onFocus?.(parsed);
        } else {
          setInternalValue("");
          onFocus?.(undefined);
        }
      } else {
        onFocus?.(val);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <div
        className={`relative flex w-full items-center justify-center gap-x-2 overflow-hidden rounded-lg border border-border bg-surface-raised p-2 pl-3 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent ${className}`}
      >
        {disabled && (
          <div className="absolute left-0 top-0 h-full w-full cursor-not-allowed bg-surface-sunken opacity-50">
            {disabledText && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted select-none italic">
                {disabledText}
              </span>
            )}
          </div>
        )}

        {leading && <span className="shrink-0 text-ink-muted">{leading}</span>}

        <input
          ref={ref}
          type={type}
          className="w-full border-none outline-none bg-transparent text-ink placeholder:text-ink-faint focus:outline-none"
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          inputMode={type === "number" ? "numeric" : undefined}
        />

        {trailing && <span className="shrink-0 text-ink-muted">{trailing}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
