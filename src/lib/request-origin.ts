const INTERNAL_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost"]);

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

function originFromRedirectUri() {
  const redirectUri = process.env.KAKAO_REDIRECT_URI?.trim();
  if (!redirectUri) {
    return null;
  }

  try {
    return normalizeOrigin(new URL(redirectUri).origin);
  } catch {
    return null;
  }
}

/**
 * Origin Toss should send the buyer back to.
 * Local `next dev` keeps `APP_URL` on the public site, but the pending order exists only on this process.
 */
export function getTossReturnOrigin(request: Request): string {
  const host = request.headers.get("host")?.split(",")[0]?.trim() ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (INTERNAL_HOSTS.has(hostname)) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
    return normalizeOrigin(`${proto}://${host}`);
  }
  return getRequestOrigin(request);
}

/** Public site origin for redirects behind reverse proxy (Caddy/nginx). */
export function getRequestOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const hostname = forwardedHost.split(":")[0]?.toLowerCase() ?? "";
    if (!INTERNAL_HOSTS.has(hostname)) {
      const proto = forwardedProto ?? "https";
      return normalizeOrigin(`${proto}://${forwardedHost}`);
    }
  }

  const requestOrigin = normalizeOrigin(new URL(request.url).origin);
  const hostname = new URL(requestOrigin).hostname.toLowerCase();
  if (!INTERNAL_HOSTS.has(hostname)) {
    return requestOrigin;
  }

  const fromRedirect = originFromRedirectUri();
  if (fromRedirect) {
    return fromRedirect;
  }

  return requestOrigin;
}
