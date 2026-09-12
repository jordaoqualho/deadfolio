import "server-only";
import { headers } from "next/headers";

const windows = new Map<string, { count: number; until: number }>();
/** In-process fixed-window limiter; enough for one instance, reset on deploy. */
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
