import { fetcher } from "@/core/api/fetcher";
import {
    AdminCompanyResponseDto,
    AdminHostCapacityResponseDto,
    AdminResourceResponseDto,
    AdminUserResponseDto,
    CreateAdminCompanyDto,
    CreateAdminUserDto,
    UpdateAdminUserDto,
    UpsertHostCapacityDto,
} from "./admin.api.types";

const baseUrl = '/admin';

export const adminApi = {
    findCompanies(): Promise<AdminCompanyResponseDto[]> {
        return fetcher<AdminCompanyResponseDto[]>(`${baseUrl}/companies`);
    },

    createCompany(data: CreateAdminCompanyDto): Promise<AdminCompanyResponseDto> {
        return fetcher<AdminCompanyResponseDto>(`${baseUrl}/companies`, 'POST', data);
    },

    updateCompany(id: string, data: CreateAdminCompanyDto): Promise<AdminCompanyResponseDto> {
        return fetcher<AdminCompanyResponseDto>(`${baseUrl}/companies/${id}`, 'PUT', data);
    },

    deleteCompany(id: string): Promise<void> {
        return fetcher<void>(`${baseUrl}/companies/${id}`, 'DELETE');
    },

    findUsers(): Promise<AdminUserResponseDto[]> {
        return fetcher<AdminUserResponseDto[]>(`${baseUrl}/users`);
    },

    createUser(data: CreateAdminUserDto): Promise<AdminUserResponseDto> {
        return fetcher<AdminUserResponseDto>(`${baseUrl}/users`, 'POST', data);
    },

    updateUser(id: string, data: UpdateAdminUserDto): Promise<AdminUserResponseDto> {
        return fetcher<AdminUserResponseDto>(`${baseUrl}/users/${id}`, 'PUT', data);
    },

    deleteUser(id: string): Promise<void> {
        return fetcher<void>(`${baseUrl}/users/${id}`, 'DELETE');
    },

    findHosts(): Promise<AdminHostCapacityResponseDto[]> {
        return fetcher<AdminHostCapacityResponseDto[]>(`${baseUrl}/hosts`);
    },

    upsertHost(hostname: string, data: UpsertHostCapacityDto): Promise<AdminHostCapacityResponseDto> {
        return fetcher<AdminHostCapacityResponseDto>(`${baseUrl}/hosts/${hostname}`, 'PUT', data);
    },

    deleteHost(hostname: string): Promise<void> {
        return fetcher<void>(`${baseUrl}/hosts/${hostname}`, 'DELETE');
    },

    findResources(): Promise<AdminResourceResponseDto[]> {
        return fetcher<AdminResourceResponseDto[]>(`${baseUrl}/resources`);
    },
}
