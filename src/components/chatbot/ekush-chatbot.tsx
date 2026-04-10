"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, ArrowLeft, Bot } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  from: "bot" | "user";
  text: string;
  options?: QuickOption[];
}

interface QuickOption {
  label: string;
  action: string; // internal key or route
}

/* ------------------------------------------------------------------ */
/*  Knowledge base                                                     */
/* ------------------------------------------------------------------ */

const FUND_INFO: Record<string, { name: string; short: string; color: string; benefits: string[] }> = {
  EFUF: {
    name: "Ekush First Unit Fund (EFUF)",
    short: "EFUF",
    color: "#1e40af",
    benefits: [
      "Balanced portfolio of equity and debt securities",
      "Suitable for moderate-risk investors seeking steady growth",
      "Professional fund management by experienced portfolio managers",
      "Diversified across multiple sectors to reduce risk",
      "Regular dividend distributions to unit holders",
    ],
  },
  EGF: {
    name: "Ekush Growth Fund (EGF)",
    short: "EGF",
    color: "#059669",
    benefits: [
      "Equity-focused fund with higher growth potential",
      "Ideal for investors with a long-term horizon",
      "Targets high-growth companies in Bangladesh's emerging market",
      "Higher return potential compared to balanced funds",
      "Capital appreciation focused strategy",
    ],
  },
  ESRF: {
    name: "Ekush Stable Return Fund (ESRF)",
    short: "ESRF",
    color: "#7c3aed",
    benefits: [
      "Fixed-income securities and IPOs for stable returns",
      "Lowest risk among all Ekush funds",
      "Ideal for conservative investors and retirees",
      "Consistent income through fixed-income instruments",
      "Capital preservation with steady growth",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Bot response logic                                                 */
/* ------------------------------------------------------------------ */

function getBotResponse(action: string): Message {
  const id = Date.now().toString();

  switch (action) {
    case "greeting":
      return {
        id,
        from: "bot",
        text: "Welcome to Ekush Wealth Management! I'm here to help you with your investments. What would you like to do today?",
        options: [
          { label: "Buy Units", action: "nav_buy" },
          { label: "Sell Units", action: "nav_sell" },
          { label: "Invest in SIP", action: "nav_sip" },
          { label: "Learn About Funds", action: "funds_menu" },
          { label: "View Portfolio", action: "nav_portfolio" },
          { label: "Help & Support", action: "help" },
        ],
      };

    case "nav_buy":
      return {
        id,
        from: "bot",
        text: "Great choice! To buy units, you'll need to select a fund and enter the amount you'd like to invest.\n\nI can take you to the Buy Units page right away.",
        options: [
          { label: "Go to Buy Units", action: "/transactions/buy" },
          { label: "Which fund should I buy?", action: "funds_menu" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };

    case "nav_sell":
      return {
        id,
        from: "bot",
        text: "To sell (redeem) your units, you can choose which fund to sell from and how many units.\n\nLet me take you to the Sell Units page.",
        options: [
          { label: "Go to Sell Units", action: "/transactions/sell" },
          { label: "View my portfolio first", action: "/portfolio" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };

    case "nav_sip":
      return {
        id,
        from: "bot",
        text: "A Systematic Investment Plan (SIP) lets you invest a fixed amount regularly — it's one of the smartest ways to build wealth over time through rupee-cost averaging.\n\nBenefits of SIP:\n- Disciplined, automated investing\n- Reduces impact of market volatility\n- Start with as little as BDT 500/month\n- Choose from 3, 5, 7, 10, or 12-year tenures",
        options: [
          { label: "Start a SIP now", action: "/sip" },
          { label: "Which fund for SIP?", action: "funds_menu" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };

    case "funds_menu":
      return {
        id,
        from: "bot",
        text: "Ekush manages 3 mutual funds, each suited for different investment goals. Which fund would you like to learn about?",
        options: [
          { label: "EFUF - First Unit Fund", action: "fund_EFUF" },
          { label: "EGF - Growth Fund", action: "fund_EGF" },
          { label: "ESRF - Stable Return Fund", action: "fund_ESRF" },
          { label: "Compare all funds", action: "funds_compare" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };

    case "fund_EFUF":
    case "fund_EGF":
    case "fund_ESRF": {
      const code = action.replace("fund_", "") as keyof typeof FUND_INFO;
      const fund = FUND_INFO[code];
      return {
        id,
        from: "bot",
        text: `${fund.name}\n\n${fund.benefits.map((b) => `- ${b}`).join("\n")}\n\nWould you like to invest in ${fund.short}?`,
        options: [
          { label: `Buy ${fund.short} units`, action: "/transactions/buy" },
          { label: `Start SIP in ${fund.short}`, action: "/sip" },
          { label: "View other funds", action: "funds_menu" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };
    }

    case "funds_compare":
      return {
        id,
        from: "bot",
        text: `Here's a quick comparison:\n\nEFUF (First Unit Fund)\nRisk: Moderate | Strategy: Balanced equity & debt\nBest for: Moderate-risk investors\n\nEGF (Growth Fund)\nRisk: Higher | Strategy: Equity-focused growth\nBest for: Long-term aggressive investors\n\nESRF (Stable Return Fund)\nRisk: Low | Strategy: Fixed-income & IPOs\nBest for: Conservative investors & retirees\n\nAll three funds are managed by experienced professionals and regulated by BSEC.`,
        options: [
          { label: "Buy Units", action: "nav_buy" },
          { label: "Start a SIP", action: "nav_sip" },
          { label: "Learn more about a fund", action: "funds_menu" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };

    case "help":
      return {
        id,
        from: "bot",
        text: "Here are some things I can help you with:",
        options: [
          { label: "View Statements", action: "/statements" },
          { label: "Tax Certificate", action: "/statements/tax" },
          { label: "Edit Profile", action: "/profile" },
          { label: "Manage Nominees", action: "/profile/nominees" },
          { label: "Documents", action: "/documents" },
          { label: "Contact Support", action: "/support" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };

    default:
      return {
        id,
        from: "bot",
        text: "I'm not sure I understand. Let me show you what I can help with.",
        options: [
          { label: "Buy Units", action: "nav_buy" },
          { label: "Sell Units", action: "nav_sell" },
          { label: "Invest in SIP", action: "nav_sip" },
          { label: "Learn About Funds", action: "funds_menu" },
          { label: "Back to main menu", action: "greeting" },
        ],
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Free-text matching                                                 */
/* ------------------------------------------------------------------ */

function matchFreeText(text: string): string {
  const t = text.toLowerCase().trim();

  if (/\b(buy|purchase|invest)\b/.test(t) && !/sip/.test(t)) return "nav_buy";
  if (/\b(sell|redeem|withdraw)\b/.test(t)) return "nav_sell";
  if (/\bsip\b/.test(t)) return "nav_sip";
  if (/\befuf\b/.test(t) || /first unit/i.test(t)) return "fund_EFUF";
  if (/\begf\b/.test(t) || /growth fund/i.test(t)) return "fund_EGF";
  if (/\besrf\b/.test(t) || /stable return/i.test(t)) return "fund_ESRF";
  if (/\b(fund|funds|compare)\b/.test(t)) return "funds_menu";
  if (/\b(help|support|contact|statement|tax|document|profile|nominee)\b/.test(t)) return "help";
  if (/\b(hi|hello|hey|assalamualaikum)\b/.test(t)) return "greeting";

  return "unknown";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EkushChatbot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show greeting when first opened
  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([getBotResponse("greeting")]);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleOptionClick = (option: QuickOption) => {
    // If it starts with "/" it's a route — navigate
    if (option.action.startsWith("/")) {
      // Add user message
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), from: "user", text: option.label },
        {
          id: (Date.now() + 1).toString(),
          from: "bot",
          text: `Taking you to ${option.label}...`,
        },
      ]);
      setTimeout(() => {
        router.push(option.action);
        setIsOpen(false);
      }, 600);
      return;
    }

    // Otherwise it's a bot action
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), from: "user", text: option.label },
      getBotResponse(option.action),
    ]);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const action = matchFreeText(text);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), from: "user", text },
      getBotResponse(action),
    ]);
  };

  const handleReset = () => {
    setMessages([getBotResponse("greeting")]);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#1e3a5f] text-white shadow-lg hover:bg-[#2d5a8f] transition-all hover:scale-105 flex items-center justify-center"
          aria-label="Open chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[540px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Ekush Assistant</p>
                <p className="text-[11px] text-white/70">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Start over"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id}>
                {/* Message bubble */}
                <div
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.from === "user"
                        ? "bg-[#1e3a5f] text-white rounded-br-sm"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Quick options */}
                {msg.from === "bot" && msg.options && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleOptionClick(opt)}
                        className="px-3 py-1.5 text-[12px] font-medium text-[#1e3a5f] bg-white border border-[#1e3a5f]/20 rounded-full hover:bg-[#1e3a5f] hover:text-white transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-white px-3 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-[#1e3a5f] bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center hover:bg-[#2d5a8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
