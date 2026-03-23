import { NextRequest } from "next/server";

export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, headers = {} } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), requestInit);
}

export function createGET(path: string, params?: Record<string, string>): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url);
}

export function createPOST(path: string, body: Record<string, unknown>): NextRequest {
  return createRequest(path, { method: "POST", body });
}

export function createPATCH(path: string, body: Record<string, unknown>): NextRequest {
  return createRequest(path, { method: "PATCH", body });
}

export function createDELETE(path: string): NextRequest {
  return createRequest(path, { method: "DELETE" });
}
