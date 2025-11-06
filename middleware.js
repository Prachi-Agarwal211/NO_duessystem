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

  // Define protected routes and their required roles
  const protectedRoutes = {
    '/admin': ['admin'],
    '/admin/dashboard': ['admin'],
    '/admin/request': ['admin'],
    '/staff/dashboard': ['department', 'registrar', 'admin'],
    '/staff/student': ['department', 'registrar', 'admin'],
    // Add more protected routes as needed
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
    // If not authenticated, redirect to login
    if (!user) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', currentPath);
      return NextResponse.redirect(redirectUrl);
    }

    // Check user role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile || !requiredRoles.includes(profile.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password'];
  if (authPages.some(page => currentPath.startsWith(page)) && user) {
    // Get user role to redirect appropriately
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    let redirectPath = '/';
    
    if (!error && profile) {
      if (profile.role === 'student') {
        redirectPath = '/no-dues-form';
      } else if (profile.role === 'department' || profile.role === 'registrar') {
        redirectPath = '/staff/dashboard';
      } else if (profile.role === 'admin') {
        redirectPath = '/admin';
      }
    }
    
    return NextResponse.redirect(new URL(redirectPath, request.url));
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