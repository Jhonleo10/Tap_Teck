import type { NextAuthConfig } from "next-auth";

const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "development" ? "tapteck-dev-auth-secret" : undefined);

export const authConfig = {
  secret: authSecret,
  /** Required for Vercel, LAN IPs, and any dev port — do not hardcode AUTH_URL locally */
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
      const isPublicRoute = publicRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      );
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isApiAuth) return true;
      if (isPublicRoute) return true;
      if (isLoggedIn) return true;
      return false;
    },
    async redirect({ url, baseUrl }) {
      // Same-origin only — works on any port/host (localhost, LAN, Vercel)
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return url;
      } catch {
        // fall through
      }
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.loginAt = Date.now();
      }

      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (token.loginAt && Date.now() - (token.loginAt as number) > TWENTY_FOUR_HOURS) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token?.id) return session;
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER" | "PROVIDER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
