function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return requireEnv("DATABASE_URL");
  },
  get authSecret() {
    if (process.env.NODE_ENV === "production") {
      return requireEnv("AUTH_SECRET");
    }
    return process.env.AUTH_SECRET ?? "tapteck-dev-auth-secret";
  },
  get authUrl() {
    return process.env.AUTH_URL;
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get gtmId() {
    return process.env.NEXT_PUBLIC_GTM_ID;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get isDevelopment() {
    return process.env.NODE_ENV === "development";
  },
} as const;
