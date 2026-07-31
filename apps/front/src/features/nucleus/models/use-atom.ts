import { useCallback } from "react";
import { useAtomStore } from "./atom.store";
import { AtomService } from "../services/atom.service";
import { CreateAtomEnvVarDto } from "../api/atom.api.types";

const service = new AtomService();

export const useAtom = () => {
    const {
        isLoading,
        error,
        atoms,
        setAtoms,
        setIsLoading,
        setError
    } = useAtomStore();

    const fetchAtoms = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const atoms = await service.listAtoms();
            setAtoms(atoms);
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setAtoms, setIsLoading, setError]);

    const fetchAtom = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const atom = await service.getAtom(id);
            setAtoms([
                atom,
                ...atoms.filter((a) => a.id !== id),
            ]);

            return atom;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [atoms, setAtoms, setIsLoading, setError]);

    const createAtom = useCallback(async (
        name: string,
        imageId: number,
        sizeId: number,
        tag: string,
        envVars?: CreateAtomEnvVarDto[],
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            return await service.createAtom(name, imageId, sizeId, tag, envVars);
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const updateAtom = useCallback(async (id: string, name: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const atom = await service.updateAtom(id, name);
            setAtoms(atoms.map((a) => a.id === id ? { ...a, ...atom } : a));
            return atom;
        } catch (error) {
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [atoms, setAtoms, setIsLoading, setError]);

    const startAtom = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await service.startAtom(id);
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const terminateAtom = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await service.terminateAtom(id);
            return true;
        } catch (error) {
            setError(error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError]);

    const deleteAtom = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await service.deleteAtom(id);
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
        atoms,
        fetchAtom,
        fetchAtoms,
        createAtom,
        updateAtom,
        startAtom,
        terminateAtom,
        deleteAtom,
    };
}
