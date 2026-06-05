"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import type { UserPreferenceCatalog } from "@/lib/user-preferences";
import { userApi } from "@/lib/user-system";

export const SUPERSTAR_AVATARS = [
  { id: "lionel-messi", name: "Messi", image: "/player-stories/26_superstars/Lionel_Messi_main.webp" },
  { id: "kylian-mbappe", name: "Mbappe", image: "/player-stories/26_superstars/Kylian_Mbappe_main.webp" },
  { id: "erling-haaland", name: "Haaland", image: "/player-stories/26_superstars/Erling_Haaland_main.webp" },
  { id: "vinicius-junior", name: "Vinicius", image: "/player-stories/26_superstars/Vinicius_Junior_main.webp" },
  { id: "jude-bellingham", name: "Bellingham", image: "/player-stories/26_superstars/Jude_Bellingham_main.webp" },
  { id: "harry-kane", name: "Kane", image: "/player-stories/26_superstars/Harry_Kane_main.webp" },
  { id: "cristiano-ronaldo", name: "Ronaldo", image: "/player-stories/26_superstars/Cristiano_Ronaldo_main.webp" },
  { id: "mohamed-salah", name: "Salah", image: "/player-stories/26_superstars/Mohamed_Salah_main.webp" },
  { id: "kevin-de-bruyne", name: "De Bruyne", image: "/player-stories/26_superstars/Kevin_De_Bruyne_main.webp" },
  { id: "bruno-fernandes", name: "Bruno", image: "/player-stories/26_superstars/Bruno_Fernandes_main.webp" },
  { id: "federico-valverde", name: "Valverde", image: "/player-stories/26_superstars/Federico_Valverde_main.webp" },
  { id: "luka-modric", name: "Modric", image: "/player-stories/26_superstars/Luka_Modric_main.webp" },
  { id: "raphinha", name: "Raphinha", image: "/player-stories/26_superstars/Raphinha_main.webp" },
  { id: "julian-alvarez", name: "Alvarez", image: "/player-stories/26_superstars/Julian_Alvarez_main.webp" },
  { id: "pedri", name: "Pedri", image: "/player-stories/26_superstars/Pedri_main.webp" },
  { id: "florian-wirtz", name: "Wirtz", image: "/player-stories/26_superstars/Florian_Wirtz_main.webp" },
  { id: "son-heungmin", name: "Son", image: "/player-stories/26_superstars/Son_Heungmin_main.webp" },
  { id: "lamine-yamal", name: "Yamal", image: "/player-stories/26_superstars/Lamine_Yamal_main.webp" },
  { id: "enzo-fernandez", name: "Enzo", image: "/player-stories/26_superstars/Enzo_Fernandez_main.webp" },
  { id: "luis-diaz", name: "Luis Diaz", image: "/player-stories/26_superstars/Luis_Diaz_main.webp" },
  { id: "ousmane-dembele", name: "Dembele", image: "/player-stories/26_superstars/Ousmane_Dembele_main.webp" },
  { id: "sadio-mane", name: "Mane", image: "/player-stories/26_superstars/Sadio_Mane_main.webp" },
  { id: "riyad-mahrez", name: "Mahrez", image: "/player-stories/26_superstars/Riyad_Mahrez_main.webp" },
  { id: "moises-caicedo", name: "Caicedo", image: "/player-stories/26_superstars/Moises_Caicedo_main.webp" },
  { id: "michael-olise", name: "Olise", image: "/player-stories/26_superstars/Michael_Olise_main.webp" },
  { id: "christian-pulisic", name: "Pulisic", image: "/player-stories/26_superstars/Christian_Pulisic_main.webp" },
];

type AvatarPickerProps = {
  catalog: UserPreferenceCatalog;
  selectedPlayerId: string;
  customAvatarUrl: string;
  onPlayerSelect: (id: string) => void;
  onCustomAvatarUrlChange: (url: string) => void;
  onUploadError?: (message: string) => void;
};

