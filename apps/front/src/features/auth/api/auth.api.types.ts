export type LoginDto = {
    email: string;
    password: string;
    captchaToken?: string;
}

export type RegisterDto = {
    email: string;
    password: string;
    name: string;
    captchaToken?: string;
}

export type RequestPasswordResetDto = {
    email: string;
    captchaToken?: string;
}

export type ConfirmPasswordResetDto = {
    token: string;
    newPassword: string;
}
