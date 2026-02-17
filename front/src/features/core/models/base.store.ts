export interface BaseStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;
}

export const baseStore: BaseStore = {
    isLoading: false,
    setIsLoading: (isLoading: boolean) => {
        baseStore.isLoading = isLoading;
    },

    error: null,
    setError: (error: string | null) => {
        baseStore.error = error;
    },
}