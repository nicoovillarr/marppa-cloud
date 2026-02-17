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

    const fetchWorker = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const worker = await service.getWorker(id);
            setWorkers([
                worker,
                ...workers,
            ]);

            return worker;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setWorkers, setIsLoading, setError]);

    const createWorker = useCallback(async (name: string, imageId: number, flavorId: number, publicSSH?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const worker = await service.createWorker(name, imageId, flavorId, publicSSH);
            return worker;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setWorkers, setIsLoading, setError]);

    const updateWorker = useCallback(async (id: string, name: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const worker = await service.updateWorker(id, name);
            setWorkers(workers.map((w) => w.id === id ? worker : w));
            return worker;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [workers, setWorkers, setIsLoading, setError])

    return {
        isLoading,
        error,
        workers,
        fetchWorker,
        fetchWorkers,
        createWorker,
        updateWorker,
    };
}