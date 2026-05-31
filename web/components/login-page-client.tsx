"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TeamConditionLogo } from "@/components/team-condition-logo";
import { formatLoginErrorMessage } from "@/lib/format-login-error";

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(formatLoginErrorMessage(decodeURIComponent(errorParam)));
    }
  }, [searchParams]);

  const hasEmail = email.trim().length > 0;
  const canSubmit = hasEmail && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "ログインリンクの送信に失敗しました。");
      }

      setMessage(
        "ログインリンクを送信しました。メール内のリンクをタップしてログインしてください。",
      );
    } catch (caughtError) {
      const fallback = "ログインリンクの送信に失敗しました。時間をおいて再試行してください。";
      const raw =
        caughtError instanceof Error ? caughtError.message : fallback;
      setError(formatLoginErrorMessage(raw));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="home-screen-bg flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-[#d9dfde] bg-white/90 px-8 py-10 shadow-[0_20px_40px_rgba(10,43,56,0.12)] backdrop-blur-sm">
        <div className="text-center">
          <TeamConditionLogo className="mx-auto mb-3 h-14 w-auto" />
          <h1 className="text-2xl font-semibold tracking-tight text-[#173b4a]">
            ログイン
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            メールアドレスを入力すると、ログインリンクを送信します。ログアウトするまでログイン状態を維持します。
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-[#e8eeed] bg-[#f7fbfb] px-4 py-3 text-[#173b4a] placeholder:text-zinc-400 outline-none transition focus:border-[#1f4c60] focus:bg-white focus:ring-2 focus:ring-[#1f4c60]/20"
            placeholder="✉️ メールアドレス入力"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-medium transition ${
              canSubmit
                ? "border border-[#1e4555] bg-[#1f4c60] text-white shadow-[0_3px_8px_rgba(31,76,96,0.28)] hover:bg-[#163b4a]"
                : "cursor-not-allowed border border-transparent bg-zinc-200 text-white"
            }`}
          >
            {isSubmitting ? "送信中..." : "ログインリンクを送信 ›"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl border border-[#b8d4c8] bg-[#f0f7f3] px-3 py-2 text-sm text-[#2d5a45]">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-[#e8c4c4] bg-[#fdf5f5] px-3 py-2 text-sm leading-relaxed text-[#8b3a3a]">
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-xs leading-relaxed text-zinc-500">
          スマホでリンクが開けない場合: リンクを長押し →「Safariで開く」または「Chromeで開く」を選んでください。別のアカウントに切り替える場合は、先にログアウトしてください。
        </p>

        <div className="mt-8 text-center">
          <Link
            className="text-sm font-medium text-[#1f4c60] underline-offset-2 transition hover:text-[#163b4a] hover:underline"
            href="/"
          >
            トップへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
