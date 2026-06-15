/** App base URL — always use AUTH_URL when set (must match dev server port). */
export function getAppBaseUrl(): string {
  const url =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  return url.replace(/\/$/, "");
}
