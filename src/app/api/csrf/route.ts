import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE } from "@/lib/csrf-constants";

const CSRF_MAX_AGE_SEC = 60 * 60 * 24;

export async function GET(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const existing = req.cookies.get(CSRF_COOKIE)?.value;
  const token = existing ?? randomUUID();
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CSRF_MAX_AGE_SEC,
  });
  return res;
}
