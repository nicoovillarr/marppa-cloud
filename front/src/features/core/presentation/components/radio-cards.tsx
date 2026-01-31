"use client";

import { RadioCards } from "@radix-ui/themes";
import { useEffect, useState } from "react";

type RadioCardOption = {
  value: string | number;
  title?: string;
  subtitle?: string;
};

export interface RadioCardsWrapperProps {
  options: RadioCardOption[];
  defaultValue?: string;
  onValueChange?: (value: string | number) => void;
  renderFn?: (option: RadioCardOption) => React.ReactNode;
}

const RadioCard = ({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) => (
  <div className="flex flex-col items-start">
    <h2 className="text-white text-lg">{title}</h2>
    {subtitle && <p className="text-gray-300 text-sm">{subtitle}</p>}
  </div>
);

export const RadioCardsWrapper = ({
  options,
  defaultValue,
  onValueChange,
  renderFn,
}: RadioCardsWrapperProps) => {
  const [selectedValue, setSelectedValue] = useState<
    string | number | undefined
  >(defaultValue);

  const handleValueChange = (value: string) => {
    const obj = options.find((opt) => opt.value.toString() === value);
    if (!obj) return;

    setSelectedValue(obj.value);
    if (onValueChange) {
      onValueChange(obj.value);
    }
  };

  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  return (
    <RadioCards.Root
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-[600px]"
    >
      {options?.map((opt) => (
        <RadioCards.Item
          key={opt.value}
          value={opt.value.toString()}
          className="bg-gradient-to-br from-gray-700 to-gray-900 p-4 rounded-lg shadow-md hover:shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white flex gap-x-3 items-center"
        >
          <div
            className={`w-4 h-4 shrink-0 rounded-full bg-gray-200 border border-gray-600 flex items-center justify-center ${
              opt.value === selectedValue ? "" : "opacity-20"
            }`}
          >
            {opt.value === selectedValue && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          {renderFn ? renderFn(opt) : <RadioCard {...opt} />}
        </RadioCards.Item>
      ))}
    </RadioCards.Root>
  );
};
