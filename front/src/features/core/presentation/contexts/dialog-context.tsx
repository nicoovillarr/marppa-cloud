"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LuArrowLeft, LuX } from "react-icons/lu";
import generateUUID from "@/libs/uuid-gen";
import { DialogConfig } from "@/libs/types/dialogs/dialog-config";
import { setCloseDialogFn } from "@/libs/dialog-ref";

export interface DialogContextProps {
  showDialog: (config: DialogConfig) => void;
  closeDialog: () => void;
}

export const DialogContext = createContext<DialogContextProps | null>(null);

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
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-black hover:bg-gray-800";
    }
  };

  return (
    <div
      className={`absolute flex flex-col bg-white p-6 rounded shadow-md transition-all w-1/2 h-screen right-0 ${className}`}
    >
      <div className="w-full mb-4 flex items-center gap-x-2">
        {depth > 0 && (
          <button
            onClick={handleClose}
            className="shrink-0 text-gray-500 cursor-pointer transition-colors hover:text-gray-800"
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
            className="shrink-0 text-gray-500 cursor-pointer transition-colors hover:text-gray-800"
          >
            <LuX />
          </button>
        )}
      </div>
      <div className="max-h-[calc(100svh-16rem)] overflow-y-auto overflow-x-hidden w-full">
        {config.description && (
          <Dialog.Description className="mb-4 text-sm text-gray-600">
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
                className="rounded px-4 py-2 text-gray-800 hover:bg-gray-100"
              >
                {config.cancelText}
              </button>
            )}
            <button
              onClick={() => {
                config.onConfirm?.();
                handleClose();
              }}
              className={`rounded px-4 py-2 text-white ${confirmButtonStyle()}`}
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

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [stack, setStack] = useState<DialogConfig[]>([]);

  const styles = [
    "z-50 opacity-100",
    "z-40 opacity-75 pointer-events-none right-4",
    "z-30 opacity-50 pointer-events-none right-8",
    "z-20 opacity-25 pointer-events-none right-12",
    "z-10 opacity-0 pointer-events-none right-16",
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
            className={`z-50 fixed inset-0 flex items-center justify-center bg-black/40 transition-all ${
              stack.length
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
