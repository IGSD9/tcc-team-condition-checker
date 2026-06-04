export function formatLoginErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many requests") || message.includes("送信回数が多すぎます")) {
    return "送信回数が多すぎます。数分待ってから再度お試しください。";
  }

  if (lower.includes("smtp")) {
    return "ログインメールの送信に失敗しました（SMTP 設定を確認してください）。";
  }

  return message;
}
