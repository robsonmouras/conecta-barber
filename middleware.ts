import { getIronSession } from "iron-session";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? "zaply-secret-min-32-chars!!",
  cookieName: "zaply_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax" as const,
  },
};

const ROTAS_PUBLICAS = ["/login"];
const ROTAS_ADMIN = ["/relatorios", "/barbeiros", "/servicos"];

export async function middleware(
  request: NextRequest,
  _event: NextFetchEvent,
) {
  const { pathname } = request.nextUrl;

  if (ROTAS_PUBLICAS.includes(pathname)) {
    const res = NextResponse.next();
    const session = await getIronSession<{ barbeiro?: { role: string } }>(
      request,
      res,
      SESSION_OPTIONS,
    );
    if (session.barbeiro && pathname === "/login") {
      return NextResponse.redirect(new URL("/agenda", request.url));
    }
    return res;
  }

  if (pathname.startsWith("/api/")) {
    const apiPath = pathname.replace("/api/", "");
    if (
      apiPath.startsWith("auth/login") ||
      apiPath.startsWith("auth/logout") ||
      apiPath.startsWith("webhook/") ||
      apiPath.startsWith("whatsapp/")
    ) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<{ barbeiro?: { role: string } }>(
    request,
    res,
    SESSION_OPTIONS,
  );

  if (!session.barbeiro) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (ROTAS_ADMIN.some((r) => pathname.startsWith(r)) && session.barbeiro.role !== "admin") {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  return res;
}

export const config = {
  matcher: ["/", "/login", "/agenda", "/agenda/:path*", "/relatorios", "/relatorios/:path*", "/barbeiros", "/barbeiros/:path*", "/servicos", "/servicos/:path*"],
};
