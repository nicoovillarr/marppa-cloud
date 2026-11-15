import { useCallback, useState } from "react";
import { toast } from "sonner";
import { dnsApiKeyApi } from "../api/dns-api-key.api";
import { CreateDnsApiKeyDto, UpdateDnsApiKeyDto } from "../api/dns-api-key.api.types";
import { useDnsApiKeyStore } from "./dns-api-key.store";

export const useDnsApiKey = () => {
    const { dnsApiKeys, setDnsApiKeys, upsertDnsApiKey, removeDnsApiKey } = useDnsApiKeyStore();
    const [busy, setBusy] = useState(false);

    const run = useCallback(async <T>(action: () => Promise<T>, failure: string): Promise<T | null> => {
        setBusy(true);
        try {
            return await action();
        } catch (error: any) {
            toast.error(error?.message ?? failure);
            return null;
        } finally {
            setBusy(false);
        }
    }, []);

    const fetchDnsApiKeys = useCallback(
        () => run(async () => {
            const keys = await dnsApiKeyApi.fetchAll();
            setDnsApiKeys(keys);
            return keys;
        }, "Failed to load API keys."),
        [run, setDnsApiKeys],
    );

    const createDnsApiKey = useCallback(
        (data: CreateDnsApiKeyDto) => run(async () => {
            const key = await dnsApiKeyApi.create(data);
            upsertDnsApiKey(key);
            return key;
        }, "Failed to create API key."),
        [run, upsertDnsApiKey],
    );

    const updateDnsApiKey = useCallback(
        (id: number, data: UpdateDnsApiKeyDto) => run(async () => {
            const key = await dnsApiKeyApi.update(id, data);
            upsertDnsApiKey(key);
            return key;
        }, "Failed to update API key."),
        [run, upsertDnsApiKey],
    );

    const deleteDnsApiKey = useCallback(
        (id: number) => run(async () => {
            await dnsApiKeyApi.delete(id);
            removeDnsApiKey(id);
            return true;
        }, "Failed to delete API key."),
        [run, removeDnsApiKey],
    );

    return {
        busy,
        dnsApiKeys,
        fetchDnsApiKeys,
        createDnsApiKey,
        updateDnsApiKey,
        deleteDnsApiKey,
    };
}
