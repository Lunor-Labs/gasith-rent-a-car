import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Auth is handled client-side through Supabase in AuthProvider/AdminLayout.
  // A server cookie guard here causes false redirects because no auth-token
  // cookie is issued by the current login flow.
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
