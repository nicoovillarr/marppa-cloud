import { BaseDialogConfig } from "./base-dialog-config";

export interface ConfirmDialogConfig extends BaseDialogConfig {
  type: "confirm";
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: "normal" | "danger";
  onConfirm?: () => void;
}