type ColumnDef = {
  label?: string;
  icon?: string;
  isVisible?: boolean;
  width?: string | number;
  minWidth?: string | number;
  canCopy?: boolean;
  renderFn?: (value: any, index: number) => string | number | boolean | React.ReactElement;
  onClick?: (value: any, index: number) => void | boolean;
};

export type ColumnMapping<T> = {
  [key in keyof T]?: ColumnDef;
} & {
  [key: string]: ColumnDef;
};
