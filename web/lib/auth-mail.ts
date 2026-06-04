import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !from) {
    throw new Error("SMTP_HOST と SMTP_FROM を設定してください。");
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    }),
  };
}

export async function sendMagicLinkEmail(email: string, loginUrl: string) {
  const { from, transport } = getSmtpConfig();

  await transport.sendMail({
    from,
    to: email,
    subject: "ログインリンク",
    text: [
      "チーム・コンディション・チェッカーへのログインリンクです。",
      "",
      loginUrl,
      "",
      "このリンクは15分間有効です。心当たりがない場合は無視してください。",
    ].join("\n"),
    html: [
      "<h2>ログイン</h2>",
      "<p>以下のリンクからログインしてください（15分間有効）。</p>",
      `<p><a href="${loginUrl}">ログインする</a></p>`,
      "<p>心当たりがない場合はこのメールを無視してください。</p>",
    ].join(""),
  });
}
