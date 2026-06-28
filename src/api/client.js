// ---------------------------------------------------------------------------
// Low-level HTTP client for the collab-engine REST API.
//   - attaches the bearer access token
//   - parses the engine's { error, message } envelope into ApiError
//   - transparently refreshes the access token on 401 and retries once
// Token storage is injected by the auth layer so this module stays stateless.
// ---------------------------------------------------------------------------

const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
  get isAuth() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
}

let store = {
  getAccess: () => null,
  getRefresh: () => null,
  setTokens: () => {},
  clear: () => {},
};
export function configureTokenStore(s) {
  store = s;
}

let refreshing = null;
async function refreshTokens() {
  const refresh_token = store.getRefresh();
  if (!refresh_token) throw new ApiError(401, "no_session", "Your session has ended.");
  let res;
  try {
    res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
  } catch {
    throw new ApiError(0, "network_error", "Couldn't reach the server to refresh your session.");
  }
  if (!res.ok) {
    store.clear();
    throw new ApiError(401, "session_expired", "Your session expired. Please sign in again.");
  }
  const data = await res.json();
  store.setTokens(data);
  return data.access_token;
}

async function toError(res) {
  let code = `http_${res.status}`;
  let message = res.statusText || "Request failed";
  try {
    const body = await res.json();
    if (body.error) code = body.error;
    if (body.message) message = body.message;
  } catch {
    /* non-JSON */
  }
  return new ApiError(res.status, code, message);
}

async function request(method, path, { body, raw, retry = true, timeoutMs } = {}) {
  const headers = {};
  const access = store.getAccess();
  if (access) headers["authorization"] = `Bearer ${access}`;

  const init = { method, headers };
  if (raw) {
    init.body = raw;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  // Guard every request with a timeout so a hung connection (e.g. backend
  // unreachable, or a dev proxy holding the socket open) can never leave the
  // app spinning forever. Uploads and other large operations get a longer
  // window; everything else uses a short default.
  const limit = timeoutMs ?? (raw ? 120_000 : 20_000);
  const controller = new AbortController();
  init.signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), limit);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === "AbortError") {
      throw new ApiError(
        0,
        "timeout",
        "The server took too long to respond. Check that the backend is running and reachable."
      );
    }
    // fetch() throws a TypeError ("Failed to fetch") for network-level
    // failures: server unreachable, CORS, connection reset, or a reverse proxy
    // rejecting the request body (e.g. an upload exceeding a proxy's size
    // limit). Surface something actionable instead of the opaque browser text.
    throw new ApiError(
      0,
      "network_error",
      "Couldn't reach the server. Check that the backend is running and, for large uploads, that any proxy in front of it allows the request size."
    );
  }
  clearTimeout(timer);

  if (res.status === 401 && retry && store.getRefresh()) {
    try {
      refreshing = refreshing || refreshTokens();
      await refreshing;
    } finally {
      refreshing = null;
    }
    return request(method, path, { body, raw, retry: false, timeoutMs });
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res;
}

// Fetch a protected binary resource (e.g. a file/image) WITH the auth header
// and 401-refresh-retry, returning a Blob. Needed because an <img src> or a
// plain link can't carry the Authorization header, so the raw endpoint URL
// would 401. Callers turn the Blob into an object URL for display/download.
async function requestBlob(path, { retry = true } = {}) {
  const headers = {};
  const access = store.getAccess();
  if (access) headers["authorization"] = `Bearer ${access}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    throw new ApiError(0, "network_error", "Couldn't load the file.");
  }
  clearTimeout(timer);

  if (res.status === 401 && retry && store.getRefresh()) {
    try {
      refreshing = refreshing || refreshTokens();
      await refreshing;
    } finally {
      refreshing = null;
    }
    return requestBlob(path, { retry: false });
  }
  if (!res.ok) throw await toError(res);
  return res.blob();
}

export const http = {
  get: (p, opts) => request("GET", p, opts),
  post: (p, body) => request("POST", p, { body }),
  patch: (p, body) => request("PATCH", p, { body }),
  put: (p, body) => request("PUT", p, { body }),
  del: (p) => request("DELETE", p),
  form: (p, fd) => request("POST", p, { raw: fd }),
  blob: (p) => requestBlob(p),
};
