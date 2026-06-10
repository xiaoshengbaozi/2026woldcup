import { motion } from "framer-motion";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  tone?: "violet" | "emerald" | "amber" | "cyan";
  bareIcon?: boolean;
};

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, { card: string; glow: string; icon: string; value: string }> = {
  violet: {
    card: "bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,.22),transparent_26%),linear-gradient(135deg,rgba(113,80,255,.88),rgba(78,67,210,.76)_48%,rgba(39,32,125,.84))]",
    glow: "bg-violet-400/45",
    icon: "bg-white/16 text-white shadow-[0_0_24px_rgba(167,139,250,.36)]",
    value: "rgb(238 232 255 / 0.96)",
  },
  emerald: {
    card: "bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,.18),transparent_27%),linear-gradient(135deg,rgba(53,198,91,.9),rgba(30,151,70,.8)_48%,rgba(18,96,51,.86))]",
    glow: "bg-emerald-300/40",
    icon: "bg-white/16 text-white shadow-[0_0_24px_rgba(52,211,153,.34)]",
    value: "rgb(224 255 235 / 0.96)",
  },
  amber: {
    card: "bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,.17),transparent_27%),linear-gradient(135deg,rgba(186,124,48,.92),rgba(149,91,31,.82)_48%,rgba(94,52,20,.88))]",
    glow: "bg-amber-300/40",
    icon: "bg-white/16 text-white shadow-[0_0_24px_rgba(251,191,36,.32)]",
    value: "rgb(255 240 212 / 0.96)",
  },
  cyan: {
    card: "bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,.2),transparent_27%),linear-gradient(135deg,rgba(66,164,226,.9),rgba(54,124,168,.78)_48%,rgba(39,84,116,.88))]",
    glow: "bg-sky-300/40",
    icon: "bg-white/16 text-white shadow-[0_0_24px_rgba(56,189,248,.34)]",
    value: "rgb(224 246 255 / 0.96)",
  },
};

export function StatCard({ label, value, detail: _detail, icon: Icon, accent = false, href, onClick, ariaLabel, tone, bareIcon = false }: StatCardProps) {
  const parts = typeof value === "string" ? value.split("/") : null;
  const isFraction = parts && parts.length === 2;
  const toneStyle = tone ? toneStyles[tone] : null;
  const iconClassName = toneStyle
    ? toneStyle.icon
    : accent
      ? "bg-volt/16 text-volt"
      : "bg-white/[0.055] text-white/64";
  const bareIconClassName = toneStyle
    ? "text-white/88 drop-shadow-[0_0_10px_rgba(255,255,255,.24)]"
    : accent
      ? "text-volt"
      : "text-white/64";

  const card = (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`glass-panel group relative overflow-hidden p-1.5 sm:p-5 ${tone ? `stat-card-tone stat-card-tone-${tone}` : ""} ${toneStyle ? toneStyle.card : ""}`}
    >
      {toneStyle && (
        <>
          <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full ${toneStyle.glow} blur-3xl`} />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.18),transparent_34%,rgba(0,0,0,.18)_100%)]" />
        </>
      )}
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <div className="relative flex min-w-0 flex-col items-center justify-center gap-1.5 py-1 text-center sm:hidden">
        <Icon className={`h-4 w-4 ${toneStyle ? "text-white/86" : "text-white/64"} transition group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.32)]`} />
        <p className={`min-w-0 truncate text-[9px] font-semibold uppercase ${toneStyle ? "text-white/80" : "text-white/42"}`}>{label}</p>
        <p className="text-[18px] font-semibold leading-none" style={{ fontFamily: "ScreenMatrix, monospace" }}>
          {isFraction ? (
            <>
              <span style={{ color: toneStyle?.value ?? "rgb(216 255 62 / 0.9)" }}>{parts[0]}</span>
              <span className="text-white/50">/{parts[1]}</span>
            </>
          ) : (
            <span className="text-white">{value}</span>
          )}
        </p>
      </div>

      <div className="relative hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center transition ${bareIcon ? "" : `rounded-2xl ${iconClassName} group-hover:shadow-glow`}`}>
            <Icon className={`${bareIcon ? "h-6 w-6" : "h-5 w-5"} ${bareIcon ? bareIconClassName : ""}`} />
          </div>
          <p className={`text-xs uppercase tracking-[0.22em] ${toneStyle ? "text-white/76" : "text-white/38"}`}>{label}</p>
        </div>
        <p className="text-4xl font-semibold" style={{ fontFamily: "ScreenMatrix, monospace" }}>
          {isFraction ? (
            <>
              <span style={{ color: toneStyle?.value ?? "rgb(216 255 62 / 0.9)" }}>{parts[0]}</span>
              <span className="text-white/50">/{parts[1]}</span>
            </>
          ) : (
            <span className="text-white">{value}</span>
          )}
        </p>
      </div>
    </motion.div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="block w-full rounded-[1.5rem] text-left outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
      >
        {card}
      </button>
    );
  }

  if (!href) return card;

  return (
    <Link href={href} className="block rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-volt/60">
      {card}
    </Link>
  );
}
