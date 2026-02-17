import { AuthResponseDto, LoginDto, RegisterDto } from "../api/auth.api.types";
import { authApi } from "../api/auth.api";

export const authService = {
    async tick(): Promise<AuthResponseDto> {
        return await authApi.tick();
    },

    async login({ email, password }: LoginDto): Promise<AuthResponseDto> {
        return await authApi.login({
            email,
            password,
        });
    },

    async register(data: RegisterDto): Promise<AuthResponseDto> {
        return await authApi.register(data);
    },

    async logout(): Promise<void> {
        await authApi.logout();
    },
};
