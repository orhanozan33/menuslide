import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['en', 'tr', 'fr'];

export function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // Skip middleware for static assets, Next.js internals, API, favicon, icon, display (Görsel URL / slides)
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/icon') ||
      pathname === '/icon.svg' ||
      pathname.startsWith('/display') ||
      /\.[a-z0-9]+$/i.test(pathname) // e.g. .css, .js, .svg, .ico
    ) {
      return NextResponse.next();
    }

    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];

    if (LOCALES.includes(firstSegment)) {
      const res = NextResponse.next();
      res.cookies.set('user_locale', firstSegment, { path: '/', maxAge: 60 * 60 * 24 * 365 });
      return res;
    }

    const locale = request.cookies.get('user_locale')?.value;
    const targetLocale = locale && LOCALES.includes(locale) ? locale : 'en';
    const newUrl = new URL(`/${targetLocale}${pathname === '/' ? '' : pathname}`, request.url);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next|api|favicon|icon|.*\\..*).*)'],
};
