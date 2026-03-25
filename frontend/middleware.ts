import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/news", "/ipo", "/screener","/"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token");

  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.includes(pathname);

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/watchlist",
    "/portfolio",
    "/dashboard",
    "/company/:path*",
    "/company/formula",
  ],
};