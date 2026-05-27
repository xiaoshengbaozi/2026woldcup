import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
};

export function StatCard({ label, value, detail: _detail, icon: Icon, accent = false }: StatCardProps) {
  const parts = typeof value === "string" ? value.split("/") : null;
  const isFraction = parts && parts.length === 2;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="glass-panel group relative overflow-hidden p-4 sm:p-5"
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      {/* Mobile: stacked vertical — icon + label top, number bottom */}
      <div className="flex flex-col items-center gap-2 sm:hidden">
        <div className="flex items-center gap-1.5">
          <div
            className={`grid h-7 w-7 place-items-center rounded-lg ${
              accent ? "bg-volt/16 text-volt" : "bg-white/[0.055] text-white/64"
            } transition group-hover:shadow-glow`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">{label}</p>
        </div>
        <p className="text-2xl font-semibold" style={{ fontFamily: "ScreenMatrix, monospace" }}>
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
}
