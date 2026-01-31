import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import { BreadcrumbNode } from "@/libs/types/breadcrumb-node";

export type LayoutResolveResult = {
  breadcrumbNodes: BreadcrumbNode[];
  title: string;
  subtitle: string;
};

export const resolve: Resolver<LayoutResolveResult> = async ({ params, user }) => {
  const breadcrumbNodes: BreadcrumbNode[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Mesh", href: "/mesh" },
  ];

  return {
    breadcrumbNodes,
    title: "Mesh",
    subtitle: "You can create, manage, and monitor your zones from this dashboard.",
  };
};

export default resolve;