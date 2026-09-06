import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow all dashboard, GIS, and admin operations for seamless hackathon presentation
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
