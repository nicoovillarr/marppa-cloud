import { useCallback } from "react";
import { useTransponderStore } from "./transponder.store";
import { transponderApi } from "../api/transponder.api";
import { TransponderResponseModel, CreateTransponderDto } from "../api/transponder.api.type";
import { TransponderService } from "../services/transponder.service";

const service = new TransponderService();

export const useTransponder = () => {
    const {
        isLoading,
        setIsLoading,

        error,
        setError,

        transponderModes,
        setTransponderModes,

        transponders,
        setTransponders,
    } = useTransponderStore();

    const addTransponder = useCallback((transponder: TransponderResponseModel) => {
        const idx = transponders.findIndex(t => t.id === transponder.id);
        if (idx === -1) {
            setTransponders([transponder, ...transponders]);
        } else {
            setTransponders(transponders.map((t, i) => (i === idx ? transponder : t)));
        }
    }, [setTransponders, transponders]);

    const fetchTransponderModes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const transponderModes = await service.fetchTransponderModes();
            setTransponderModes(transponderModes);

            return transponderModes;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setTransponderModes]);

    const fetchTransponders = useCallback(async (portalId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const transponders = await service.fetchAll(portalId);
            setTransponders(transponders);

            return transponders;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setTransponders]);

    const fetchTransponderById = useCallback(async (portalId: string, id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const transponder = await service.fetchById(portalId, id);
            addTransponder(transponder);

            return transponder;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addTransponder]);

    const createTransponder = useCallback(async (portalId: string, data: CreateTransponderDto) => {
        setIsLoading(true);
        setError(null);
        try {
            const transponder = await service.create(portalId, data);
            addTransponder(transponder);

            return transponder;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addTransponder]);

    const updateTransponder = useCallback(async (portalId: string, id: string, data: Partial<CreateTransponderDto>) => {
        setIsLoading(true);
        setError(null);
        try {
            const transponder = await service.update(portalId, id, data);
            addTransponder(transponder);

            return transponder;
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, addTransponder]);

    const deleteTransponder = useCallback(async (portalId: string, id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await service.delete(portalId, id);
            setTransponders(transponders.filter((transponder) => transponder.id !== id));
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setTransponders]);

    return {
        isLoading,
        error,
        transponderModes,
        transponders,
        fetchTransponderModes,
        fetchTransponders,
        fetchTransponderById,
        createTransponder,
        updateTransponder,
        deleteTransponder,
    };
}