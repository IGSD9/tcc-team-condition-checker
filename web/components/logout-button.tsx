"use client";

const primaryButtonClass =
  "rounded-xl border border-[#1e4555] bg-[#1f4c60] px-5 py-2.5 text-sm font-medium text-white shadow-[0_3px_8px_rgba(31,76,96,0.28)] transition hover:bg-[#163b4a] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "rounded-xl border border-[#304d5a] bg-white px-5 py-2.5 text-sm font-medium text-[#173b4a] shadow-[0_2px_6px_rgba(31,76,96,0.14)] transition hover:bg-[#f7fbfb] disabled:cursor-not-allowed disabled:opacity-60";

type LogoutButtonProps = {
  variant?: "primary" | "secondary";
  className?: string;
};

export function LogoutButton({
  variant = "secondary",
  className = "",
}: LogoutButtonProps) {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  const baseClass = variant === "primary" ? primaryButtonClass : secondaryButtonClass;

  return (
    <button type="button" onClick={() => void handleLogout()} className={`${baseClass} ${className}`.trim()}>
      ログアウト
    </button>
  );
}
