"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { MobileMeEntry, type MobileTopRightAction } from "@/components/mobile-me-entry";

type MobileTopBarContextValue = {
  topRightAction: MobileTopRightAction | null;
  setTopRightAction: Dispatch<SetStateAction<MobileTopRightAction | null>>;
};

const MobileTopBarContext = createContext<MobileTopBarContextValue | null>(null);

export function MobileTopBarProvider({ children }: { children: ReactNode }) {
  const [topRightAction, setTopRightAction] = useState<MobileTopRightAction | null>(null);
  const value = useMemo(() => ({ topRightAction, setTopRightAction }), [topRightAction]);

  return (
    <MobileTopBarContext.Provider value={value}>
      {children}
      <MobileMeEntry topRightAction={topRightAction ?? undefined} />
    </MobileTopBarContext.Provider>
  );
}

export function useMobileTopBar() {
  const context = useContext(MobileTopBarContext);
  if (!context) {
    throw new Error("useMobileTopBar must be used inside MobileTopBarProvider");
  }
  return context;
}
