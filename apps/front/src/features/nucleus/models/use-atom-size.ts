import { useCallback } from "react";
import { useAtomSizeStore } from "./atom-size.store";
import { AtomSizeService } from "../services/atom-size.service";

const atomSizeService = new AtomSizeService();

export const useAtomSize = () => {
    const {
        isLoading,
        setIsLoading,
        error,
        setError,
        sizes,
        setSizes,
    } = useAtomSizeStore();

    const fetchSizes = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const sizes = await atomSizeService.findAll();
            setSizes(sizes);

            return sizes;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setSizes, setIsLoading, setError]);

    return {
        isLoading,
        error,
        sizes,
        fetchSizes,
    };
}
