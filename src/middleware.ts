import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { STAFF_ROLES } from "@/lib/roles";

// Paths the matcher gates — kept in one place so the realm checks
// below stay in sync with what the matcher actually intercepts.
const INVESTOR_ONLY_PATHS = [
  "/dashboard",
  "/portfolio",
  "/transactions",
  "/statements",
  "/profile",
  "/support",
  "/documents",
  "/learn",
  "/notifications",
  "/sip",
];

function pathMatchesAny(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = (meta.role as string) ?? "";
  const tier = ((meta.tier as string) ?? "INVESTOR").toUpperCase();
  const isProspect = tier === "PROSPECT";
  const isStaff = STAFF_ROLES.includes(role);

  // Admin: only staff. Investors and prospects bounce to their own
  // dashboards rather than /login (already authenticated).
  if (path.startsWith("/admin")) {
    if (isStaff) return supabaseResponse;
    const dest = isProspect ? "/prospect/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Prospect-tier user attempting an investor-only route → bounce to
  // the prospect dashboard. Prevents stale bookmarks from showing
  // empty / 500-prone investor pages.
  if (isProspect && pathMatchesAny(path, INVESTOR_ONLY_PATHS)) {
    return NextResponse.redirect(new URL("/prospect/dashboard", request.url));
  }

  // Investor-tier (or staff) user attempting /prospect/* → bounce them
  // to the relevant dashboard. Staff still need /admin paths so we
  // route them there.
  if (!isProspect && path.startsWith("/prospect")) {
    const dest = isStaff ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portfolio/:path*",
    "/transactions/:path*",
    "/statements/:path*",
    "/profile/:path*",
    "/support/:path*",
    "/documents/:path*",
    "/learn/:path*",
    "/notifications/:path*",
    "/sip/:path*",
    "/admin/:path*",
    "/prospect/:path*",
  ],
};
