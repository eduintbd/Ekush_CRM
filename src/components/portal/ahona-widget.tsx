"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Portal-side mirror of the public Ahona widget. Same UX (menu-driven,
 * no text input, no AI), but fetches from its own /api/portal/ahona
 * which auth-binds to the logged-in investor and personalises the
 * header. Cookies/credentials are sent automatically because this is
 * a same-origin call.
 */

export type AhonaNode = {
  id: string;
  surface: string;
  labelEn: string;
  labelBn: string;
  responseEn: string;
  responseBn: string;
  isContactCard: boolean;
  parentId: string | null;
  displayOrder: number;
  children: AhonaNode[];
};

export type AhonaFeed = {
  enabled: boolean;
  greeting: { en: string; bn: string };
  contact: {
    phone: string | null;
    whatsapp: string | null;
    workingHours: { en: string | null; bn: string | null };
  };
  menu: AhonaNode[];
};

type Props = {
  feed: AhonaFeed | null;
  me?: { name: string | null; investorCode: string | null } | null;
};

type Lang = "en" | "bn";

export function AhonaWidget({ feed, me = null }: Props) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [path, setPath] = useState<string[]>([]);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const node = useMemo(() => {
    if (!feed) return null;
    let cursor: AhonaNode | null = null;
    let pool = feed.menu;
    for (const id of path) {
      const next = pool.find((n) => n.id === id);
      if (!next) return null;
      cursor = next;
      pool = next.children;
    }
    return cursor;
  }, [feed, path]);

  const visibleChildren = useMemo(() => {
    if (!feed) return [] as AhonaNode[];
    return node ? node.children : feed.menu;
  }, [feed, node]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    launcherRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!feed || !feed.enabled || feed.menu.length === 0) return null;

  return (
    <>
      <Launcher ref={launcherRef} onOpen={() => setOpen(true)} active={open} />
      {open ? (
        <Panel
          feed={feed}
          me={me}
          lang={lang}
          setLang={setLang}
          node={node}
          visibleChildren={visibleChildren}
          path={path}
          setPath={setPath}
          onClose={close}
          closeBtnRef={closeBtnRef}
        />
      ) : null}
      <style jsx global>{`
        @keyframes ahonaPanelIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

const Launcher = forwardRef<
  HTMLButtonElement,
  { onOpen: () => void; active: boolean }
>(function Launcher({ onOpen, active }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label="Open Ahona chat"
      aria-haspopup="dialog"
      aria-expanded={active}
      className="
        fixed bottom-5 right-5 z-[900] flex h-[56px] w-[56px]
        items-center justify-center rounded-full bg-ekush-orange text-white
        shadow-[0_4px_15px_rgba(242,112,35,0.4)]
        transition-transform hover:scale-110
        hover:shadow-[0_6px_20px_rgba(242,112,35,0.5)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white
      "
    >
      <ChatIcon className="h-6 w-6" />
    </button>
  );
});

function Panel({
  feed,
  me,
  lang,
  setLang,
  node,
  visibleChildren,
  path,
  setPath,
  onClose,
  closeBtnRef,
}: {
  feed: AhonaFeed;
  me: { name: string | null; investorCode: string | null } | null;
  lang: Lang;
  setLang: (l: Lang) => void;
  node: AhonaNode | null;
  visibleChildren: AhonaNode[];
  path: string[];
  setPath: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  function go(id: string) {
    setPath((p) => [...p, id]);
  }
  function back() {
    setPath((p) => p.slice(0, -1));
  }
  function home() {
    setPath([]);
  }

  return (
    <div
      role="dialog"
      aria-label="Ahona chat"
      className="
        fixed bottom-24 right-5 z-[1000] flex w-[min(380px,92vw)]
        flex-col overflow-hidden rounded-2xl bg-white
        shadow-[0_12px_40px_rgba(0,0,0,0.18)]
        max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:w-full
        max-md:rounded-b-none max-md:max-h-[85vh]
        motion-safe:animate-[ahonaPanelIn_220ms_ease-out]
      "
      style={{ height: "min(560px, 88vh)" }}
    >
      <Header
        title="Ahona"
        subtitle={
          me?.name
            ? lang === "en"
              ? `Hi ${me.name}${me.investorCode ? ` · ${me.investorCode}` : ""}`
              : `নমস্কার ${me.name}${me.investorCode ? ` · ${me.investorCode}` : ""}`
            : lang === "en"
              ? "Ekush assistant"
              : "একুশ সহকারী"
        }
        lang={lang}
        setLang={setLang}
        onClose={onClose}
        closeBtnRef={closeBtnRef}
      />

      <Crumbs
        path={path}
        feed={feed}
        lang={lang}
        onHome={home}
        onBack={back}
      />

      <div className="flex-1 overflow-y-auto bg-[#FAF6F1] px-4 py-4">
        {path.length === 0 ? (
          <Bubble>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-dark">
              {feed.greeting[lang]}
            </p>
          </Bubble>
        ) : null}

        {node ? (
          node.isContactCard ? (
            <Bubble>
              <ContactBlock feed={feed} lang={lang} />
            </Bubble>
          ) : (
            <Bubble>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-dark">
                {lang === "en" ? node.responseEn : node.responseBn}
              </p>
            </Bubble>
          )
        ) : null}

        {visibleChildren.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
              {lang === "en" ? "Choose an option" : "একটি বিকল্প বেছে নিন"}
            </p>
            <ul className="space-y-1.5">
              {visibleChildren.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => go(c.id)}
                    className="
                      flex w-full items-center justify-between gap-2
                      rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left
                      text-[13px] font-medium text-text-dark
                      transition-colors hover:border-ekush-orange hover:bg-[#FFF4EC]
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ekush-orange
                    "
                  >
                    <span>{lang === "en" ? c.labelEn : c.labelBn}</span>
                    <ChevronRight className="h-4 w-4 text-[#8A8A8A]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : node ? (
          <div className="mt-3 space-y-1.5">
            <button
              type="button"
              onClick={home}
              className="
                w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left
                text-[13px] font-medium text-text-dark
                hover:border-ekush-orange hover:bg-[#FFF4EC]
              "
            >
              {lang === "en" ? "↩ Back to main menu" : "↩ মূল মেনুতে ফিরুন"}
            </button>
          </div>
        ) : null}
      </div>

      <Footer feed={feed} lang={lang} />
    </div>
  );
}

function Header({
  title,
  subtitle,
  lang,
  setLang,
  onClose,
  closeBtnRef,
}: {
  title: string;
  subtitle: string;
  lang: Lang;
  setLang: (l: Lang) => void;
  onClose: () => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-ekush-orange px-4 py-3 text-white">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
        <AhonaAvatar className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-[14px]">{title}</p>
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Bot
          </span>
        </div>
        <p className="truncate text-[11px] opacity-85">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 p-0.5 text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`rounded-full px-2 py-0.5 ${lang === "en" ? "bg-white text-ekush-orange" : ""}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("bn")}
          className={`rounded-full px-2 py-0.5 ${lang === "bn" ? "bg-white text-ekush-orange" : ""}`}
        >
          বাং
        </button>
      </div>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/15"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function Crumbs({
  path,
  feed,
  lang,
  onHome,
  onBack,
}: {
  path: string[];
  feed: AhonaFeed;
  lang: Lang;
  onHome: () => void;
  onBack: () => void;
}) {
  if (path.length === 0) return null;
  const labels: string[] = [];
  let pool = feed.menu;
  for (const id of path) {
    const next = pool.find((n) => n.id === id);
    if (!next) break;
    labels.push(lang === "en" ? next.labelEn : next.labelBn);
    pool = next.children;
  }
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-3 py-1.5 text-[11px]">
      <button
        type="button"
        onClick={onHome}
        className="rounded px-1.5 py-0.5 text-[#4A4A4A] hover:bg-[#FFF4EC] hover:text-ekush-orange"
      >
        {lang === "en" ? "Home" : "শুরু"}
      </button>
      <span className="text-[#C8C8C8]">›</span>
      <button
        type="button"
        onClick={onBack}
        className="rounded px-1.5 py-0.5 text-[#4A4A4A] hover:bg-[#FFF4EC] hover:text-ekush-orange"
      >
        {lang === "en" ? "Back" : "ফিরুন"}
      </button>
      <span className="ml-2 truncate text-[#8A8A8A]">{labels.join(" › ")}</span>
    </div>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 max-w-[90%] rounded-2xl rounded-tl-md border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      {children}
    </div>
  );
}

