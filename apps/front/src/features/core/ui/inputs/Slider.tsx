"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import React, { useEffect, useState } from "react";

export interface SliderProps {
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  valueText?: (value: number) => string;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  valueText,
  className,
  disabled = false,
}: SliderProps) {
  const [internalValue, setInternalValue] = useState<number>(value);
  const [cursor, setCursor] = useState<"grab" | "grabbing">("grab");

  const handleChange = (newValue: number[]) => {
    setInternalValue(newValue[0]);
    onValueChange?.(newValue[0]);
  };

  const handleMouseDown = () => {
    setCursor("grabbing");
  };

  const handleMouseUp = () => {
    setCursor("grab");
  };

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <div className={`w-full flex items-center space-x-2 ${className || ""}`}>
      <RadixSlider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[internalValue]}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={step}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled}
      >
        <RadixSlider.Track className="bg-surface-sunken relative grow rounded-full h-1">
          <RadixSlider.Range
            className={`absolute rounded-full h-full ${disabled ? "bg-accent/40" : "bg-accent"
              }`}
          />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className={`block w-5 h-5 bg-surface-raised border-2 rounded-full shadow outline-none ${disabled ? "border-accent/40" : "border-accent"
            }`}
          style={{
            cursor: disabled ? "not-allowed" : cursor,
          }}
        />
      </RadixSlider.Root>

      <span className="w-16 text-end text-sm text-ink-muted whitespace-nowrap shrink-0">
        {valueText ? valueText(internalValue) : internalValue[0]}
      </span>
    </div>
  );
}
