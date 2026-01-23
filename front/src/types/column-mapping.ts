export type ColumnMapping = {
  [key: string]: {
    label?: string;
    icon?: string;
    isVisible?: boolean;
    width?: string | number;
    minWidth?: string | number;
    renderFn?: (value: any) => string | number | boolean | React.ReactElement;
  };
};
