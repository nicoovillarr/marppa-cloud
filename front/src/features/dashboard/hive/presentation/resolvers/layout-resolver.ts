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
    { label: "Hive", href: "/hive" },
  ];

  return {
    breadcrumbNodes,
    title: "Hive",
    subtitle:
      "Manage your workers, deploy applications, and scale your infrastructure with ease.",
  };
};

export default resolve;
