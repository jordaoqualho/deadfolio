import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
const COOKIE = "deadfolio-admin";
export function adminConfigured() {
  return (process.env.ADMIN_PASSWORD?.length ?? 0) >= 16;
}
function sign(value: string) {
  return createHmac("sha256", process.env.ADMIN_PASSWORD!)
    .update(value)
    .digest("hex");
}
export function constantEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function isAdmin() {
  if (!adminConfigured()) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const [expiry, signature, ...rest] = token.split(".");
  return (
    rest.length === 0 &&
    /^\d+$/.test(expiry) &&
    Number(expiry) > Date.now() &&
    Number(expiry) <= Date.now() + 8 * 3600000 &&
    constantEqual(signature || "", sign(expiry))
  );
}
export async function requireAdmin() {
  if (!(await isAdmin()))
    throw new Error("Your admin session has expired. Sign in again.");
}
export async function setAdminSession() {
  const expiry = String(Date.now() + 8 * 3600000);
  (await cookies()).set(COOKIE, `${expiry}.${sign(expiry)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function clearAdminSession() {
  (await cookies()).delete(COOKIE);
}
const windows = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit: number, period = 3600000) {
  const now = Date.now();
  for (const [key, value] of windows)
    if (value.until <= now) windows.delete(key);
  const entry = windows.get(key);
  if (entry) {
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }
  if (windows.size >= 10000) return false;
  windows.set(key, { count: 1, until: now + period });
  return true;
}
export async function clientKey() {
  const h = await headers();
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "local"
  );
}
export async function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return (
    origin === new URL(request.url).origin ||
    origin === process.env.NEXT_PUBLIC_APP_URL
  );
}
