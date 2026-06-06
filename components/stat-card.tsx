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
};

export function StatCard({ label, value, detail: _detail, icon: Icon, accent = false, href }: StatCardProps) {
  const parts = typeof value === "string" ? value.split("/") : null;
  const isFraction = parts && parts.length === 2;

  const card = (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="glass-panel group relative overflow-hidden p-1.5 sm:p-5"
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      {/* Mobile: stacked vertical — icon + label top, number bottom */}
      <div className="flex min-w-0 flex-col items-center gap-1.5 sm:hidden">
        <div className="flex min-w-0 items-center gap-1">
          <div
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-lg ${
              accent ? "bg-volt/16 text-volt" : "bg-white/[0.055] text-white/64"
            } transition group-hover:shadow-glow`}
          >
            <Icon className="h-2.5 w-2.5" />
          </div>
          <p className="min-w-0 truncate text-[8px] uppercase text-white/38">{label}</p>
        </div>
        <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "ScreenMatrix, monospace" }}>
          {isFraction ? (
            <>
              <span style={{ color: "rgb(216 255 62 / 0.9)" }}>{parts[0]}</span>
              <span className="text-white/50">/{parts[1]}</span>
            </>
          ) : (
            <span className="text-white">{value}</span>
          )}
        </p>
      </div>
      {/* Desktop: horizontal layout */}
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-10 w-10 place-items-center rounded-2xl ${
              accent ? "bg-volt/16 text-volt" : "bg-white/[0.055] text-white/64"
            } transition group-hover:shadow-glow`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/38">{label}</p>
        </div>
        <p className="text-4xl font-semibold" style={{ fontFamily: "ScreenMatrix, monospace" }}>
          {isFraction ? (
            <>
              <span style={{ color: "rgb(216 255 62 / 0.9)" }}>{parts[0]}</span>
              <span className="text-white/50">/{parts[1]}</span>
            </>
          ) : (
            <span className="text-white">{value}</span>
          )}
        </p>
      </div>
    </motion.div>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-volt/60">
      {card}
    </Link>
  );
}
