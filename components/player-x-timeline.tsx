"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import React from "react";
import type { PlayerXTimelineItem } from "@/lib/player-x-timeline";

export function PlayerXTimeline({
  items,
  configured,
  warning,
  loading,
  compact = false,
  showHeader = true,
}: {
  items: PlayerXTimelineItem[];
  configured?: boolean;
  warning?: string;
  loading?: boolean;
  compact?: boolean;
  showHeader?: boolean;
}) {
  const statusText = loading
    ? "Syncing X updates..."
    : !configured
      ? "Set X_BEARER_TOKEN to enable live sync"
      : warning === "no_mapped_players"
        ? "Add X handles for followed players"
        : items.length
          ? "Live X"
          : "No recent X posts";

  return (
    <section className="min-w-0 space-y-4 overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-volt/55">Player Pulse</p>
            <h2 className="mt-1 text-base font-semibold text-white">X Timeline</h2>
          </div>
          <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-bold text-white/42">
            {statusText}
          </span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white/[0.025] px-4 py-8 text-center text-sm font-semibold text-white/42 ring-1 ring-white/[0.06]">
          Loading player signals
        </div>
      ) : items.length ? (
        <div className="space-y-3">
          {items.slice(0, compact ? 4 : 8).map((item, index) => (
            <XTimelineCard key={`${item.playerId}-${item.id}`} item={item} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.025] px-4 py-8 text-center text-sm font-semibold text-white/42 ring-1 ring-white/[0.06]">
          {statusText}
        </div>
      )}
    </section>
  );
}

function XTimelineCard({ item, index }: { item: PlayerXTimelineItem; index: number }) {
  const hasMedia = Boolean(item.media?.some(hasRenderableMedia));

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.42 }}
      className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] transition-colors duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.1]">
          {item.playerPhoto ? <img src={item.playerPhoto} alt={item.playerName} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{item.playerName}</p>
          <p className="truncate text-xs text-white/36">@{item.username} · {formatXTime(item.createdAt)}</p>
        </div>
      </div>
      <p className="px-4 pb-3 text-sm leading-6 text-white/68 sm:px-5">{linkifyText(item.text, hasMedia)}</p>
      <TimelineMediaGrid item={item} />
      <div className="flex items-center gap-4 border-t border-white/[0.04] px-4 py-2.5 text-[11px] font-semibold text-white/34 sm:px-5">
        <Metric icon={<Heart className="h-3.5 w-3.5" />} value={item.metrics?.likes} />
        <Metric icon={<Repeat2 className="h-3.5 w-3.5" />} value={item.metrics?.reposts} />
        <Metric icon={<MessageCircle className="h-3.5 w-3.5" />} value={item.metrics?.replies} />
      </div>
    </motion.article>
  );
}

function Metric({ icon, value }: { icon: React.ReactNode; value?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {formatMetric(value)}
    </span>
  );
}

function TimelineMediaGrid({ item }: { item: PlayerXTimelineItem }) {
  const mediaItems = (item.media ?? []).filter(hasRenderableMedia);
  if (!mediaItems.length) return null;

  return (
    <div className={`grid gap-2 px-4 pb-3 sm:px-5 ${mediaItems.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {mediaItems.slice(0, 4).map((media, index) => {
        const mediaClassName = `w-full object-cover ${mediaItems.length > 1 ? "aspect-square" : "max-h-[420px] aspect-[16/10]"}`;

        return (
          <div key={`${item.id}-media-${index}`} className="relative overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
            {media.type === "photo" || !media.videoUrl ? (
              <img src={media.url ?? media.previewImageUrl} alt="" className={mediaClassName} />
            ) : media.videoUrl ? (
              <video
                src={media.videoUrl}
                poster={media.previewImageUrl}
                controls={media.type === "video"}
                playsInline
                preload="metadata"
                muted={media.type === "animated_gif"}
                loop={media.type === "animated_gif"}
                autoPlay={media.type === "animated_gif"}
                className={mediaClassName}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function hasRenderableMedia(media: NonNullable<PlayerXTimelineItem["media"]>[number]) {
  if (media.type === "photo") return Boolean(media.url);
  return Boolean(media.videoUrl || media.previewImageUrl);
}

function linkifyText(text: string, hideMediaLinks = false) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);

  return parts.map((part, index) => {
    if (!part.startsWith("http://") && !part.startsWith("https://")) return <React.Fragment key={index}>{part}</React.Fragment>;
    const href = part.replace(/[),.;!?]+$/, "");
    const suffix = part.slice(href.length);
    if (hideMediaLinks && href.startsWith("https://t.co/")) return <React.Fragment key={index}>{suffix}</React.Fragment>;
    return (
      <React.Fragment key={index}>
        <a href={href} target="_blank" rel="noreferrer" className="text-volt/90 underline decoration-volt/30 underline-offset-4 transition hover:text-volt">
          {href}
        </a>
        {suffix}
      </React.Fragment>
    );
  });
}

function formatMetric(value?: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatXTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "X";
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  if (diff < minute) return "now";
  if (diff < 60 * minute) return `${Math.floor(diff / minute)}m`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))}h`;
  return new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
