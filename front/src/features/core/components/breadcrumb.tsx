"use client";

import { useLayoutStore } from "@/store/layout-store";
import Link from "next/link";
import { useShallow } from "zustand/shallow";
import { MdKeyboardArrowRight } from "react-icons/md";

export default function BreadCrumb() {
  const { isInitialized, breadcrumbNodes } = useLayoutStore(
    useShallow((state) => ({
      isInitialized: state.isInitialized,
      breadcrumbNodes: state.breadcrumbNodes,
    }))
  );

  return (
    <ul className="flex items-center space-x-2 text-gray-600">
      {breadcrumbNodes?.map((node, index) => (
        <li key={index} className="flex items-center">
          {index === breadcrumbNodes.length - 1 ? (
            <span key={index} className="text-sm font-medium text-gray-800">
              {node.label}
            </span>
          ) : (
            <Link
              key={index}
              href={breadcrumbNodes
                .slice(0, index + 1)
                .map((n) => n.href)
                .join("/")}
              className="text-sm hover:text-blue-600"
            >
              {node.label}
            </Link>
          )}
          {index < breadcrumbNodes.length - 1 && (
            <MdKeyboardArrowRight key={`${index}-arrow`} className="ml-2" />
          )}
        </li>
      ))}
    </ul>
  );
}
