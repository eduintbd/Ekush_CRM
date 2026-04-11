"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

export function AdminLogoutButton({ userName }: { userName?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
      {userName && (
        <span className="text-[12px] text-text-body hidden lg:inline">
          <span className="text-text-muted">Signed in as</span>{" "}
          <span className="font-medium text-text-dark">{userName}</span>
        </span>
      )}
      <button
        onClick={handleLogout}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-ekush-orange/10 text-ekush-orange rounded-md hover:bg-ekush-orange hover:text-white transition-colors"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        Log Out
      </button>
    </div>
  );
}
