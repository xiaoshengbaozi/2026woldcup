import type { ReactNode } from "react";
import { NavBar } from "./nav-bar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-flare/10 blur-[110px]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5"