"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPlayerAvatar } from "@/lib/user-preferences";
import { userApi, type UserSessionPayload } from "@/lib/user-system";

type UserSessionContextValue = {
  home: UserSessionPayload | null;
  avatarUrl: string | null;
  signedIn: boolean | null;
  loading: boolean;
  refreshSession: () => Promise<UserSessionPayload | null>;
  clearSession: () => void;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

let sessionRequest: Promise<UserSessionPayload | null> | null = null;

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [home, setHome] = useState<UserSessionPayload | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((payload: UserSessionPayload | null) => {
    if (!payload) {
      setHome(null);
      setAvatarUrl(null);
      setSignedIn(false);
      return null;
    }

    const playerId = payload.user.profile.avatarPlayerId ?? null;
    const followedPlayer = payload.user.followedPlayers.find((player) => player.id === playerId);
    setHome(payload);
    setAvatarUrl(payload.user.profile.avatarUrl || followedPlayer?.photo || getPlayerAvatar(playerId));
    setSignedIn(true);
    return payload;
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    if (!sessionRequest) {
      sessionRequest = userApi<UserSessionPayload>("/api/me/session", { cache: "no-store" })
        .catch(() => null)
        .finally(() => {
          sessionRequest = null;
        });
    }

    const payload = await sessionRequest;
    const next = applySession(payload);
    setLoading(false);
    return next;
  }, [applySession]);

  const clearSession = useCallback(() => {
    sessionRequest = null;
    setHome(null);
    setAvatarUrl(null);
    setSignedIn(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({ home, avatarUrl, signedIn, loading, refreshSession, clearSession }),
    [avatarUrl, clearSession, home, loading, refreshSession, signedIn]
  );

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useUserSession() {
  const value = useContext(UserSessionContext);
  if (!value) {
    throw new Error("useUserSession must be used inside UserSessionProvider");
  }
  return value;
}
