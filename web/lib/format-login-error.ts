type FormatLoginErrorOptions = {
  redirectTo?: string;
  code?: string;
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
    const redirectTo = options?.redirectTo;
    const code = options?.code;
    return [
      "ログインメールの送信に失敗しました（Supabase 側の設定を確認してください）。",
      "",
      "【まず試すこと】",
      "Authentication → Email Templates → Magic Link を下記に差し替え → Save",
      "",
      "件名:",
      "ログインリンク",
      "",
      "本文:",
      '<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">ログインする</a>',
      "",
      "※ まだ失敗する場合は本文を一時的に次だけにして送信テスト:",
      '<a href="{{ .ConfirmationURL }}">ログインする</a>',
      "",
      "【その他の確認】",
      "① Providers → Email が ON",
      "② URL Configuration に Redirect URLs 登録済み",
      redirectTo ? `③ 使用中 callback URL:\n${redirectTo}` : "",
      "④ 同じメールへの連続送信（数分待つ）",
      "⑤ Logs → Auth で template / smtp のエラー確認",
      code ? `\nSupabase code: ${code}` : "",
    ]
      .filter(Boolean)
      .join("\n");
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
