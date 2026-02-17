import { BreadcrumbNode, useDashboardLayoutStore } from "./dashboard-layout.store"

export const useDashboardLayout = () => {
    const {
        breadcrumbNodes,
        setBreadcrumbNodes,

        title,
        setTitle,

        subtitle,
        setSubtitle,
    } = useDashboardLayoutStore();

    const addBreadcrumbNode = (node: BreadcrumbNode) => {
        setBreadcrumbNodes([...breadcrumbNodes, node]);
    };

    const removeBreadcrumbNode = (node: BreadcrumbNode) => {
        setBreadcrumbNodes(breadcrumbNodes.filter((n) => n.id !== node.id));
    };

    const clearBreadcrumbNodes = () => {
        setBreadcrumbNodes([]);
    };

    return {
        title,
        setTitle,
        subtitle,
        setSubtitle,
        breadcrumbNodes,
        setBreadcrumbNodes,
        addBreadcrumbNode,
        removeBreadcrumbNode,
        clearBreadcrumbNodes,
    };
}