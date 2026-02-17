import { useCallback } from "react";
import { useNodeStore } from "./node.store";
import { nodeApi } from "../api/node.api";
import { NodeWithFibers } from "../api/node.api.types";

export const useNode = () => {
    const {
        isLoading,
        setIsLoading,

        error,
        setError,

        nodes,
        setNodes,
    } = useNodeStore();

    const addNode = useCallback(async (node: NodeWithFibers) => {
        const idx = nodes.findIndex(n => n.id === node.id);
        if (idx === -1) {
            setNodes([node, ...nodes]);
        } else {
            setNodes(nodes.map((n, i) => (i === idx ? node : n)));
        }
    }, [setNodes, nodes]);

    const fetchNodes = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const nodes = await nodeApi.getAll();
            setNodes(nodes);
            return nodes;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setNodes]);

    const fetchNode = useCallback(async (nodeId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const node = await nodeApi.getById(nodeId);
            addNode(node);
            return node;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addNode]);

    return {
        isLoading,
        error,
        nodes,
        fetchNodes,
        fetchNode,
    }
}