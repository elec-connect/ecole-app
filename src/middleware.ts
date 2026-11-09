import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('session')?.value;

  const routesProtegees = ['/admin', '/prof', '/etudiant'];
  const estProtegee = routesProtegees.some((p) => pathname.startsWith(p));

  if (estProtegee && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/prof/:path*', '/etudiant/:path*'],
};