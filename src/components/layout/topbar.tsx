"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TopBarProps {
  userName?: string;
  investorCode?: string;
  userImage?: string;
}

export function TopBar({ userName, investorCode, userImage }: TopBarProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sidebar">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Brand + Investor Info */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ekush-orange rounded-lg flex items-center justify-center font-bold text-white text-lg shrink-0">
            E
          </div>
          <div>
            <h1 className="font-bold text-[14px] text-navy font-rajdhani leading-tight">
              Welcome to Ekush Wealth Management Limited
            </h1>
            <p className="text-[12px] text-text-dark mt-0.5">
              {userName || "Investor"}
              {investorCode && (
                <span className="text-text-muted ml-2">({investorCode})</span>
              )}
            </p>
          </div>
        </Link>

        {/* Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-[50px] h-[50px] rounded-full bg-page-bg border-2 border-transparent hover:border-ekush-orange transition-colors overflow-hidden flex items-center justify-center"
          >
            {userImage ? (
              <img src={userImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-text-body" />
            )}
          </button>

          {/* Dropdown */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-[60px] z-50 w-[215px] bg-navy rounded-[5px] p-6 shadow-lg">
                {/* Triangle */}
                <div className="absolute -top-[10px] right-4 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[12px] border-l-transparent border-r-transparent border-b-navy" />
                <div className="text-center mb-4">
                  <div className="w-[60px] h-[60px] rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-white text-[14px] font-medium">{userName || "Investor"}</p>
                  {investorCode && (
                    <p className="text-white/60 text-[12px]">ID: {investorCode}</p>
                  )}
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center justify-center w-full px-3 py-2 mb-2 text-[13px] text-white/80 hover:text-white rounded transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-white/80 hover:text-white rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
