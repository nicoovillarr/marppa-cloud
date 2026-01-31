import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import { BreadcrumbNode } from "@/libs/types/breadcrumb-node";

export type LayoutResolveResult = {
  breadcrumbNodes: BreadcrumbNode[];
  title: string;
  subtitle: string;
};

export const resolve: Resolver<LayoutResolveResult> = async () => {
  const breadcrumbNodes: BreadcrumbNode[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Orbit", href: "/orbit" },
  ];

  return {
    breadcrumbNodes,
    title: "Orbit",
    subtitle: "List of all portals in your company.",
  };
};

export default resolve;
