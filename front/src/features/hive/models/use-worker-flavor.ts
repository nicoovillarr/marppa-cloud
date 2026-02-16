import { WorkerFlavorService } from "../services/worker-flavor.service";
import { useWorkerFlavorStore } from "./worker-flavor.store";

const service = new WorkerFlavorService();

export const useWorkerFlavor = () => {
    const {
        isLoading,
        error,
        flavors,
        setIsLoading,
        setError,
        setFlavors,
    } = useWorkerFlavorStore();

    const fetchFlavors = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const flavors = await service.listAvailableFlavors();
            setFlavors(flavors);
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        flavors,
        fetchFlavors,
    };
}