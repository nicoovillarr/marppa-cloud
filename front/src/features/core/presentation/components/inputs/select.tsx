"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { ReactNode, useEffect, useState } from "react";
import { TfiAngleDown } from "react-icons/tfi";
import { BeatLoader } from "react-spinners";

type SelectOptionValue = string | number;
type SelectOptionObject = { value: SelectOptionValue; displayText: string };
export type SelectOption = SelectOptionValue | SelectOptionObject;
export type SelectOptions = SelectOption[] | { [key: string]: SelectOption[] };

const CLEAR_TEXT = "__blank__";

export interface SelectProps {
  options: SelectOptions;
  className?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  defaultValue?: any;
  placeholder?: string;
  clearText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onChangedValue?: (value: any) => void;
}

export default function Select({
  options,
  className,
  leading,
  trailing,
  defaultValue,
  placeholder,
  clearText,
  isLoading,
  disabled,
  onChangedValue,
}: SelectProps) {
  const [value, setValue] = useState<string>();
  const [displayText, setDisplayText] = useState<string>();
  const [width, setWidth] = useState<string>();
  const [groups, setGroups] = useState<{ [key: string]: SelectOptionObject[] }>(
    {}
  );
  const [isChanging, setIsChanging] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  const catchWidthFromClassName = (className: string) => {
    const match = className.match(/w-[^\s]+/);
    return match ? match[0] : "w-full";
  };

  const handleOnChange = (val: any, propagate: boolean = true) => {
    if (isChanging) return;
    setIsChanging(true);

    const isCleared = clearText && val === CLEAR_TEXT;
    let newValue = isCleared ? null : val;
    let newDisplay = isCleared ? placeholder ?? "" : val;

    if (Array.isArray(options)) {
      const option = options.find(
        (item) => typeof item === "object" && item.value == val
      );

      if (option && typeof option === "object" && "displayText" in option) {
        newDisplay = option.displayText;
        newValue = option.value;
      }
    } else {
      for (const group of Object.values(options)) {
        const found = group.find(
          (item) =>
            typeof item === "object" && "value" in item && item.value == val
        );
        if (found && typeof found === "object" && "displayText" in found) {
          newDisplay = found.displayText;
          newValue = found.value;
          break;
        }
      }
    }

    setValue(newValue);
    setDisplayText(isCleared ? placeholder ?? "" : newDisplay);
    if (propagate) {
      onChangedValue?.(newValue);
    }

    setTimeout(() => setIsChanging(false), 500);
  };

  const getFilteredGroups = () => {
    if (!searchTerm.trim()) return groups;

    const lowerSearch = searchTerm.toLowerCase();
    const filtered: { [key: string]: SelectOptionObject[] } = {};

    for (const [groupName, items] of Object.entries(groups)) {
      const matchingItems = items.filter((item) =>
        item.displayText.toLowerCase().includes(lowerSearch)
      );
      if (matchingItems.length > 0) {
        filtered[groupName] = matchingItems;
      }
    }

    return filtered;
  };

  useEffect(() => {
    if (className) {
      const width = catchWidthFromClassName(className);
      setWidth(width);
    } else {
      setWidth("w-full");
    }
  }, [className]);

  useEffect(() => {
    if (!options || (Array.isArray(options) && options.length === 0)) return;
    if (value !== undefined) {
      handleOnChange(value, false);
    } else if (defaultValue !== undefined) {
      handleOnChange(defaultValue, false);
    }
  }, [defaultValue, options]);

  useEffect(() => {
    const normalizeOption = (opt: SelectOption): SelectOptionObject => {
      return typeof opt === "string"
        ? { value: opt, displayText: opt }
        : typeof opt === "number"
        ? { value: opt, displayText: String(opt) }
        : opt;
    };

    const newGroups: {
      [key: string]: SelectOptionObject[];
    } = {};

    if (Array.isArray(options)) {
      const normalized = options.map(normalizeOption);
      if (clearText)
        normalized.unshift({ value: CLEAR_TEXT, displayText: clearText });
      newGroups[""] = normalized;
    } else if (typeof options === "object") {
      for (const key in options) {
        const groupItems = options[key].map(normalizeOption);
        newGroups[key] = groupItems;
      }
    }

    const totalOptionsCount = Object.values(newGroups).reduce(
      (acc, items) => acc + items.length,
      0
    );

    if (totalOptionsCount >= 5) {
      setShowSearchBar(true);
    }

    setGroups(newGroups);
  }, [options]);

  return (
    <div className={`flex items-center gap-2 min-w-8 min-h-4 ${className} relative`}>
      {disabled && (
        <div className="absolute inset-0 cursor-not-allowed rounded-md bg-gray-200 opacity-50"></div>
      )}

      <RadixSelect.Root
        defaultValue={defaultValue ?? ""}
        value={value}
        onValueChange={handleOnChange}
        onOpenChange={(open) => {
          if (open) setSearchTerm("");
        }}
        disabled={isLoading}
      >
        <RadixSelect.Trigger
          className={`inline-flex ${width} h-[42px] items-center gap-x-2 rounded border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 disabled:cursor-not-allowed`}
          disabled={isLoading || disabled}
        >
          {isLoading ? (
            <span>
              <BeatLoader
                size={5}
                color="#353535"
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            </span>
          ) : (
            <>
              {leading && <span className="shrink-0">{leading}</span>}
              <span className="line-clamp-1 w-full text-start">
                {displayText || placeholder}
              </span>
              <RadixSelect.Icon>
                {trailing ?? <TfiAngleDown className="ml-2" />}
              </RadixSelect.Icon>
            </>
          )}
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className={`z-50 ${width} mt-1 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
            position="popper"
          >
            <RadixSelect.Viewport className="p-1">
              {showSearchBar && (
                <div className="p-2">
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
              {Object.entries(getFilteredGroups()).map(([group, items]) => (
                <RadixSelect.Group key={group ?? "group"}>
                  {group && <RadixSelect.Label>{group}</RadixSelect.Label>}
                  {items.map((item) => {
                    const isSelected = item.value === value;
                    return (
                      <RadixSelect.Item
                        key={item.value ?? item.displayText ?? "item"}
                        value={String(item.value)}
                        className={`cursor-pointer select-none rounded-md px-4 py-2 text-sm text-gray-700 overflow-hidden hover:bg-gray-100 focus:bg-gray-100 focus:outline-none relative ${
                          isSelected
                            ? "before:content-[''] before:absolute before:w-8 before:h-8 before:rounded-full before:-left-6 before:top-1/2 before:-translate-y-1/2 before:mt-[1px] before:bg-blue-500"
                            : ""
                        }`}
                      >
                        <span className="line-clamp-1">{item.displayText}</span>
                      </RadixSelect.Item>
                    );
                  })}
                </RadixSelect.Group>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
