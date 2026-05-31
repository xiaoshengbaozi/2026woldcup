export function Metric({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-semibold ${accent ? "text-flare" : "text-volt"}`} style={{ fontFamily: "ScreenMatrix, monospace" }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/36">{label}</p>
    </div>
  );
}
