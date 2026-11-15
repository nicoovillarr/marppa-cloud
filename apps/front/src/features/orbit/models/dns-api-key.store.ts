import { create } from "zustand";
import { DnsApiKeyResponseDto } from "../api/dns-api-key.api.types";

interface IDnsApiKeyStore {
    dnsApiKeys: DnsApiKeyResponseDto[] | null;
    setDnsApiKeys: (dnsApiKeys: DnsApiKeyResponseDto[]) => void;
    upsertDnsApiKey: (dnsApiKey: DnsApiKeyResponseDto) => void;
    removeDnsApiKey: (id: number) => void;
}

export const useDnsApiKeyStore = create<IDnsApiKeyStore>((set) => ({
    dnsApiKeys: null,
    setDnsApiKeys: (dnsApiKeys) => set({ dnsApiKeys }),
    upsertDnsApiKey: (dnsApiKey) => set((state) => {
        const current = state.dnsApiKeys ?? [];
        const exists = current.some((key) => key.id === dnsApiKey.id);
        const next = exists
            ? current.map((key) => (key.id === dnsApiKey.id ? dnsApiKey : key))
            : [...current, dnsApiKey];
        return { dnsApiKeys: next.sort((a, b) => a.name.localeCompare(b.name)) };
    }),
    removeDnsApiKey: (id) => set((state) => ({
        dnsApiKeys: (state.dnsApiKeys ?? []).filter((key) => key.id !== id),
    })),
}));
