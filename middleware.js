import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value, options);
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get the current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define protected routes and their required roles (Phase 1: ONLY department/admin)
  const protectedRoutes = {
    '/admin': ['admin'],
    '/admin/dashboard': ['admin'],
    '/admin/request': ['admin'],
    '/staff/dashboard': ['department', 'admin'],
    '/staff/student': ['department', 'admin'],
  };

  // Check if the current path is protected
  const currentPath = request.nextUrl.pathname;
  let isProtected = false;
  let requiredRoles = [];

  for (const [route, roles] of Object.entries(protectedRoutes)) {
    if (currentPath.startsWith(route)) {
      isProtected = true;
      requiredRoles = roles;
      break;
    }
  }

  if (isProtected) {
    // If not authenticated, redirect to staff login page
    if (!user) {
      const loginUrl = new URL('/staff/login', request.url);
      // Preserve the original URL as return path
      loginUrl.searchParams.set('returnUrl', currentPath);
      return NextResponse.redirect(loginUrl);
    }

    // Check user role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile || !requiredRoles.includes(profile.role)) {
      // Unauthorized: redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - _next (Next.js internals)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};