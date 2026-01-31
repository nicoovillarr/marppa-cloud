import * as RadixTooltip from "@radix-ui/react-tooltip";

interface TooltipProps {
  children: React.ReactNode;
  tooltip: string;
}

export default function Tooltip({ children, tooltip }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          {children}
        </RadixTooltip.Trigger>
        <RadixTooltip.Content
          side="top"
          align="center"
          sideOffset={8}
          className="z-50 p-2 bg-gray-700 text-white rounded-md text-sm max-w-xs"
        >
          {tooltip}
        </RadixTooltip.Content>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
