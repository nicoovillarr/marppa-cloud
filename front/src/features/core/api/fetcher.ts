const isProduction = process.env.NODE_ENV === "production";

export const fetcher = async <T>(
  action: string,
  method: "POST" | "GET" | "PUT" | "DELETE" = "GET",
  body?: { [key: string]: any } | null
): Promise<T> => {
  const headers: HeadersInit = {};

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let url = `/api${action}`;

  if (method === "GET" && body) {
    url = `${url}?${Object.keys(body)
      .map((key) => `${key}=${encodeURIComponent(body[key])}`)
      .join("&")}`;
    body = undefined;
  }

  const res = await fetch(url, {
    credentials: isProduction ? "include" : "same-origin",
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
      message: "There was a problem while processing the server response",
    };
  }

  if (!res.ok) {
    throw new Error(data.message ?? "Unknown error");
  }

  return data;
};
