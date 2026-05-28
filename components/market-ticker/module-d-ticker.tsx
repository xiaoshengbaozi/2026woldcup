"use client";

import { TickerLeftDock } from "./ticker-left-dock";
import { TickerStream } from "./ticker-stream";
import { TickerRightDock } from "./ticker-right-dock";

export function ModuleD_Ticker() {
  return (
    <div className="relative z-10 flex items-center h-[var(--ticker-height)] overflow-hidden border-b border-white/[0.04]">
      <TickerLeftDock />
      <TickerStream />
      <TickerRightDock />
    </div>
  );
}
