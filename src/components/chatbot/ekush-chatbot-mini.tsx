"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface QuickReply {
  label: string;
  reply: {
    text: string;
    actionLabel?: string;
    href?: string;
  };
}

const QUICK_REPLIES: QuickReply[] = [
  {
    label: "Check today's NAV",
    reply: {
      text: "NAV is published every Thursday and is in effect Sunday–Wednesday.",
      actionLabel: "View latest NAV",
      href: "/statements",
    },
  },
  {
    label: "How to buy units?",
    reply: {
      text: "Pick a fund and enter the amount. Minimum BDT 5,000 lump sum, no entry fees.",
      actionLabel: "Buy Units",
      href: "/transactions/buy",
    },
  },
  {
    label: "Tax rebate info",
    reply: {
      text: "Invest up to BDT 5 lakh in Ekush Managed Funds to claim up to BDT 75,000 in income-tax rebate this fiscal year.",
      actionLabel: "Start investing",
      href: "/transactions/buy",
    },
  },
  {
    label: "Talk to an agent",
    reply: {
      text: "Call +8801713086101 or email info@ekushwml.com (Sun–Thu, 10am–6pm).",
    },
  },
];

interface EkushChatbotMiniProps {
  userName?: string;
}

interface Message {
  id: string;
  from: "bot" | "user";
  text: string;
  actionLabel?: string;
  href?: string;
}

export function EkushChatbotMini({ userName }: EkushChatbotMiniProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Greeting uses logged-in user's name; no upfront name prompt.
  const greeting = `Assalamu alaikum${userName ? `, ${userName.split(" ")[0]}` : ""}! I'm Ahona. How can I help you today?`;

  // Single-widget-at-a-time coordination: close ourselves if another widget opens.
  useEffect(() => {
    const onWidgetOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ source: string }>).detail;
      if (detail?.source && detail.source !== "chat") setOpen(false);
    };
    window.addEventListener("widget:open", onWidgetOpen);
    return () => window.removeEventListener("widget:open", onWidgetOpen);
  }, []);

  // Escape closes the expanded chat.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Seed the greeting the first time the chat opens.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: "greet", from: "bot", text: greeting }]);
    }
  }, [open, messages.length, greeting]);

  // Keep the scroll pinned to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent("widget:open", { detail: { source: "chat" } }));
    setOpen(true);
  };

  const handleQuickReply = (qr: QuickReply) => {
    const id = String(Date.now());
    setMessages((prev) => [
      ...prev,
      { id: `${id}-u`, from: "user", text: qr.label },
      {
        id: `${id}-b`,
        from: "bot",
        text: qr.reply.text,
        actionLabel: qr.reply.actionLabel,
        href: qr.reply.href,
      },
    ]);
  };

  // Collapsed pill state — bottom-right, non-intrusive.
  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open Ahona chat"
        className="fixed right-6 bottom-6 z-50 flex items-center gap-3 bg-navy hover:bg-navy-dark transition-colors rounded-full pl-1 pr-5 py-1 shadow-[0_4px_14px_rgba(15,30,61,0.25)]"
      >
        <span className="block w-14 h-14 rounded-full overflow-hidden border-2 border-white shrink-0">
          <img src="/ahona.png" alt="" className="w-full h-full object-cover" />
        </span>
        <span className="text-white text-[14px] font-medium">Need help?</span>
      </button>
    );
  }

  // Expanded chat window.
  return (
    <div
      role="dialog"
      aria-label="Chat with Ahona"
      className="fixed right-6 bottom-6 z-50 w-[360px] h-[480px] bg-white rounded-2xl border border-gray-200 shadow-[0_8px_32px_rgba(15,30,61,0.18)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-navy">
        <span className="block w-9 h-9 rounded-full overflow-hidden border border-white/30 shrink-0">
          <img src="/ahona.png" alt="" className="w-full h-full object-cover" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-semibold leading-tight">Ahona</p>
          <p className="text-white/60 text-[11px] leading-tight">Ekush WML assistant</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                m.from === "user"
                  ? "max-w-[80%] bg-navy text-white text-[13px] px-3 py-2 rounded-2xl rounded-br-sm"
                  : "max-w-[85%] bg-white text-text-dark text-[13px] px-3 py-2 rounded-2xl rounded-bl-sm border border-gray-100"
              }
            >
              <p className="leading-snug">{m.text}</p>
              {m.from === "bot" && m.actionLabel && m.href && (
                <Link
                  href={m.href}
                  onClick={() => setOpen(false)}
                  className="inline-block mt-2 text-[12px] font-semibold text-ekush-orange hover:underline"
                >
                  {m.actionLabel} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick reply chips */}
      <div className="px-3 py-3 border-t border-gray-100 bg-white">
        <div className="flex flex-wrap gap-2">
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr.label}
              type="button"
              onClick={() => handleQuickReply(qr)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full border border-navy/20 text-navy hover:bg-navy hover:text-white transition-colors"
            >
              {qr.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
