import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface ActionCardProps {
  href: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  active?: boolean;
}

export function ActionCard({ href, label, icon: Icon, iconColor, iconBg, active = false }: ActionCardProps) {
  const base =
    "rounded-[10px] shadow-card p-8 flex items-center gap-6 transition-colors duration-200 relative overflow-hidden group";
  const palette = active
    ? "bg-[#1860a8] hover:bg-[#1860a8]"
    : "bg-white hover:bg-[#1860a8]";

  return (
    <Link href={href} className="block">
      <div className={`${base} ${palette}`}>
        {/* Decorative corner */}
        <div
          className={`absolute top-0 right-0 w-20 h-20 transition-opacity ${
            active ? "opacity-0" : "opacity-5 group-hover:opacity-0"
          }`}
        >
          <svg viewBox="0 0 80 80" fill="none">
            <path d="M80 0H0L80 80V0Z" fill={iconColor} />
          </svg>
        </div>
        <div
          className={`absolute bottom-0 right-0 w-16 h-16 transition-opacity ${
            active ? "opacity-0" : "opacity-5 group-hover:opacity-0"
          }`}
        >
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M64 64H0L64 0V64Z" fill={iconColor} />
          </svg>
        </div>

        <div
          className={`w-[60px] h-[60px] rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
            active ? "bg-white/15" : "group-hover:bg-white/15"
          }`}
          style={!active ? { backgroundColor: iconBg } : undefined}
        >
          <Icon
            className={`w-7 h-7 transition-colors duration-200 ${
              active ? "!text-white" : "group-hover:!text-white"
            }`}
            style={!active ? { color: iconColor } : undefined}
          />
        </div>
        <span
          className={`text-[16px] font-medium transition-colors duration-200 ${
            active ? "text-white" : "text-text-dark group-hover:text-white"
          }`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}
