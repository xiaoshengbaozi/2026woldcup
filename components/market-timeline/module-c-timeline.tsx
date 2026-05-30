"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { TimelineHeader } from "./timeline-header";
import { TimelineCanvas } from "./timeline-canvas";

export function ModuleC_OddsTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 150 });

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateSize]);

  return (
    <div className="flex flex-col h-full">
      <TimelineHeader />
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <TimelineCanvas size={size} />
      </div>
    </div>
  );
}
