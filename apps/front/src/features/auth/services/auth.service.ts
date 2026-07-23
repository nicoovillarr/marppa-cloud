import {
    ConfirmPasswordResetDto,
    LoginDto,
    RegisterDto,
    RequestPasswordResetDto,
} from "../api/auth.api.types";
import { authApi } from "../api/auth.api";

export const authService = {
    async tick(): Promise<boolean> {
        return await authApi.tick();
    },

    async login({ email, password, captchaToken }: LoginDto): Promise<boolean> {
        return await authApi.login({
            email,
            password,
            captchaToken,
        });
    },

    async register(data: RegisterDto): Promise<boolean> {
        return await authApi.register(data);
    },

    async logout(): Promise<void> {
        await authApi.logout();
    },

    async requestPasswordReset(data: RequestPasswordResetDto): Promise<void> {
        await authApi.requestPasswordReset(data);
    },

    async confirmPasswordReset(data: ConfirmPasswordResetDto): Promise<void> {
        await authApi.confirmPasswordReset(data);
    },
};
