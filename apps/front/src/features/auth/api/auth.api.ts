import { fetcher } from "@/core/api/fetcher";
import { AuthResponseDto, LoginDto, RegisterDto } from "./auth.api.types";

export const authApi = {
    tick: async () => {
        const response = await fetcher<boolean>("/auth/tick", "GET");
        return response;
    },

    login: async ({ email, password }: LoginDto) => {
        const response = await fetcher<boolean>(
            "/auth/login",
            "POST",
            {
                email,
                password,
            },
        );

        return response;
    },

    register: async ({ email, password, firstName, lastName }: RegisterDto) => {
        const response = await fetcher<boolean>(
            "/auth/register",
            "POST",
            {
                email,
                password,
                firstName,
                lastName,
            }
        );

        return response;
    },

    logout: async () => {
        const response = await fetcher("/auth/logout", "POST", {});
        return response;
    },
};
