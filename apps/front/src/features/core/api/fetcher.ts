const isProduction = process.env.NODE_ENV === "production";
const CREDENTIALS: RequestCredentials = isProduction ? "include" : "same-origin";
const SESSION_REFRESH_ACTION = "/auth/tick";

type RequestMethod = "POST" | "GET" | "PUT" | "DELETE";
type RequestBody = { [key: string]: any } | null | undefined;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function buildUrl(
  action: string,
  method: RequestMethod,
  body?: RequestBody
): string {
  const url = `/api${action}`;

  if (method !== "GET" || !body) return url;

  const query = Object.keys(body)
    .filter((key) => body[key] !== undefined && body[key] !== null)
    .map((key) => `${key}=${encodeURIComponent(body[key])}`)
    .join("&");

  return query ? `${url}?${query}` : url;
}

function buildRequest(method: RequestMethod, body?: RequestBody): RequestInit {
  const headers: HeadersInit = {};

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (method !== "GET") {
    const csrfToken = readCookie("csrf_token");
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return {
    credentials: CREDENTIALS,
    method,
    headers,
    body:
      method !== "GET"
        ? body instanceof FormData
          ? body
          : JSON.stringify(body || {})
        : undefined,
  };
}

let pendingSessionRefresh: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  pendingSessionRefresh ??= fetch(
    `/api${SESSION_REFRESH_ACTION}`,
    buildRequest("GET")
  )
    .then((res) => (res.ok ? res.json() : false))
    .then((refreshed) => refreshed === true)
    .catch(() => false)
    .finally(() => {
      pendingSessionRefresh = null;
    });

  return pendingSessionRefresh;
}

function toErrorMessage(data: any): string {
  const { message } = data ?? {};

  if (Array.isArray(message)) return message.join(". ");
  if (typeof message === "string") return message;

  return "Unknown error";
}

export const fetcher = async <T>(
  action: string,
  method: RequestMethod = "GET",
  body?: { [key: string]: any } | null
): Promise<T> => {
  const url = buildUrl(action, method, body);
  const payload = method === "GET" ? undefined : body;

  let res = await fetch(url, buildRequest(method, payload));

  if (
    res.status === 401 &&
    action !== SESSION_REFRESH_ACTION &&
    (await refreshSession())
  ) {
    res = await fetch(url, buildRequest(method, payload));
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = {
      message: "There was a problem while processing the server response",
    };
  }

  if (!res.ok) {
    throw new Error(toErrorMessage(data));
  }

  return data;
};
