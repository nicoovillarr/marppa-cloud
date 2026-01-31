import { ApiResponse } from "@/libs/types/api-response";

const TIMEOUT_MS = 30000;

export class ApiProxyService {
  public constructor(private controllerName: string) {}

  public get isServer(): boolean {
    return typeof window === "undefined";
  }

  private get baseUrl(): string {
    return `${this.isServer ? process.env.NEXT_PUBLIC_BASE_URL : ""}/api/${
      this.controllerName
    }`;
  }

  protected async get(action: string, body?: { [key: string]: any } | null) {
    return this.request(action, "GET", body);
  }

  protected async post(action: string, body?: { [key: string]: any } | null) {
    return this.request(action, "POST", body);
  }

  protected async put(action: string, body?: { [key: string]: any } | null) {
    return this.request(action, "PUT", body);
  }

  protected async delete(action: string, body?: { [key: string]: any } | null) {
    return this.request(action, "DELETE", body);
  }

  private async request(
    action: string,
    method: "POST" | "GET" | "PUT" | "DELETE" = "GET",
    body?: { [key: string]: any } | null
  ): Promise<ApiResponse> {
    const headers: HeadersInit = {};

    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    let url = `${this.baseUrl}${action}`;

    if (method === "GET" && body) {
      url = `${url}?${Object.keys(body)
        .map((key) => `${key}=${encodeURIComponent(body[key])}`)
        .join("&")}`;
      body = undefined;
    }

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
    );

    const options: RequestInit = {
      method,
      headers,
      credentials: "include",
      body:
        method !== "GET"
          ? body instanceof FormData
            ? body
            : JSON.stringify(body || {})
          : undefined,
    };

    if (this.isServer) {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("refresh_token")?.value;
      Object.assign(options, {
        cache: "no-store",
        next: { revalidate: 60 },
        headers: {
          ...options.headers,
          cookie: sessionCookie ? `session=${sessionCookie}` : "",
          authorization: sessionCookie ? `Bearer ${sessionCookie}` : "",
        },
      });
    }

    const apiCall = fetch(url, options);

    const response = await Promise.race([apiCall, timeoutPromise]);

    const contentType = response.headers.get("Content-Type");

    let data: any = null;
    try {
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch {}

    return { data, success: response.ok };
  }
}
