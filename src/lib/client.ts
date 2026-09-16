"use client";

import type { ApiResult } from "./types";

/** An error carrying a message that is already safe to show the user. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const OFFLINE_MESSAGE =
  "You appear to be offline. Nothing was lost — try again once you reconnect.";

/**
 * The single fetch wrapper.
 *
 * Every failure mode collapses into one readable sentence: a dropped
 * connection, an HTML error page from a proxy, a 500, or a validation
 * message from our own API all arrive at the UI as `error.message`.
 */
export async function api<T extends object>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

  let payload: ApiResult<T> | null = null;
  try {
    payload = (await response.json()) as ApiResult<T>;
  } catch {
    // Not JSON — a proxy error page, or an empty body.
  }

  if (!response.ok || !payload || payload.ok === false) {
    const message =
      payload && payload.ok === false
        ? payload.error
        : response.status === 401
          ? "Your session has ended. Sign in to continue."
          : "Something went wrong. Your progress is safe — try again.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
