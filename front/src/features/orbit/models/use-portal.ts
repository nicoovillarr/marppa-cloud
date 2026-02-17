import { useCallback } from "react";
import { portalApi } from "../api/portal.api";
import { usePortalStore } from "./portal.store"
import { CreatePortalDto, PortalWithTranspondersResponseDto } from "../api/portal.api.types";

export const usePortal = () => {
    const {
        isLoading,
        setIsLoading,

        error,
        setError,

        portalTypes,
        setPortalTypes,

        portals,
        setPortals,
    } = usePortalStore();

    const addPortal = useCallback((portal: PortalWithTranspondersResponseDto) => {
        const idx = portals.findIndex(p => p.id === portal.id);
        if (idx === -1) {
            setPortals([portal, ...portals]);
        } else {
            setPortals(portals.map((p, i) => (i === idx ? portal : p)));
        }
    }, [setPortals, portals]);

    const fetchPortalTypes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const portalTypes = await portalApi.fetchPortalTypes();
            setPortalTypes(portalTypes);

            return portalTypes;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setPortalTypes]);

    const fetchPortals = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const portals = await portalApi.fetchAll();
            setPortals(portals);

            return portals;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setPortals]);

    const fetchPortalById = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const portal = await portalApi.fetchById(id);
            addPortal(portal);

            return portal;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addPortal]);

    const createPortal = useCallback(async (data: CreatePortalDto) => {
        setIsLoading(true);
        setError(null);
        try {
            const portal = await portalApi.create(data);
            addPortal(portal);

            return portal;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addPortal]);

    const updatePortal = useCallback(async (id: string, data: Partial<CreatePortalDto>) => {
        setIsLoading(true);
        setError(null);
        try {
            const portal = await portalApi.update(id, data);
            addPortal(portal);

            return portal;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addPortal]);

    const deletePortal = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await portalApi.delete(id);
            setPortals(portals.filter((portal) => portal.id !== id));
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setPortals]);

    return {
        isLoading,
        error,
        portalTypes,
        portals,
        fetchPortalTypes,
        fetchPortals,
        fetchPortalById,
        createPortal,
        updatePortal,
        deletePortal,
    };
}