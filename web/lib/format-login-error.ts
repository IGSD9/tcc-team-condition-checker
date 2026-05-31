type FormatLoginErrorOptions = {
  redirectTo?: string;
};

const FORMATTED_ERROR_PREFIXES = [
  "リダイレクト URL の設定が正しくありません。",
  "ログインメールの送信に失敗しました（Supabase 側の設定を確認してください）。",
  "送信回数が多すぎます。",
  "メール内リンクをアプリ内ブラウザで開いたため",
] as const;

export function formatLoginErrorMessage(
  message: string,
  options?: FormatLoginErrorOptions,
): string {
  if (FORMATTED_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }

  if (message === "pkce_link") {
    return "メール内リンクをアプリ内ブラウザで開いたためログインに失敗しました。リンクを長押しして「Safariで開く」または「Chromeで開く」を選んでください。";
  }

  if (message.includes("PKCE code verifier")) {
    return formatLoginErrorMessage("pkce_link");
  }

  const lower = message.toLowerCase();

  if (
    lower.includes("error sending magic link email") ||
    lower.includes("error sending confirmation email") ||
    lower.includes("error sending email")
  ) {
    return [
      "ログインメールの送信に失敗しました（Supabase 側の設定を確認してください）。",
      "① Authentication → Providers → Email が有効か",
      "② Email Templates → Magic Link の文面に誤りがないか（下記 DEPLOY_CHECKLIST のテンプレート例を使用）",
      "③ URL Configuration の Site URL / Redirect URLs に本番 URL があるか",
      "④ 同じメールへの連続送信制限（数分待って再試行）",
      "⑤ Supabase → Logs → Auth で詳細エラーを確認",
    ].join("\n");
  }

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "送信回数が多すぎます。数分待ってから再度お試しください。";
  }

  if (
    lower.includes("redirect") &&
    (lower.includes("url") ||
      lower.includes("not allowed") ||
      lower.includes("invalid"))
  ) {
    const redirectTo = options?.redirectTo;
    const siteUrl = redirectTo?.replace(/\/auth\/callback\/?$/, "");
    return [
      "リダイレクト URL の設定が正しくありません。",
      "Supabase → Authentication → URL Configuration で次を設定して Save してください。",
      "",
      redirectTo
        ? `Redirect URLs に追加:\n${redirectTo}`
        : "Redirect URLs に本番の /auth/callback を追加",
      siteUrl ? `\nSite URL:\n${siteUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return message;
}
