"use client";

import { BreadcrumbNode, useDashboardLayoutStore } from "@/dashboard/models/dashboard-layout.store";
import Link from "next/link";
import { useShallow } from "zustand/shallow";
import { MdKeyboardArrowRight } from "react-icons/md";

const BreadcrumbItem = (
  {
    node,
    index,
    breadcrumbNodes
  }: {
    node: BreadcrumbNode,
    index: number,
    breadcrumbNodes: BreadcrumbNode[]
  }
) => {
  const isLastOne = index === breadcrumbNodes.length - 1;

  if (isLastOne) {
    return (
      <span className="text-sm font-medium text-gray-800">
        {node.label}
      </span>
    );
  }

  if (node.href === false) {
    return (
      <>
        <span className="text-sm">
          {node.label}
        </span>
        <MdKeyboardArrowRight className="ml-2" />
      </>
    )
  }

  let href = "/" + breadcrumbNodes
    .slice(0, index + 1)
    .map((n) => n.href == null || n.href === false ? n.id : n.href)
    .join("/")
    .replaceAll("//", "/");

  return (
    <>
      <Link
        href={href}
        className="text-sm hover:text-blue-600"
      >
        {node.label}
      </Link>
      <MdKeyboardArrowRight className="ml-2" />
    </>
  )
}

export function BreadCrumb() {
  const { breadcrumbNodes } = useDashboardLayoutStore(
    useShallow((state) => ({
      breadcrumbNodes: state.breadcrumbNodes,
    }))
  );

  return (
    <ul className="flex items-center space-x-2 text-gray-600">
      {breadcrumbNodes?.map((node, index) =>
        <li key={index} className="flex items-center">
          <BreadcrumbItem
            key={node.id}
            node={node}
            index={index}
            breadcrumbNodes={breadcrumbNodes}
          />
        </li>
      )}
    </ul>
  );
}
