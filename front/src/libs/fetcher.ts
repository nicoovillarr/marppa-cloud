import { ApiResponse } from "@/types/api-response";

export const fetcher = async (
  action: string,
  method: "POST" | "GET" | "PUT" | "DELETE" = "GET",
  body?: { [key: string]: any } | null
): Promise<ApiResponse> => {
  const headers: HeadersInit = {};

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let url = action;

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
};
