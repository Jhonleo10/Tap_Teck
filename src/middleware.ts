import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
/** Mobile app / external APIs — must not require admin session */
const publicApiRoutes = ["/api/catalog", "/api/providers/verify/resubmit", "/api/plans"];

/** Auth.js session cookie names (v5) */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function clearSessionCookies(response: NextResponse, req: Request) {
  const secure = req.url.startsWith("https://");
  for (const name of SESSION_COOKIES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Secure-") ? secure : false,
    });
  }
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  const isPublicApiRoute = publicApiRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Root — send to dashboard or login on the same host/port
  if (nextUrl.pathname === "/") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/dashboard" : "/login", nextUrl)
    );
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", nextUrl);
    const callback = nextUrl.pathname + nextUrl.search;
    if (callback && callback !== "/") {
      loginUrl.searchParams.set("callbackUrl", callback);
    }
    const response = NextResponse.redirect(loginUrl);
    // Stale/invalid JWT cookie — clear so the next login starts fresh
    if (!req.auth && req.cookies.get("authjs.session-token")) {
      clearSessionCookies(response, req);
    }
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
