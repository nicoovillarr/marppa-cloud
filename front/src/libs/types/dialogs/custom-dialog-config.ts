import { ReactNode } from "react";
import { BaseDialogConfig } from "./base-dialog-config";

export interface CustomDialogConfig extends BaseDialogConfig {
  type?: "custom";
  content: ReactNode;
}