import { Suspense } from "react";
import { AuthCallbackClient } from "@/components/auth-callback-client";

function CallbackFallback() {
  return (
    <main className="home-screen-bg flex min-h-screen items-center justify-center p-6">
      <p className="rounded-2xl border border-[#d9dfde] bg-white/90 px-6 py-4 text-sm text-[#173b4a]">
        ログイン処理中...
      </p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
