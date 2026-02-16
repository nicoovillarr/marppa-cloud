import { useWorkerImageStore } from "./worker-image.store";
import { WorkerImageService } from "../services/worker-image.service";
import { useCallback } from "react";

const workerImageService = new WorkerImageService();

export const useWorkerImage = () => {
    const {
        isLoading,
        setIsLoading,
        error,
        setError,
        images,
        setImages,
    } = useWorkerImageStore();

    const fetchImages = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const images = await workerImageService.findAll();
            setImages(images);

            return images;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setImages, setIsLoading, setError]);

    return {
        isLoading,
        setIsLoading,
        error,
        setError,
        images,
        setImages,
        fetchImages,
    };
}