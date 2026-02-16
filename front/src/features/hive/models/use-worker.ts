import { useCallback } from "react";
import { useWorkerStore } from "./worker.store";
import { WorkerService } from "../services/worker.service";

const service = new WorkerService();

export const useWorker = () => {
    const {
        isLoading,
        error,
        workers,
        setWorkers,
        setIsLoading,
        setError
    } = useWorkerStore();

    const fetchWorkers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const workers = await service.listWorkers();
            setWorkers(workers);
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setWorkers, setIsLoading, setError]);

    return {
        isLoading,
        error,
        workers,
        fetchWorkers,
    };
}