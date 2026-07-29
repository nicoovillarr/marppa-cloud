import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/reset-password"];

export async function middleware(request: NextRequest) {
    const hasSession =
        request.cookies.has("has_session") || request.cookies.has("access_token");
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/dashboard") && !hasSession) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (AUTH_ROUTES.some((route) => pathname.startsWith(route)) && hasSession) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/reset-password/:path*"],
};
