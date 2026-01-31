import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import { BreadcrumbNode } from "@/libs/types/breadcrumb-node";

export type LayoutResolveResult = {
  breadcrumbNodes: BreadcrumbNode[];
};

export const resolve: Resolver<LayoutResolveResult> = async () => {
  const breadcrumbNodes: BreadcrumbNode[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Orbit", href: "/orbit" },
    { label: "New" },
  ];

  return {
    breadcrumbNodes,
  };
};

export default resolve;
