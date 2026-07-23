"use client";

import { useEffect, useState } from "react";
import { Table, TableProps } from "./Table";

export type AsyncTableProps<T, K extends string> = Omit<TableProps<T, K>, "data"> & {
  fetchData: () => Promise<T[]>;
};

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <section className="w-full space-y-2">
      <header className="shrink-0 w-full h-12 rounded-sm bg-gray-300 animate-pulse"></header>
      {[...Array(rows)].map((_, i) => (
        <article
          key={i}
          className="w-full flex gap-x-2"
          style={{
            opacity: `${100 - i * (100 / rows)}%`,
          }}
        >
          <div className="shrink-0 w-1/12 h-8 rounded-md bg-gray-300 animate-pulse"></div>
          <div className="shrink-0 w-2/12 h-8 rounded-md bg-gray-300 animate-pulse"></div>
          <div className="shrink-0 flex-1 h-8 rounded-md bg-gray-300 animate-pulse"></div>
          <div className="shrink-0 w-2/12 h-8 rounded-md bg-gray-300 animate-pulse"></div>
          <div className="shrink-0 w-1/12 h-8 rounded-md bg-gray-300 animate-pulse"></div>
          <div className="shrink-0 w-1/12 h-8 rounded-md bg-gray-300 animate-pulse"></div>
        </article>
      ))}
    </section>
  );
}

export function AsyncTable<T, K extends string>({ fetchData, ...props }: AsyncTableProps<T, K>) {
  const [data, setData] = useState<T[] | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDataAsync = async () => {
      const result = await fetchData();
      if (isMounted) {
        setData(result);
      }
    };

    fetchDataAsync();

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  if (data === null) {
    return <TableSkeleton />;
  }

  return <Table {...props} data={data} />;
}
