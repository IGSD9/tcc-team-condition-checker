"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
      const token = searchParams.get("token")?.trim() ?? "";

      if (!token) {
        finishWithError("認証情報が見つかりませんでした。");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          finishWithError(body?.error ?? "ログインに失敗しました。");
          return;
        }

        finishWithSuccess(nextPath);
      } catch {
        finishWithError("ログインに失敗しました。時間をおいて再試行してください。");
      }
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
