import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/admin", "/user"];
const authRoutes = ["/login", "/register"];

// Rutas de API que requieren sesión activa
const protectedApiRoutes = ["/api/user", "/api/admin"];

// Rate limit simple en memoria para forgot-password (por IP)
const forgotPasswordAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;        // máximo 5 intentos
const RATE_LIMIT_WINDOW = 60_000; // por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = forgotPasswordAttempts.get(ip);

  if (!record || now > record.resetAt) {
    forgotPasswordAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true; // permite
  }

  if (record.count >= RATE_LIMIT_MAX) return false; // bloquea

  record.count++;
  return true; // permite
}

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isProtectedApi = protectedApiRoutes.some((route) => pathname.startsWith(route));

  // ✅ Rate limit en forgot-password
  if (pathname.startsWith("/forgot-password") && request.method === "POST") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Demasiados intentos. Espera un momento." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ✅ Rutas de API protegidas sin sesión
  if (isProtectedApi && !user) {
    return new NextResponse(
      JSON.stringify({ error: "No autorizado." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Sin sesión en ruta protegida → login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "Debes iniciar sesión para continuar.");
    return NextResponse.redirect(url);
  }

  if (!user) return supabaseResponse;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  // Usuario autenticado en ruta de auth → redirigir a su dashboard
  if (isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin/dashboard" : "/user/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ✅ Usuario sin rol admin intentando acceder a /admin → bloqueado
  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/user/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ✅ Admin intentando acceder a /user → redirigir a su panel
  if (pathname.startsWith("/user") && role === "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}