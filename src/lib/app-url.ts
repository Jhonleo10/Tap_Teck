/** App base URL — always use AUTH_URL when set (must match dev server port). */
export function getAppBaseUrl(): string {
  const url =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  return url.replace(/\/$/, "");
}
