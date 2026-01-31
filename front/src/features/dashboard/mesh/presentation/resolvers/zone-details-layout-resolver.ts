import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import { BreadcrumbNode } from "@/libs/types/breadcrumb-node";

export type LayoutResolveResult = {
  breadcrumbNodes: BreadcrumbNode[];
  title: string;
  subtitle: string;
};

export const resolve: Resolver<LayoutResolveResult> = async ({
  params,
  user,
}) => {
  const { zoneId } = await params;

  const breadcrumbNodes: BreadcrumbNode[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Mesh", href: "/mesh" },
    { label: zoneId, href: `/${zoneId}` },
  ];

  return {
    breadcrumbNodes,
    title: zoneId,
    subtitle: "Manage your zone details and settings here.",
  };
};

export default resolve;
