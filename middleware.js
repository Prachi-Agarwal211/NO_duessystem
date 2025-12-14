import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Create response early
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Skip middleware for public routes to improve mobile performance
    const currentPath = request.nextUrl.pathname;
    const publicRoutes = ['/', '/student/check-status', '/student/submit-form', '/student/manual-entry', '/staff/login', '/unauthorized'];
    
    if (publicRoutes.includes(currentPath)) {
      return response;
    }

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

    // ⚡ OPTIMIZATION: Reduced timeout for faster failure detection
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 2000) // 2s instead of 3s
    );

    // Get the current user session with timeout
    const authPromise = supabase.auth.getUser();
    const { data: { user } } = await Promise.race([authPromise, timeoutPromise]);

    // Define protected routes and their required roles
    const protectedRoutes = {
      '/admin': ['admin'],
      '/admin/dashboard': ['admin'],
      '/admin/request': ['admin'],
      '/staff/dashboard': ['department', 'admin'],
      '/staff/student': ['department', 'admin'],
    };

    // Check if the current path is protected
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
        loginUrl.searchParams.set('returnUrl', currentPath);
        return NextResponse.redirect(loginUrl);
      }

      // ⚡ OPTIMIZATION: Check user role with reduced timeout and specific column selection
      const profilePromise = supabase
        .from('profiles')
        .select('role') // Only fetch role column, not all data
        .eq('id', user.id)
        .single();

      const { data: profile, error } = await Promise.race([
        profilePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile timeout')), 1500)) // 1.5s instead of 2s
      ]);

      if (error || !profile || !requiredRoles.includes(profile.role)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    return response;
  } catch (error) {
    // Log error but don't block the request on mobile
    console.error('Middleware error:', error.message);
    // Allow request to continue on error (fail open for public routes)
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - api (API routes)
     * - _next (Next.js internals)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.(svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};