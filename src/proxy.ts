import { NextRequest, NextResponse } from "next/server";
import {
  detectLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localePrefixPath,
  readLocaleCookie,
} from "@/lib/i18n/detect";
import type { Locale } from "@/lib/i18n/dictionaries";

function withLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPtPath = /^\/pt(?:\/|$)/.test(pathname);
  const isPrivatePath = /^\/api(\/|$)/.test(
    pathname.replace(/^\/pt/, "") || "/",
  );
  const savedLocale = readLocaleCookie(
    request.cookies.get(LOCALE_COOKIE)?.value,
  );

  if (!isPtPath && !isPrivatePath && savedLocale === "pt") {
    const url = request.nextUrl.clone();
    url.pathname = localePrefixPath(pathname, "pt");
    return withLocaleCookie(NextResponse.redirect(url), "pt");
  }

  if (
    !isPtPath &&
    !isPrivatePath &&
    !savedLocale &&
    detectLocale(request.headers.get("accept-language")) === "pt"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = localePrefixPath(pathname, "pt");
    return withLocaleCookie(NextResponse.redirect(url), "pt");
  }

  const locale: Locale = isPtPath ? "pt" : "en";
  const headers = new Headers(request.headers);
  headers.set("x-deadfolio-locale", locale);

  if (isPtPath) {
    const url = request.nextUrl.clone();
    url.pathname = url.pathname.replace(/^\/pt/, "") || "/";
    if (/^\/api(\/|$)/.test(url.pathname)) {
      return withLocaleCookie(
        NextResponse.next({ request: { headers } }),
        locale,
      );
    }
    return withLocaleCookie(
      NextResponse.rewrite(url, { request: { headers } }),
      locale,
    );
  }

  const response = NextResponse.next({ request: { headers } });
  if (!isPrivatePath && !savedLocale) {
    withLocaleCookie(response, locale);
  }
  return response;
}

export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };
