import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import dayjs from "dayjs";
import { ContextMenu, ContextMenuGroup } from "./ContextMenu";
import { Skeleton } from "@radix-ui/themes";
import { LuClipboard } from "react-icons/lu";
import { Tooltip } from "./Tooltip";
import { toast } from "sonner";
import Link from "next/link";

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

export type ContextMenuGroupGenerator<T> = (rowData: T) => ContextMenuGroup[];

export interface TableHandler<K> {
  getSelectedRows: () => Set<K>;
  clearSelectedRows: () => void;
  selectRow: (index: K, reset?: boolean) => void;
}

export interface TableProps<T, K> {
  showHeader?: boolean;
  select?: "none" | "single" | "multiple";
  columns: ColumnMapping<T>;
  data: T[];
  contextMenuGroups?: ContextMenuGroupGenerator<T>;
  rowHref?: (rowData: T, rowIndex: number) => string | undefined;
  onRowClick?: (rowData: T, rowIndex: number) => void;
  onSelectionChange?: (selectedRows: Set<K>) => void;
  getKey: (rowData: T) => K;
}

const RowInner = <T, K>(
  rowIndex: number,
  rowData: T,
  columnMapping: ColumnMapping<T>,
  rowHref: string,
  parse: (value: any) => string,
  renderFn: (key: string) => string | number | boolean | React.JSX.Element,
  handleClick: (e: React.MouseEvent, columnKey: string, rowData: T) => void,
  getKey: (rowData: T) => K,
) => {
  const copy = (e: React.MouseEvent, value: any) => {
    e.preventDefault();
    e.stopPropagation();

    const valueStr = parse(value);
    if (valueStr !== null && valueStr !== undefined) {
      navigator.clipboard.writeText(String(valueStr));
      toast.success("Copied to clipboard");
    }
  };

  return (
    <tr
      className={`cursor-pointer ${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
        } hover:bg-gray-100`}
    >
      {Object.keys(columnMapping).map((key) => {
        const col = columnMapping[key];
        const { canCopy = false } = col;

        return (
          <td
            key={key}
            className="border border-gray-300 px-4 py-2"
            onClick={(e) => {
              if (!rowHref) handleClick(e, key, rowData);
            }}
          >
            <div className="group relative w-full">
              {rowHref ? (
                <Link
                  href={rowHref}
                  className={`${canCopy ? "pr-8 block" : "block"}`}
                >
                  <div>{renderFn(key)}</div>
                </Link>
              ) : (
                <div className={`${canCopy ? "pr-8" : ""}`}>
                  {renderFn(key)}
                </div>
              )}

              {canCopy && (
                <Tooltip tooltip="Copy to clipboard">
                  <button
                    className="opacity-0 group-hover:opacity-100 absolute right-0 top-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-all hover:bg-gray-200 p-2"
                    onClick={(e) => copy(e, rowData[key])}
                  >
                    <LuClipboard />
                  </button>
                </Tooltip>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
};

const Row = <T, K>({
  columnMapping,
  rowData,
  rowIndex,
  contextMenuGroups,
  onRowClick,
  rowHref: rowHrefFn,
  getKey,
}: {
  columnMapping: ColumnMapping<T>;
  rowData: T;
  rowIndex: number;
  contextMenuGroups?: ContextMenuGroupGenerator<T>;
  onRowClick?: (rowData: T) => void;
  rowHref?: (rowData: T, rowIndex: number) => string | undefined;
  getKey: (rowData: T) => K;
}) => {
  const href: string = rowHrefFn ? rowHrefFn(rowData, rowIndex) : undefined;

  const parse = (value: any): string => {
    if (value instanceof Date) {
      return dayjs(value).format("MM/DD/YYYY HH:mm:ss");
    }

    if (
      typeof value === "object" &&
      value !== null &&
      !React.isValidElement(value)
    ) {
      return JSON.stringify(value);
    }

    return value?.toString() ?? "";
  };

  const renderFn = (key: string) => {
    const col = columnMapping[key];
    const { canCopy = false, renderFn: customRenderFn } = col;

    if (customRenderFn) {
      return customRenderFn(rowData, rowIndex);
    }

    const value = parse(rowData[key]);
    return <span className="whitespace-pre-wrap">{value}</span>;
  };

  const handleClick = (e: React.MouseEvent, columnKey: string, rowData: T) => {
    e.stopPropagation();
    const col = columnMapping[columnKey];

    let keepGoing = true;
    if (col.onClick) {
      const result = col.onClick(rowData, rowIndex);
      keepGoing = result === true;
    }

    if (keepGoing) {
      onRowClick?.(rowData);
    }
  };

  if (contextMenuGroups?.length > 0) {
    console.log("Rendering row with context menu");

    const groups =
      typeof contextMenuGroups === "function"
        ? contextMenuGroups?.(rowData) ?? []
        : contextMenuGroups;

    return (
      <ContextMenu groups={groups}>
        {RowInner(
          rowIndex,
          rowData,
          columnMapping,
          href,
          parse,
          renderFn,
          handleClick,
          getKey,
        )}
      </ContextMenu>
    );
  }

  return RowInner(
    rowIndex,
    rowData,
    columnMapping,
    href,
    parse,
    renderFn,
    handleClick,
    getKey,
  );
};

function TableInner<T, K>(
  {
    showHeader = true,
    select = "none",
    columns,
    data,
    contextMenuGroups,
    rowHref,
    onRowClick,
    onSelectionChange,
    getKey,
  }: TableProps<T, K>,
  ref: React.Ref<TableHandler<K>>
) {
  const [selectedRows, setSelectedRows] = useState<Set<K>>(new Set());
  const [actualColumns, setActualColumns] =
    useState<ColumnMapping<T>>(undefined);
  const [totalMinWidth, setTotalMinWidth] = useState<number | null>(null);
  const [computedWidths, setComputedWidths] = useState<Record<string, string>>(
    {}
  );
  const tableRef = useRef<HTMLTableElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  const selectRow = (index: K, reset: boolean = false) => {
    if (select === "none") return;

    if (select === "single") {
      const newSet = new Set<K>();
      if (selectedRows.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }

      setSelectedRows(newSet);
      onSelectionChange?.(newSet);
      return;
    }

    const newSet = new Set(reset ? [] : Array.from(selectedRows));
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }

    setSelectedRows(newSet);
    onSelectionChange?.(newSet);
  };

  const handleRowClick = (rowData: T, index: number) => {
    if (onRowClick && typeof onRowClick === "function") {
      onRowClick(rowData, index);
    }

    if (select !== "none") {
      const key = getKey(rowData);
      selectRow(key);
    }
  };

  useImperativeHandle(ref, () => ({
    getSelectedRows: () => selectedRows,
    clearSelectedRows: () => {
      const set = new Set<K>();
      setSelectedRows(set);
      onSelectionChange?.(set);
    },
    selectRow: (index: K, reset: boolean = false) =>
      selectRow(index, reset),
  }));

  useEffect(() => {
    let cols = { ...columns };

    if (select === "single" || select === "multiple") {
      cols = {
        actions: {
          label: "",
          width: "25px",
          minWidth: "25px",
          onClick: (value: T, index: number) => {
            const key = getKey(value);
            selectRow(key);
          },
          renderFn: (value: T, index: number) => (
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={selectedRows.has(getKey(value))}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onChange={() => selectRow(getKey(value))}
            />
          ),
        },
        ...cols,
      };
    }

    if (!tableRef.current) {
      setActualColumns(cols);
      return;
    }

    const normalizeWidth = (
      rawMin: number | string | undefined,
      rawWidth: number | string | undefined
    ) => {
      const isFlex =
        typeof rawWidth === "string" && rawWidth.trim().endsWith("%");
      if (rawMin == null && rawWidth != null && !isFlex) rawMin = rawWidth;
      if (rawMin == null && isFlex) {
        console.warn(
          "A column with flexible width (%) should have a minWidth defined. Defaulting to 50px."
        );
        rawMin = "50px";
      }
      if (rawMin != null && rawWidth == null) rawWidth = rawMin;
      return { rawMin, rawWidth };
    };

    const toPixels = (
      value: number | string | undefined,
      containerWidth: number
    ): number => {
      if (value == null) return null;
      if (typeof value === "number") return value;
      const s = String(value).trim();
      if (s.endsWith("px")) return parseFloat(s);
      if (s.endsWith("%")) return (parseFloat(s) / 100) * containerWidth;
      if (!isNaN(Number(s))) return Number(s);
      throw new Error(`Cannot parse width value: ${value}`);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const containerWidth = entry.contentRect.width;

      type ColInfo = {
        key: string;
        minWidth: number;
        desired: number | null;
        weight: number;
      };

      const colInfos: ColInfo[] = Object.keys(cols).map((key) => {
        const col: ColumnMapping<T>[string] = cols[key];
        const { minWidth, width } = col;

        const { rawMin, rawWidth } = normalizeWidth(minWidth, width);

        const isFlex =
          typeof rawWidth === "string" && rawWidth.trim().endsWith("%");

        const minPx = toPixels(rawMin, containerWidth);
        const desiredPx =
          rawWidth && !isFlex ? toPixels(rawWidth, containerWidth) : null;
        const weight = isFlex
          ? parseFloat(String(rawWidth).replace("%", ""))
          : 0;

        return {
          key,
          minWidth: Math.max(0, minPx),
          desired: desiredPx !== null ? Math.max(0, desiredPx) : null,
          weight: Math.max(0, weight),
        };
      });

      const totalMinWidth = colInfos.reduce((s, c) => s + c.minWidth, 0);
      setTotalMinWidth(totalMinWidth);

      if (totalMinWidth >= containerWidth) {
        const finalWidths = Object.fromEntries(
          colInfos.map((c) => [c.key, `${Math.floor(c.minWidth)}px`])
        );
        setComputedWidths(finalWidths);
        return;
      }

      const totalWeight = colInfos.reduce((s, c) => s + c.weight, 0);
      if (totalWeight > 100) {
        console.warn(
          "Total column weight exceeds 100%. Adjusting proportionally."
        );

        colInfos.forEach((c) => {
          c.weight = (c.weight / totalWeight) * 100;
        });
      }

      let remaining = containerWidth - totalMinWidth;

      const fixedWidths = colInfos
        .filter((c) => c.weight === 0 && c.desired !== null)
        .reduce((r, c) => {
          r[c.key] = c.desired as number;
          return r;
        }, {} as Record<string, number>);

      const finalWidths: Record<string, string> = {};

      colInfos.forEach((c) => {
        if (c.desired !== null) {
          finalWidths[c.key] = `${Math.floor(c.desired)}px`;
        } else {
          finalWidths[c.key] = `${Math.floor(c.minWidth)}px`;
        }
      });
    });

    observer.observe(tableRef.current);
    resizeObserver.current = observer;
    setActualColumns(cols);

    console.log("Observed table for resizing:", tableRef.current);
    console.log("Computed widths:", computedWidths);

    return () => {
      resizeObserver.current?.disconnect();
      observer.disconnect();
    };
  }, [columns, selectedRows, select, tableRef.current]);

  if (!actualColumns)
    return (
      <div className="w-full flex flex-col gap-y-2">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    );

  return (
    <div className="overflow-x-auto w-full">
      <table
        ref={tableRef}
        style={{
          minWidth: `${totalMinWidth}px`,
        }}
        className="table-fixed border-collapse"
      >
        <colgroup>
          {Object.entries(actualColumns).map(([key, col]) => (
            <col
              key={key}
              style={{
                width: computedWidths[key] ?? col.width,
                minWidth: computedWidths[key] ?? col.minWidth ?? col.width,
              }}
            />
          ))}
        </colgroup>

        {showHeader && (
          <thead>
            <tr className="bg-blue-100">
              {Object.entries(actualColumns).map(([key, col]) => (
                <th
                  key={key}
                  className="border border-gray-300 px-4 py-2 text-left"
                >
                  {col.label ?? key}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {data?.map((row, rowIndex) => (
            <Row
              key={rowIndex}
              columnMapping={actualColumns}
              rowData={row}
              rowIndex={rowIndex}
              rowHref={rowHref}
              contextMenuGroups={contextMenuGroups}
              onRowClick={(rowData) => handleRowClick(rowData, rowIndex)}
              getKey={getKey}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Table = forwardRef(TableInner) as <T, K>(
  props: TableProps<T, K> & { ref?: React.Ref<TableHandler<K>> }
) => ReturnType<typeof TableInner>;
