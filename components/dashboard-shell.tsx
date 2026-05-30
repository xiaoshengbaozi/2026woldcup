import type { ReactNode } from "react";
import { NavBar } from "./nav-bar";
import { MobileNavBar } from "./mobile-nav-bar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden px-3 py-4 pb-28 sm:px-6 sm:py-5 lg:px-8 lg:pb-5">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px] sm:h-[520px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[320px] w-[min(420px,80vw)] rounded-full bg-flare/10 blur-[110px] sm:h-[420px]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        <NavBar />
        {children}
      </div>
      <MobileNavBar />
    </div>
  );
}
