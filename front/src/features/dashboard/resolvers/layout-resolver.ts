import { Resolver } from "@/core/resolvers/with-resolver";
import { BreadcrumbNode } from "@/types/breadcrumb-node";

export type LayoutResolveResult = {
  breadcrumbNodes: BreadcrumbNode[];
};

export const resolve: Resolver<LayoutResolveResult> = async ({ params, user }) => {
  const breadcrumbNodes: BreadcrumbNode[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];

  return {
    breadcrumbNodes,
  };
};

export default resolve;