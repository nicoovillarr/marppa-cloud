import { ColumnMapping } from "@/types/column-mapping";
import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import ContextMenu, { ContextMenuGroup } from "./context-menu";

export interface TableProps {
  columns: ColumnMapping;
  data: any[];
  contextMenuGroups?: (rowData: any) => ContextMenuGroup[];
}

const Row = ({
  columnMapping,
  rowData,
  rowIndex,
  contextMenuGroups,
}: {
  columnMapping: ColumnMapping;
  rowData: any;
  rowIndex: number;
  contextMenuGroups?: (rowData: any) => ContextMenuGroup[];
}) => {
  const renderFn = (key: string) => {
    const col = columnMapping[key];

    if (col.renderFn) {
      return col.renderFn(rowData);
    }

    const value = rowData[key];

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

    return <span className="whitespace-pre-wrap">{value}</span>;
  };

  if (contextMenuGroups?.length > 0) {
    console.log("Rendering row with context menu");

    const groups =
      typeof contextMenuGroups === "function"
        ? contextMenuGroups?.(rowData) ?? []
        : contextMenuGroups;

    return (
      <ContextMenu groups={groups}>
        <tr className={`${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
          {Object.keys(columnMapping).map((key) => (
            <td key={key} className="border border-gray-300 px-4 py-2">
              {renderFn(key)}
            </td>
          ))}
        </tr>
      </ContextMenu>
    );
  }

  return (
    <tr className={`${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
      {Object.keys(columnMapping).map((key) => (
        <td key={key} className="border border-gray-300 px-4 py-2">
          {renderFn(key)}
        </td>
      ))}
    </tr>
  );
};

export default function Table({
  columns,
  data,
  contextMenuGroups,
}: TableProps) {
  const [totalMinWidth, setTotalMinWidth] = useState(0);
  const [computedWidths, setComputedWidths] = useState<Record<string, string>>(
    {}
  );
  const tableRef = useRef<HTMLTableElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (tableRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: containerWidth } = entry.contentRect;

          const relativeToWidth = (value: string | number): number => {
            if (typeof value === "string") {
              if (value.endsWith("px")) {
                return parseFloat(value);
              } else if (value.endsWith("%")) {
                return (parseFloat(value) / 100) * containerWidth;
              } else {
                throw new Error(`Invalid width format: ${value}`);
              }
            }
          };

          const minColumnWidths: Record<string, number> = {};
          const desiredWidths: Record<string, number> = {};

          Object.keys(columns).forEach((key) => {
            const col = columns[key];
            const { minWidth = 0, width = "100%" } = col;

            minColumnWidths[key] = relativeToWidth(minWidth);
            desiredWidths[key] = relativeToWidth(width);
          });

          const totalMinWidth = Object.values(minColumnWidths).reduce(
            (sum, w) => sum + w,
            0
          );

          const remainingWidth = containerWidth - totalMinWidth;
          const finalWidths: Record<string, number> = {};

          if (totalMinWidth > containerWidth) {
            Object.keys(minColumnWidths).forEach((key) => {
              finalWidths[key] = minColumnWidths[key];
            });
          } else {
            type ColInfo = {
              key: string;
              minWidth: number;
              desired: number | null;
              weight: number;
            };

            const colInfos: ColInfo[] = Object.keys(columns).map((key) => {
              const col = columns[key];
              const desiredRaw = col.width;
              const desired = relativeToWidth(desiredRaw ?? "100%");

              const isFlexible =
                typeof desiredRaw === "string" && desiredRaw.endsWith("%");

              return {
                key,
                minWidth: minColumnWidths[key],
                desired: isFlexible ? null : desired,
                weight: isFlexible ? parseFloat(desiredRaw as string) : 0,
              };
            });

            const totalWeight =
              colInfos.reduce((sum, col) => sum + col.weight, 0) || 1;

            colInfos.forEach((col) => {
              if (col.desired !== null) {
                const maxGrow = col.desired - col.minWidth;
                const extra = Math.min(
                  remainingWidth * (col.weight / totalWeight),
                  maxGrow
                );
                finalWidths[col.key] = col.minWidth + (extra > 0 ? extra : 0);
              } else {
                const extra = remainingWidth * (col.weight / totalWeight);
                finalWidths[col.key] = col.minWidth + (extra > 0 ? extra : 0);
              }
            });
          }

          const cssWidths: Record<string, string> = {};
          Object.keys(finalWidths).forEach((key) => {
            cssWidths[key] = `${finalWidths[key]}px`;
          });

          setTotalMinWidth(totalMinWidth);
          setComputedWidths(cssWidths);
        }
      });

      observer.observe(tableRef.current);
      resizeObserver.current = observer;
    }

    return () => {
      resizeObserver.current?.disconnect();
    };
  }, [columns]);

  return (
    <div className="overflow-x-auto w-full">
      <table
        ref={tableRef}
        style={{
          minWidth: `${totalMinWidth}px`,
        }}
        className="table-auto border-collapse"
      >
        <thead>
          <tr className="bg-blue-100">
            {Object.entries(columns).map(([key, col], index) => (
              <th
                key={key}
                className="border border-gray-300 px-4 py-2 text-left"
                style={{
                  width: computedWidths[key] ?? col.width,
                }}
              >
                {col.label ?? key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <Row
              key={rowIndex}
              columnMapping={columns}
              rowData={row}
              rowIndex={rowIndex}
              contextMenuGroups={contextMenuGroups}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
