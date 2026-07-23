import { useCallback } from "react";
import { useNodeStore } from "./node.store";
import { nodeApi } from "../api/node.api";
import { zoneApi } from "../api/zone.api";
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

    // There is no global nodes endpoint: aggregate the nodes of every zone.
    const fetchNodes = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const zones = await zoneApi.fetchAll();
            const nodes = zones.flatMap((zone) =>
                zone.nodes.map((node) => ({ ...node, fibers: [] })),
            );
            setNodes(nodes);
            return nodes;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setNodes]);

    const fetchNode = useCallback(async (zoneId: string, nodeId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const node = await nodeApi.getById(zoneId, nodeId);
            addNode(node);
            return node;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addNode]);

    const createNode = useCallback(async (zoneId: string, workerId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            return await nodeApi.create(zoneId, { workerId });
        } catch (error) {
            setError(error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const deleteNode = useCallback(async (zoneId: string, nodeId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await nodeApi.delete(zoneId, nodeId);
            setNodes(nodes.filter((n) => n.id !== nodeId));
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setNodes, nodes]);

    const stopNode = useCallback(async (zoneId: string, nodeId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await nodeApi.stop(zoneId, nodeId);
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const startNode = useCallback(async (zoneId: string, nodeId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await nodeApi.start(zoneId, nodeId);
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    return {
        isLoading,
        error,
        nodes,
        fetchNodes,
        fetchNode,
        createNode,
        deleteNode,
        stopNode,
        startNode,
    }
}
