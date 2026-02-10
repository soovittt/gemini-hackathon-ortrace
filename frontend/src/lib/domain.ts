/**
 * Host-based separation: ortrace.com = landing only, app.ortrace.com = full app.
 * Configure via env: VITE_APP_ORIGIN, VITE_LANDING_HOSTS (comma-separated).
 * In production we never use localhost for redirects or links.
 */

const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN || "";
const LANDING_HOSTS_STR = import.meta.env.VITE_LANDING_HOSTS || "";
const LANDING_HOSTS = LANDING_HOSTS_STR
  ? LANDING_HOSTS_STR.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)
  : [];

export function isLandingDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return LANDING_HOSTS.length > 0 && LANDING_HOSTS.includes(host);
}

/** True when current origin looks like localhost (dev). */
function isLocalhostOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const o = window.location.origin.toLowerCase();
  return o.startsWith("http://localhost") || o.startsWith("http://127.0.0.1");
}

/**
 * Base URL for the app. In production build we never return localhost:
 * use VITE_APP_ORIGIN so redirects/links always point to the real app (e.g. app.ortrace.com).
 */
export function getAppOrigin(): string {
  if (typeof window === "undefined") return APP_ORIGIN || "";
  if (isLandingDomain() && APP_ORIGIN) return APP_ORIGIN.replace(/\/$/, "");
  // In prod build, never use localhost so we never redirect or link to localhost
  if (import.meta.env.PROD && isLocalhostOrigin() && APP_ORIGIN) return APP_ORIGIN.replace(/\/$/, "");
  return window.location.origin;
}

/** Full URL to an app path (e.g. /auth, /overview). Use when on landing domain to send users to app subdomain. */
export function appUrl(path: string): string {
  const base = getAppOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** OAuth callback URL for Google sign-in. In prod never localhost (uses getAppOrigin). */
export function getOAuthCallbackUrl(): string {
  const base = getAppOrigin();
  return base ? `${base.replace(/\/$/, "")}/auth/callback` : "";
}
