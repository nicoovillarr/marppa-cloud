import { useCallback } from "react";
import { useWorkerFamilyStore } from "./worker-family.store"
import { workerFamilyApi } from "../api/worker-family.api";

export const useWorkerFamily = () => {
    const {
        isLoading,
        error,
        families,
        setFamilies,
        setIsLoading,
        setError
    } = useWorkerFamilyStore();

    const fetchFamilies = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const families = await workerFamilyApi.findAll();
            setFamilies(families);

            return families;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setFamilies, setIsLoading, setError]);

    return {
        isLoading,
        error,
        families,
        fetchFamilies,
    };
}