function ContactBlock({ feed, lang }: { feed: AhonaFeed; lang: Lang }) {
  const phone = feed.contact.phone;
  const wa = feed.contact.whatsapp;
  const hours = feed.contact.workingHours[lang];
  return (
    <div className="space-y-2 text-[13px]">
      <p className="text-text-dark">
        {lang === "en"
          ? "Talk to us — we're happy to help."
          : "আমাদের সাথে কথা বলুন — আমরা সাহায্য করতে প্রস্তুত।"}
      </p>
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <a
            href={`tel:+${phone}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-ekush-orange px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
          >
            <PhoneIcon className="h-3.5 w-3.5" />
            {lang === "en" ? "Call" : "কল করুন"}
          </a>
        ) : null}
        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : null}
      </div>
      {hours ? <p className="text-[11px] text-[#8A8A8A]">{hours}</p> : null}
    </div>
  );
}

function Footer({ feed, lang }: { feed: AhonaFeed; lang: Lang }) {
  const phone = feed.contact.phone;
  const wa = feed.contact.whatsapp;
  return (
    <div className="border-t border-gray-200 bg-white px-4 py-2 text-[10px] text-[#8A8A8A]">
      <p className="text-center">
        {lang === "en"
          ? "Tap an option above. For anything else, "
          : "উপরে একটি বিকল্প বেছে নিন। অন্য কিছুর জন্য, "}
        {phone ? (
          <a href={`tel:+${phone}`} className="font-semibold text-ekush-orange">
            {lang === "en" ? "call us" : "আমাদের কল করুন"}
          </a>
        ) : null}
        {phone && wa ? <span> · </span> : null}
        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ekush-orange"
          >
            WhatsApp
          </a>
        ) : null}
        .
      </p>
    </div>
  );
}

// Icons
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11 18.18 19.5 19.5 0 0 1 4.82 12 19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.07 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.72 2.81a2 2 0 0 1-.45 2.11L8 10a16 16 0 0 0 6 6l1.36-1.34a2 2 0 0 1 2.11-.45c.91.36 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
function AhonaAvatar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 1 1-10 0V7a5 5 0 0 1 5-5z" />
      <path d="M3 22c0-4.5 4-7 9-7s9 2.5 9 7v0H3v0z" />
    </svg>
  );
}
