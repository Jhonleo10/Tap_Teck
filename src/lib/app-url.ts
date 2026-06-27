/**
 * Server-side base URL for emails/links.
 * Prefer explicit env in production; locally, trustHost handles auth redirects.
 */
export function getAppBaseUrl(): string {
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`.replace(/\/$/, "");
}
