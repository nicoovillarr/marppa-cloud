import { useCallback } from "react";
import { useZoneStore } from "./zone.store"
import { zoneApi } from "../api/zone.api";
import { ZoneWithNodes, ZoneWithNodesAndFibers } from "../api/zone.api.types";

const toErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

export const useZone = () => {
    const {
        isLoading,
        setIsLoading,

        error,
        setError,

        zones,
        setZones
    } = useZoneStore();

    const fetchZones = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const zones = await zoneApi.fetchAll();
            setZones(zones);

            return zones;
        } catch (error) {
            setError(toErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setZones]);


    const fetchZone = useCallback(async (id: string): Promise<ZoneWithNodesAndFibers | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const zone = await zoneApi.fetchById(id);
            return zone;
        } catch (error) {
            setError(toErrorMessage(error));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const validateZone = useCallback(async (zone: ZoneWithNodes) => {
        const zones = (await fetchZones()).filter(z => z.id !== zone.id);

        const { name } = zone;

        const validationErrors: Record<string, string> = {};

        const onError = (field: string, message: string) => {
            if (!validationErrors[field]) {
                validationErrors[field] = message;
            }
        };

        if (!name || name.trim() === "") {
            onError("name", "Zone Name is required.");
        }

        if (zones.some((z) => z.name.toLowerCase() === name.toLowerCase())) {
            onError("name", "This zone name already exists.");
        }

        return validationErrors;
    }, [fetchZones])

    const createZone = useCallback(async (name: string, description?: string, cidr?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const zone = await zoneApi.create({
                name,
                description,
                cidr: cidr?.trim() || undefined,
            });

            setZones([...zones, zone]);

            return zone;
        } catch (error) {
            setError(toErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setZones]);

    const updateZone = useCallback(async (id: string, name: string, description?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const zone = await zoneApi.update(id, {
                name,
                description
            });

            setZones([...zones, zone]);

            return zone;
        } catch (error) {
            setError(toErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setZones]);

    const stopZone = useCallback(async (id: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await zoneApi.stop(id);
            return true;
        } catch (error) {
            setError(toErrorMessage(error));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const startZone = useCallback(async (id: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await zoneApi.start(id);
            return true;
        } catch (error) {
            setError(toErrorMessage(error));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    return {
        isLoading,
        error,
        zones,
        fetchZones,
        fetchZone,
        validateZone,
        createZone,
        updateZone,
        stopZone,
        startZone,
    }
}