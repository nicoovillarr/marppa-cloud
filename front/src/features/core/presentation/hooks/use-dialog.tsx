import { DialogContext } from "@/core/presentation/contexts/dialog-context";
import { useContext } from "react";

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside DialogProvider");
  return ctx;
};
