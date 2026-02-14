import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.barbeiro) {
      return NextResponse.json({ barbeiro: null }, { status: 200 });
    }
    return NextResponse.json({
      barbeiro: session.barbeiro,
    });
  } catch {
    return NextResponse.json({ barbeiro: null }, { status: 200 });
  }
}
