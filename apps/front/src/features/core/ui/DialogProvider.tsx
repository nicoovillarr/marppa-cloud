"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LuArrowLeft, LuX } from "react-icons/lu";
import generateUUID from "@/libs/uuid-gen";

let closeFn: (() => void) | null = null;

const setCloseDialogFn = (fn: () => void) => {
  closeFn = fn;
};

export const closeCurrentDialog = () => {
  if (closeFn) {
    closeFn();
  }
};

export interface BaseDialogConfig {
  id?: string;
  title?: string;
  description?: string;
  borderless?: boolean;
  type?: "" | "custom" | "confirm";
  content?: React.ReactNode;
  canClose?: () => boolean | Promise<boolean>;
  onClose?: () => void;
}

export interface ConfirmDialogConfig extends BaseDialogConfig {
  type: "confirm";
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: "normal" | "danger";
  onConfirm?: () => void;
}

export interface CustomDialogConfig extends BaseDialogConfig {
  type?: "custom";
  content: ReactNode;
}

export type DialogConfig = CustomDialogConfig | ConfirmDialogConfig;

interface DialogContextProps {
  showDialog: (config: DialogConfig) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextProps | null>(null);

const DialogContent = ({
  className,
  config,
  depth,
  close,
}: {
  className?: string;
  config: DialogConfig;
  depth: number;
  close: () => void;
}) => {
  const handleClose = async () => {
    if (config.canClose) {
      const can = await config.canClose();
      if (!can) return;
    }
    close();
    config.onClose?.();
  };

  const confirmButtonStyle = () => {
    if (config.type !== "confirm") return "";
    switch (config.confirmButtonStyle) {
      case "danger":
        return "bg-status-danger text-white hover:brightness-90";
      default:
        return "bg-accent text-white hover:brightness-95";
    }
  };

  return (
    <div
      className={`fixed inset-0 sm:absolute sm:inset-y-0 sm:left-auto sm:right-0 flex flex-col bg-surface-raised p-6 shadow-xl transition-all w-full sm:w-full sm:max-w-lg h-full sm:h-screen rounded-none sm:rounded-l-2xl ${className}`}
    >
      <div className="w-full mb-4 flex items-center gap-x-2">
        {depth > 0 && (
          <button
            onClick={handleClose}
            className="shrink-0 text-ink-muted cursor-pointer transition-colors hover:text-ink"
          >
            <LuArrowLeft />
          </button>
        )}

        {config.title && (
          <Dialog.Title className="text-lg font-semibold flex-1 line-clamp-1">
            {config.title}
          </Dialog.Title>
        )}

        {depth === 0 && (
          <button
            onClick={handleClose}
            className="shrink-0 text-ink-muted cursor-pointer transition-colors hover:text-ink"
          >
            <LuX />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full">
        {config.description && (
          <Dialog.Description className="mb-4 text-sm text-ink-muted">
            {config.description}
          </Dialog.Description>
        )}

        {config.type === "confirm" && config.content && (
          <p className="mb-4 whitespace-pre-line">{config.content}</p>
        )}

        {config.type === "confirm" ? (
          <div className="mt-4 flex justify-end gap-2">
            {config.cancelText && (
              <button
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-ink hover:bg-surface-sunken"
              >
                {config.cancelText}
              </button>
            )}
            <button
              onClick={() => {
                config.onConfirm?.();
                handleClose();
              }}
              className={`rounded-lg px-4 py-2 ${confirmButtonStyle()}`}
            >
              {config.confirmText || "Confirmar"}
            </button>
          </div>
        ) : (
          config.content
        )}
      </div>
    </div>
  );
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DialogConfig[]>([]);

  const styles = [
    "z-50 opacity-100",
    "z-40 opacity-0 sm:opacity-75 pointer-events-none sm:right-4",
    "z-30 opacity-0 sm:opacity-50 pointer-events-none sm:right-8",
    "z-20 opacity-0 sm:opacity-25 pointer-events-none sm:right-12",
    "z-10 opacity-0 pointer-events-none sm:right-16",
  ];

  const showDialog = (config: DialogConfig) => {
    console.log("Show dialog", config);

    if (!config.id) config.id = generateUUID();
    setStack((prev) => [config, ...prev]);
  };

  const closeDialog = () => {
    console.log("Close dialog");
    setStack((prev) => prev.slice(1));
  };

  useEffect(() => {
    console.log(stack);
    document.body.style.overflow = stack.length ? "hidden" : "";
    setCloseDialogFn(closeDialog);
  }, [stack]);

  return (
    <DialogContext.Provider value={{ showDialog, closeDialog }}>
      {children}
      <Dialog.Root open={true}>
        <Dialog.Portal forceMount>
          <div
            className={`z-50 fixed inset-0 flex items-center justify-center bg-black/40 transition-all ${stack.length
              ? "opacity-100 backdrop-blur-xs"
              : "opacity-0 pointer-events-none"
              }`}
          >
            {stack.map((config, index) => (
              <DialogContent
                key={config.id}
                className={styles[Math.min(index, styles.length - 1)]}
                config={config}
                depth={stack.length - index - 1}
                close={closeDialog}
              />
            ))}
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside DialogProvider");
  return ctx;
};