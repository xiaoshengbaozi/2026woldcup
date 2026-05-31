export function Metric({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-semibold sm:text-2xl ${accent ? "text-flare" : "text-volt"}`} style={{ fontFamily: "ScreenMatrix, monospace" }}>
        {value}
      </p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/36 sm:text-[10px] sm:tracking-[0.16em]">{label}</p>
    </div>
  );
}