type AvatarUploadPayload = {
  uploadUrl: string;
  publicUrl: string;
  method: "PUT";
  headers: Record<string, string>;
};

export function AvatarPicker({ selectedPlayerId, customAvatarUrl, onPlayerSelect, onCustomAvatarUrlChange, onUploadError }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const avatarPlayers = useMemo(() => SUPERSTAR_AVATARS, []);
  const selectedAvatar = customAvatarUrl
    ? { name: "自定义", image: customAvatarUrl }
    : avatarPlayers.find((player) => player.id === selectedPlayerId) ?? avatarPlayers[0];

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) return onUploadError?.("请选择图片文件");
    if (file.size > 3 * 1024 * 1024) return onUploadError?.("头像图片不能超过 3MB");

    setUploading(true);
    try {
      const upload = await userApi<AvatarUploadPayload>("/api/avatar/upload-url", {
        method: "POST",
        body: JSON.stringify({ contentType: file.type, fileName: file.name }),
      });
      const response = await fetch(upload.uploadUrl, {
        method: upload.method,
        headers: upload.headers,
        body: file,
      });
      if (!response.ok) throw new Error("avatar_upload_failed");
      onCustomAvatarUrlChange(upload.publicUrl);
    } catch (error) {
      onUploadError?.(readUploadError(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="sm:col-span-2 rounded-[1.5rem] bg-white/[0.035] p-3 ring-1 ring-white/10">
      <div className="grid gap-3 sm:grid-cols-[92px_minmax(0,1fr)]">
        <div className="grid justify-items-center gap-2 rounded-[1.15rem] bg-black/24 p-3 ring-1 ring-white/[0.08]">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white/[0.06] ring-2 ring-volt/55">
            <Image src={selectedAvatar.image} alt={selectedAvatar.name} fill sizes="64px" className="object-cover" />
          </div>
          <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-[0.08em] text-white/58">
            {selectedAvatar.name}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">选择头像</p>
              <p className="mt-0.5 text-xs text-white/40">内置 26 位巨星头像，也可以上传自己的头像。</p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-bold transition ${
                customAvatarUrl ? "bg-volt text-black" : "bg-white/[0.06] text-white/68 ring-1 ring-white/10 hover:bg-white/[0.1] hover:text-white"
              } disabled:opacity-60`}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "上传中" : customAvatarUrl ? "已上传" : "上传"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
          </div>

          {customAvatarUrl && (
            <button
              type="button"
              onClick={() => onCustomAvatarUrlChange("")}
              className="mt-3 w-full truncate rounded-2xl bg-volt/10 px-3 py-2 text-left text-xs font-semibold text-volt ring-1 ring-volt/25"
            >
              使用自定义头像，点击可切回内置头像
            </button>
          )}

          <div className="mt-3 grid grid-cols-7 gap-2 sm:grid-cols-9 xl:grid-cols-[repeat(13,minmax(0,1fr))]">
            {avatarPlayers.map((player) => {
              const active = !customAvatarUrl && selectedPlayerId === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  title={player.name}
                  onClick={() => {
                    onCustomAvatarUrlChange("");
                    onPlayerSelect(player.id);
                  }}
                  className={`relative h-10 w-10 overflow-hidden rounded-full transition ${
                    active
                      ? "scale-105 ring-2 ring-volt shadow-[0_0_24px_rgba(216,255,62,.18)]"
                      : "ring-1 ring-white/12 hover:scale-105 hover:ring-volt/45"
                  }`}
                >
                  <Image src={player.image} alt={player.name} fill sizes="40px" className="object-cover" />
                  {active && <span className="absolute inset-0 rounded-full ring-2 ring-inset ring-black/30" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function readUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("r2_not_configured")) return "R2 还没有配置，稍后设置环境变量后即可上传。";
  if (message.includes("invalid_avatar_type")) return "只支持 PNG、JPG、WebP 或 GIF 图片。";
  return "头像上传失败，请稍后再试。";
}
