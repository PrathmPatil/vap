import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/news", "/ipo", "/", "/dashboard"];

function getRoleFromToken(token?: string): string {
  if (!token) return "";
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(atob(padded)) as { role?: string };
    return (payload?.role || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function hasMasterAccess(role: string) {
  return role === "master" || role === "admin";
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.includes(pathname);

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Logs / master console: admin or master only
  if (pathname === "/master" || pathname.startsWith("/master/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const role = getRoleFromToken(token);
    if (!hasMasterAccess(role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/watchlist",
    "/portfolio",
    "/dashboard",
    "/master",
    "/master/:path*",
    "/company/:path*",
    "/company/formula",
  ],
};
