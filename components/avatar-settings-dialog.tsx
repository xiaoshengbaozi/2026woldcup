"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Save, X } from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";
import { useUserPreferenceCatalog } from "@/lib/use-user-preferences";
import { userApi, type PublicUser } from "@/lib/user-system";

export type AvatarSettingsDialogProps = {
  open: boolean;
  home: { user: Pick<PublicUser, "profile"> } | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AvatarSettingsDialog({ open, home, onClose, onSaved }: AvatarSettingsDialogProps) {
  const catalog = useUserPreferenceCatalog(open);
  const [selectedPlayerId, setSelectedPlayerId] = useState("lionel-messi");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedPlayerId(home?.user.profile.avatarPlayerId || "lionel-messi");
    setCustomAvatarUrl(home?.user.profile.avatarUrl || "");
    setError("");
  }, [home, open]);

  async function saveAvatar() {
    setBusy(true);
    setError("");
    try {
      await userApi("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          avatarPlayerId: selectedPlayerId,
          avatarUrl: customAvatarUrl || null,
        }),
      });
      onSaved();
      onClose();
    } catch {
      setError("头像保存失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[420] grid place-items-center overflow-hidden bg-black/70 px-4 py-6 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="pointer-events-none fixed left-1/2 top-0 h-[300px] w-[min(560px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[110px]" />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="hero-card relative w-full max-w-[520px] overflow-hidden rounded-[2rem] px-4 py-5 sm:px-5 sm:py-6"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />
            <div className="relative mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-volt/80">Settings</p>
                <h2 className="mt-2 text-2xl font-bold text-white">修改头像</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/58 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AvatarPicker
              catalog={catalog}
              selectedPlayerId={selectedPlayerId}
              customAvatarUrl={customAvatarUrl}
              onPlayerSelect={setSelectedPlayerId}
              onCustomAvatarUrlChange={setCustomAvatarUrl}
              onUploadError={setError}
              variant="settings"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {error ? <p className="text-sm font-semibold text-flare/85">{error}</p> : <span />}
              <button
                type="button"
                onClick={saveAvatar}
                disabled={busy}
                className="inline-flex h-11 min-w-[128px] items-center justify-center gap-2 rounded-full bg-volt px-5 text-sm font-black text-black shadow-[0_0_30px_rgba(216,255,62,.22)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {busy ? "保存中" : "保存头像"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
