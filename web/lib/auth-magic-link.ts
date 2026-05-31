import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function resolveRequestOrigin(request: Request): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      return `${forwardedProto}://${host}`;
    }
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function resolveAuthCallbackUrl(request: Request): string {
  const requestOrigin = resolveRequestOrigin(request);
  if (requestOrigin) {
    return `${requestOrigin}/auth/callback`;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configuredSiteUrl) {
    return `${configuredSiteUrl}/auth/callback`;
  }

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) {
    return `https://${vercelUrl}/auth/callback`;
  }

  throw new Error("Could not resolve auth callback URL");
}

export async function sendMagicLinkEmail(email: string, redirectTo: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
}
