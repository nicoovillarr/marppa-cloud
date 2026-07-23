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

    const startWorker = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await service.startWorker(id);
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const terminateWorker = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await service.terminateWorker(id);
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const deleteWorker = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await service.deleteWorker(id);
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
        workers,
        fetchWorker,
        fetchWorkers,
        createWorker,
        updateWorker,
        startWorker,
        terminateWorker,
        deleteWorker,
    };
}