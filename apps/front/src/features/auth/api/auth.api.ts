import { fetcher, refreshSession } from "@/core/api/fetcher";
import {
    ConfirmPasswordResetDto,
    LoginDto,
    RegisterDto,
    RequestPasswordResetDto,
} from "./auth.api.types";

export const authApi = {
    tick: async () => {
        return await refreshSession();
    },

    login: async ({ email, password, captchaToken }: LoginDto) => {
        await fetcher(
            "/auth/login",
            "POST",
            {
                email,
                password,
                captchaToken,
            },
        );

        return true;
    },

    register: async ({ email, password, name, captchaToken }: RegisterDto) => {
        await fetcher(
            "/auth/register",
            "POST",
            {
                email,
                password,
                name,
                captchaToken,
            }
        );

        return true;
    },

    logout: async () => {
        await fetcher("/auth/logout", "POST", {});
    },

    requestPasswordReset: async ({ email, captchaToken }: RequestPasswordResetDto) => {
        await fetcher("/auth/reset-password", "POST", { email, captchaToken });
    },

    confirmPasswordReset: async ({ token, newPassword }: ConfirmPasswordResetDto) => {
        await fetcher("/auth/reset-password/confirm", "POST", { token, newPassword });
    },
};
