import { fetcher } from "@/core/api/fetcher";
import {
    ConfirmPasswordResetDto,
    LoginDto,
    RegisterDto,
    RequestPasswordResetDto,
} from "./auth.api.types";

export const authApi = {
    tick: async () => {
        const response = await fetcher<boolean>("/auth/tick", "GET");
        return response;
    },

    login: async ({ email, password, captchaToken }: LoginDto) => {
        const response = await fetcher<boolean>(
            "/auth/login",
            "POST",
            {
                email,
                password,
                captchaToken,
            },
        );

        return response;
    },

    register: async ({ email, password, name, captchaToken }: RegisterDto) => {
        const response = await fetcher<boolean>(
            "/auth/register",
            "POST",
            {
                email,
                password,
                name,
                captchaToken,
            }
        );

        return response;
    },

    logout: async () => {
        const response = await fetcher("/auth/logout", "POST", {});
        return response;
    },

    requestPasswordReset: async ({ email, captchaToken }: RequestPasswordResetDto) => {
        await fetcher("/auth/reset-password", "POST", { email, captchaToken });
    },

    confirmPasswordReset: async ({ token, newPassword }: ConfirmPasswordResetDto) => {
        await fetcher("/auth/reset-password/confirm", "POST", { token, newPassword });
    },
};
