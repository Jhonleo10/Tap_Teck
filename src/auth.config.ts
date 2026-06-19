import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,       // 24 hours — auto-logout after 24h
    updateAge: 24 * 60 * 60,    // Don't silently extend; refresh only on first load
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
    async jwt({ token, user }) {
      if (user) {
        // First sign-in: stamp the login time
        token.id = user.id!;
        token.role = user.role;
        token.loginAt = Date.now();
      }

      // Hard 24-hour expiry — force logout regardless of activity
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (token.loginAt && Date.now() - (token.loginAt as number) > TWENTY_FOUR_HOURS) {
        return null; // Returning null invalidates the session
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER" | "PROVIDER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
