import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  attachAccessTokenHeader,
  resolveSessionFromRequest,
} from "@/lib/auth-session";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  );
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";

  const resolved = await resolveSessionFromRequest(request);
  if (resolved) {
    accessToken = resolved.accessToken;
  } else if (accessToken) {
    accessToken = "";
  }

  const buildResponse = (response: NextResponse) => response;

  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    if (!accessToken) {
      return buildResponse(NextResponse.next());
    }

    const requestHeaders = attachAccessTokenHeader(request, accessToken);
    return buildResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  if (!accessToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return buildResponse(NextResponse.redirect(url));
  }

  const requestHeaders = attachAccessTokenHeader(request, accessToken);

  if (pathname.startsWith("/admin")) {
    const roleUrl = new URL("/api/auth/role", request.url);
    const roleRes = await fetch(roleUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!roleRes.ok) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return buildResponse(NextResponse.redirect(url));
    }

    const data = (await roleRes.json().catch(() => null)) as
      | { role?: string }
      | null;
    if (data?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return buildResponse(NextResponse.redirect(url));
    }
  }

  return buildResponse(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/checkin/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/",
  ],
};
