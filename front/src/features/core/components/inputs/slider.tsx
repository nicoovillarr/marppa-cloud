"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import React, { useState } from "react";

export interface SliderProps {
  defaultValue: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  valueText?: (value: number[]) => string;
  className?: string;
}

export default function Slider({
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  valueText,
  className,
}: SliderProps) {
  const [value, setValue] = useState(defaultValue || [50]);
  return (
    <div className={`w-full flex items-center space-x-2 ${className || ""}`}>
      <RadixSlider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={value}
        onValueChange={setValue}
        min={min}
        max={max}
        step={step}
      >
        <RadixSlider.Track className="bg-gray-300 relative grow rounded-full h-1">
          <RadixSlider.Range className="absolute bg-blue-500 rounded-full h-full" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow" />
      </RadixSlider.Root>

      <span className="w-16 text-end text-sm text-gray-700 whitespace-nowrap shrink-0">
        {valueText ? valueText(value) : value[0]}
      </span>
    </div>
  );
}
