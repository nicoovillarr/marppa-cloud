import { useCallback, useState } from "react";
import { fiberApi } from "../api/fiber.api";
import { CreateFiberDto, FiberResponseDto } from "../api/fiber.api.types";

export const useFiber = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const fetchFibers = useCallback(async (zoneId: string, nodeId: string): Promise<FiberResponseDto[] | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await fiberApi.getAll(zoneId, nodeId);
        } catch (error) {
            setError(error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createFiber = useCallback(async (zoneId: string, nodeId: string, data: CreateFiberDto): Promise<FiberResponseDto | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await fiberApi.create(zoneId, nodeId, data);
        } catch (error) {
            setError(error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deleteFiber = useCallback(async (zoneId: string, nodeId: string, fiberId: string | number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await fiberApi.delete(zoneId, nodeId, fiberId);
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        fetchFibers,
        createFiber,
        deleteFiber,
    }
}
