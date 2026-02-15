export type LoginDto = {
    email: string;
    password: string;
} 

export type RegisterDto = {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
}

export type AuthResponseDto = {
    accessToken: string;
    refreshToken: string;
}