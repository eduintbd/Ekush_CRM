"use client";

import { useRouter } from "next/navigation";

export function ProspectLogoutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/prospects/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}
