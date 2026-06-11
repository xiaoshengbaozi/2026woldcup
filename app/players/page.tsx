import type { Metadata } from "next";
import { PlayersClient } from "./players-client";

export const metadata: Metadata = {
  title: "球员动态 | 2026 世界杯",
  description: "世界杯超级巨星、新星与球员动态时间线。",
};

export default function PlayersPage() {
  return <PlayersClient />;
}
