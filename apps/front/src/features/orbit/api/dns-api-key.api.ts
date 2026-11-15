import { fetcher } from "@/core/api/fetcher";
import { CreateDnsApiKeyDto, DnsApiKeyResponseDto, UpdateDnsApiKeyDto } from "./dns-api-key.api.types";

const baseUrl = '/orbit/dns-api-keys';

export const dnsApiKeyApi = {
    fetchAll(): Promise<DnsApiKeyResponseDto[]> {
        return fetcher(baseUrl);
    },

    create(data: CreateDnsApiKeyDto): Promise<DnsApiKeyResponseDto> {
        return fetcher(baseUrl, 'POST', data);
    },

    update(id: number, data: UpdateDnsApiKeyDto): Promise<DnsApiKeyResponseDto> {
        return fetcher(`${baseUrl}/${id}`, 'PUT', data);
    },

    delete(id: number): Promise<void> {
        return fetcher(`${baseUrl}/${id}`, 'DELETE');
    },
}
