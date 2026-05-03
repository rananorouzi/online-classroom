import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = [
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/error",
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (publicRoutes.some((route) => pathname.startsWith(route)))
    return NextResponse.next();

  // Check JWT token (Edge-compatible)
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|sw.js|manifest.json|icons|sample-media|uploads|api).*)",
  ],
};
