import { ApiResponse } from "@/types/api-response";

export class ApiProxyService {
  protected controller: string;

  constructor(controller: string) {
    this.controller = controller;
  }

  protected get baseUrl(): string {
    return `/api/${this.controller}`;
  }

  protected async get(
    action: string,
    body?: { [key: string]: any } | null
  ) {
    return this.request(action, "GET", body);
  }

  protected async post(
    action: string,
    body?: { [key: string]: any } | null
  ) {
    return this.request(action, "POST", body);
  }

  protected async put(
    action: string,
    body?: { [key: string]: any } | null
  ) {
    return this.request(action, "PUT", body);
  }

  protected async delete(
    action: string,
    body?: { [key: string]: any } | null
  ) {
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

    const res = await fetch(url, {
      credentials: "include",
      method,
      headers,
      body:
        method !== "GET"
          ? body instanceof FormData
            ? body
            : JSON.stringify(body || {})
          : undefined,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      data = {
        message: "Error al procesar la respuesta del servidor",
      };
    }

    return { data, success: res.ok };
  }
}
