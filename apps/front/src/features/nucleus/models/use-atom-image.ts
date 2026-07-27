import { useCallback } from "react";
import { useAtomImageStore } from "./atom-image.store";
import { AtomImageService } from "../services/atom-image.service";

const atomImageService = new AtomImageService();

export const useAtomImage = () => {
    const {
        isLoading,
        setIsLoading,
        error,
        setError,
        images,
        setImages,
    } = useAtomImageStore();

    const fetchImages = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const images = await atomImageService.findAll();
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
