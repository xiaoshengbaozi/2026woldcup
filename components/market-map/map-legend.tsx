"use client";

const GRADIENT_STOPS = [
  "#1A1A24", "#1E3A5F", "#2563C7", "#7B9E4A",
  "#E8B830", "#F08020", "#C00000",
];

export function MapLegend() {
  return (
    <div
      className="absolute bottom-3 left-3 rounded-2xl p-3 z-10"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(5,8,8,0.9)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="text-[9px] uppercase tracking-[0.12em] text-white/40 mb-1.5">
        夺冠概率
      </div>
      <div
        className="h-2 rounded-full"
        style={{
          width: 120,
          background: `linear-gradient(to right, ${GRADIENT_STOPS.join(", ")})`,
          boxShadow: "0 0 12px rgba(216,255,62,0.1)",
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-white/28">0%</span>
        <span className="text-[8px] text-white/28">50%</span>
        <span className="text-[8px] text-white/28">100%</span>
      </div>
    </div>
  );
}
