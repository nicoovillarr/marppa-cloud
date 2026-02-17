import * as RadixContextMenu from "@radix-ui/react-context-menu";

export interface ContextMenuGroup {
  label: string;
  color?: string;
  action?: () => void;
  subItems?: ContextMenuGroup[];
  disabled?: boolean;
}

interface ContextMenuProps {
  groups?: ContextMenuGroup[];
  children?: React.ReactNode;
}

const Item = ({ label, color, action, disabled }: ContextMenuGroup) => {
  return (
    <RadixContextMenu.Item
      className={`px-2 py-1 hover:bg-gray-100 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      onSelect={action}
      style={{
        color: color || "inherit",
      }}
      disabled={disabled}
    >
      {label}
    </RadixContextMenu.Item>
  );
};

const Group = ({
  label,
  color,
  action,
  subItems,
  disabled,
}: ContextMenuGroup) => {
  if (subItems && subItems.length > 0) {
    return (
      <RadixContextMenu.Sub>
        <RadixContextMenu.SubTrigger
          className={`px-2 py-1 hover:bg-gray-100 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          disabled={disabled}
          onSelect={action}
        >
          {label}
        </RadixContextMenu.SubTrigger>
        <RadixContextMenu.Portal>
          <RadixContextMenu.SubContent className="z-50 bg-white shadow-md rounded p-1 text-sm">
            {subItems.map((item, index) => (
              <Item key={index} {...item} />
            ))}
          </RadixContextMenu.SubContent>
        </RadixContextMenu.Portal>
      </RadixContextMenu.Sub>
    );
  } else {
    return (
      <Item label={label} color={color} action={action} disabled={disabled} />
    );
  }
};

export function ContextMenu({
  groups = [],
  children,
}: ContextMenuProps) {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content className="z-50 bg-white shadow-xl border border-gray-100 rounded p-1 text-sm">
          {groups.map((group, index) => (
            <Group key={index} {...group} />
          ))}
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}
