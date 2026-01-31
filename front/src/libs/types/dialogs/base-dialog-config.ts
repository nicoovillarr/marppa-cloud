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
