import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type BarbeiroRole = "admin" | "colaborador";

export interface SessionBarbeiro {
  barbeiroId: string;
  barbeiroNome: string;
  role: BarbeiroRole;
}

export interface SessionData {
  barbeiro?: SessionBarbeiro;
}

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? "zaply-secret-min-32-chars!!",
  cookieName: "zaply_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function requireAuth(): Promise<SessionBarbeiro> {
  const session = await getSession();
  if (!session.barbeiro) {
    throw new Error("UNAUTHORIZED");
  }
  return session.barbeiro;
}

export async function requireAdmin(): Promise<SessionBarbeiro> {
  const barbeiro = await requireAuth();
  if (barbeiro.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return barbeiro;
}
