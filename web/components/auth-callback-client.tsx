"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

async function persistSession(accessToken: string, refreshToken: string) {
  const setSessionResponse = await fetch("/api/auth/set-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken,
      refreshToken,
    }),
  });

  if (!setSessionResponse.ok) {
    throw new Error("セッションの保存に失敗しました。");
  }

  const syncResponse = await fetch("/api/auth/sync-user", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!syncResponse.ok) {
    const body = (await syncResponse.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "ユーザー同期に失敗しました。");
  }
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message] = useState("ログイン処理中...");

  useEffect(() => {
    let cancelled = false;

    const finishWithError = (rawError: string) => {
      if (cancelled) return;
      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("error", encodeURIComponent(rawError));
      router.replace(loginUrl.pathname + loginUrl.search);
    };

    const finishWithSuccess = (nextPath: string) => {
      if (cancelled) return;
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    };

    const run = async () => {
      const nextPath = searchParams.get("next") ?? "/";
      const supabase = createBrowserSupabaseClient();

      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash,
      );
      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");

      if (hashAccessToken && hashRefreshToken) {
        try {
          await persistSession(hashAccessToken, hashRefreshToken);
          finishWithSuccess(nextPath);
        } catch (caughtError) {
          finishWithError(
            caughtError instanceof Error
              ? caughtError.message
              : "ログインに失敗しました。",
          );
        }
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (tokenHash && type) {
        const otpTypes: EmailOtpType[] = [
          type as EmailOtpType,
          "email",
          "magiclink",
        ];
        const uniqueTypes = [...new Set(otpTypes)];

        for (const otpType of uniqueTypes) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (!error && data.session) {
            try {
              await persistSession(
                data.session.access_token,
                data.session.refresh_token,
              );
              finishWithSuccess(nextPath);
            } catch (caughtError) {
              finishWithError(
                caughtError instanceof Error
                  ? caughtError.message
                  : "ログインに失敗しました。",
              );
            }
            return;
          }
        }

        finishWithError("ログインリンクが無効または期限切れです。再度送信してください。");
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          finishWithError(
            error?.message.includes("PKCE code verifier")
              ? "pkce_link"
              : (error?.message ?? "ログインに失敗しました。"),
          );
          return;
        }

        try {
          await persistSession(
            data.session.access_token,
            data.session.refresh_token,
          );
          finishWithSuccess(nextPath);
        } catch (caughtError) {
          finishWithError(
            caughtError instanceof Error
              ? caughtError.message
              : "ログインに失敗しました。",
          );
        }
        return;
      }

      finishWithError("認証情報が見つかりませんでした。");
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="home-screen-bg flex min-h-screen items-center justify-center p-6">
      <p className="rounded-2xl border border-[#d9dfde] bg-white/90 px-6 py-4 text-sm text-[#173b4a]">
        {message}
      </p>
    </main>
  );
}
