"use client";

import { AlertCircle, Clipboard, Download, ExternalLink, Play, Radio, RadioTower, RotateCcw, Tv } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLiveChannels, type LiveChannel } from "@/lib/live-channels";
import type { MatchDetail } from "@/types/match";
import type Artplayer from "artplayer";
import type { Option as ArtPlayerOption } from "artplayer";

type PlayerState = "idle" | "loading" | "ready" | "unsupported" | "error";
type HlsConstructor = typeof import("hls.js").default;
type HlsInstance = InstanceType<HlsConstructor>;
type ArtPlayerConstructor = typeof import("artplayer").default;

export function LivePlayer({ detail }: { detail: MatchDetail }) {
  const playerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [message, setMessage] = useState("等待直播源");
  const [copyNotice, setCopyNotice] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingChannels(true);

    fetchLiveChannels(detail.slug)
      .then((items) => {
        if (!active) return;
        setChannels(items);
        setSelectedId((current) => current || items[0]?.id || "");
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "直播通道读取失败");
      })
      .finally(() => {
        if (active) setLoadingChannels(false);
      });

    return () => {
      active = false;
    };
  }, [detail.slug]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedId) ?? channels[0],
    [channels, selectedId]
  );
  const isExternalPlayer = activeChannel?.playbackMode === "external";

  const copyStreamUrl = async () => {
    if (!activeChannel?.streamUrl) return;
    try {
      await navigator.clipboard.writeText(activeChannel.streamUrl);
      setCopyNotice("已复制直播地址");
    } catch {
      setCopyNotice("复制失败，请手动复制地址");
    }
    window.setTimeout(() => setCopyNotice(""), 1800);
  };

  const downloadPlaylist = () => {
    if (!activeChannel?.streamUrl) return;
    const title = `${detail.match.summary} - ${activeChannel.name}`.replace(/\s+/g, " ").trim();
    const playlist = `#EXTM3U\n#EXTINF:-1,${title}\n${activeChannel.streamUrl}\n`;
    const blob = new Blob([playlist], { type: "audio/x-mpegurl;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${detail.slug}-${activeChannel.id}.m3u`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  const openExternalPlayer = () => {
    if (!activeChannel?.streamUrl) return;
    window.open(activeChannel.streamUrl, "_blank", "noopener,noreferrer");
  };

  const externalPlayerLinks = useMemo(() => {
    const url = activeChannel?.streamUrl || "";
    const encodedUrl = encodeURIComponent(url);
    return [
      { name: "IINA", href: `iina://weblink?url=${encodedUrl}`, icon: "/player-icons/iina.webp" },
      { name: "PotPlayer", href: `potplayer://${url}`, icon: "/player-icons/potplayer.webp" },
      { name: "VLC", href: `vlc://${url}`, icon: "/player-icons/vlc.webp" },
      { name: "nPlayer", href: `nplayer-${url}`, icon: "/player-icons/nplayer.webp" },
      { name: "MX Player", href: buildMxPlayerIntent(url, detail.match.summary), icon: "/player-icons/mxplayer.webp" },
    ];
  }, [activeChannel?.streamUrl, detail.match.summary]);

  const destroyPlayer = () => {
    artRef.current?.destroy(false);
    artRef.current = null;
    hlsRef.current?.destroy();
    hlsRef.current = null;
  };

  const loadStream = async () => {
    if (isExternalPlayer) {
      destroyPlayer();
      setPlayerState("idle");
      setMessage("请使用外部播放器打开直播源");
      return;
    }

    const container = playerRef.current;
    if (!container || !activeChannel?.streamUrl) return;

    destroyPlayer();
    setPlayerState("loading");
    setMessage("正在接入直播信号");

    const ArtPlayer = await loadArtPlayer();
    if (!ArtPlayer) {
      setPlayerState("unsupported");
      setMessage("播放器加载失败");
      return;
    }

    const art = new ArtPlayer({
      container,
      url: activeChannel.streamUrl,
      type: "m3u8",
      autoplay: false,
      muted: true,
      isLive: true,
      fullscreen: true,
      fullscreenWeb: true,
      pip: true,
      theme: "#d8ff3e",
      volume: 0.75,
      moreVideoAttr: {
        playsInline: true,
        crossOrigin: "anonymous",
      },
      customType: {
        m3u8: playHlsStream,
      },
    } satisfies ArtPlayerOption);

    artRef.current = art;
    art.on("ready", () => {
      setPlayerState("ready");
      setMessage("直播信号已连接");
    });
    art.on("video:error", () => {
      setPlayerState("error");
      setMessage("直播加载失败，请更换支持 HTTPS/CORS 的 m3u8 源");
    });
  };

  useEffect(() => {
    loadStream();
    return destroyPlayer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id, activeChannel?.streamUrl, isExternalPlayer]);

  const hasStream = Boolean(activeChannel?.streamUrl);

  return (
    <section className="hero-card overflow-hidden rounded-[2rem] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-volt/80">
            <RadioTower className="h-4 w-4" />
            Live Studio
          </div>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">直播通道</h2>
        </div>
        <div className="glass-chip flex items-center gap-2 px-3 py-2 text-xs text-white/62">
          <span className={`h-2 w-2 rounded-full ${playerState === "ready" ? "bg-volt" : "bg-white/30"}`} />
          {loadingChannels ? "读取通道中" : message}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid gap-3">
          <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.08]">
            <div ref={playerRef} className="h-full w-full bg-black" />

            {!hasStream && (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(216,255,62,0.12),transparent_42%),rgba(0,0,0,0.86)] px-6 text-center">
                <div>
                  <Tv className="mx-auto h-9 w-9 text-volt/80" />
                  <p className="mt-3 text-sm font-semibold text-white">直播通道暂未开启</p>
                </div>
              </div>
            )}

            {hasStream && isExternalPlayer && (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(216,255,62,0.10),transparent_42%),rgba(0,0,0,0.88)]">
                <Tv className="h-10 w-10 text-volt/80" />
              </div>
            )}

            {playerState === "error" || playerState === "unsupported" ? (
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/72 p-3 text-xs text-white/70 backdrop-blur-xl ring-1 ring-white/[0.08]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <span>{message}</span>
                </div>
              </div>
            ) : null}
          </div>

          {hasStream && isExternalPlayer && (
            <div className="rounded-[1.35rem] bg-white/[0.035] px-3 py-3 ring-1 ring-white/[0.08]">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {externalPlayerLinks.map((player) => (
                  <a
                    key={player.name}
                    href={player.href}
                    aria-label={player.name}
                    title={player.name}
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.07] transition hover:-translate-y-0.5 hover:bg-white/[0.12] hover:shadow-[0_0_24px_rgba(216,255,62,0.16)]"
                  >
                    <img src={player.icon} alt="" className="h-8 w-8 object-contain" loading="lazy" />
                  </a>
                ))}
                <button
                  type="button"
                  onClick={openExternalPlayer}
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.07] text-white/72 transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
                  aria-label="系统默认"
                  title="系统默认"
                >
                  <ExternalLink className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={copyStreamUrl}
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.07] text-white/72 transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
                  aria-label="复制地址"
                  title="复制地址"
                >
                  <Clipboard className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={downloadPlaylist}
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.07] text-white/72 transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
                  aria-label="下载 .m3u"
                  title="下载 .m3u"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
              {copyNotice && <p className="mt-2 text-center text-xs font-semibold text-volt">{copyNotice}</p>}
            </div>
          )}
        </div>

        <aside className="rounded-[1.5rem] bg-white/[0.035] p-3 ring-1 ring-white/[0.08]">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">Channels</span>
            <button
              type="button"
              onClick={loadStream}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/60 transition hover:bg-volt hover:text-black"
              aria-label="重新加载直播"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2">
            {channels.length ? channels.map((channel) => {
              const active = channel.id === activeChannel?.id;
              const modeLabel = channel.playbackMode === "external" ? "外部播放器" : "网页播放";
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedId(channel.id)}
                  className={`rounded-2xl p-3 text-left transition ${
                    active
                      ? "bg-volt text-black shadow-[0_0_28px_rgba(216,255,62,0.16)]"
                      : "bg-black/24 text-white/72 ring-1 ring-white/[0.07] hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    {active ? <Play className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                    {channel.name}
                  </span>
                  <span className={`mt-1 block text-xs ${active ? "text-black/62" : "text-white/38"}`}>
                    {modeLabel} · {channel.streamUrl ? "已配置" : "待填入"}
                  </span>
                </button>
              );
            }) : (
              <div className="rounded-2xl bg-black/24 p-4 text-sm text-white/50 ring-1 ring-white/[0.07]">
                暂无启用的直播通道
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );

  async function playHlsStream(video: HTMLVideoElement, url: string) {
    const Hls = await loadHls();

    if (Hls?.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerState("ready");
        setMessage("直播信号已连接");
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        setPlayerState("error");
        setMessage(
          data.details === "manifestLoadError"
            ? "直播源不支持浏览器直连，请更换支持 HTTPS/CORS 的 m3u8 源"
            : data.details || "直播加载失败"
        );
        hls.destroy();
        hlsRef.current = null;
      });
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.load();
      setPlayerState("ready");
      setMessage("原生 HLS 播放");
      return;
    }

    setPlayerState("unsupported");
    setMessage("当前浏览器不支持 HLS 播放");
  }
}

let hlsLoader: Promise<HlsConstructor | null> | null = null;
let artPlayerLoader: Promise<ArtPlayerConstructor | null> | null = null;

function loadHls() {
  hlsLoader ??= import("hls.js")
    .then((mod) => mod.default)
    .catch(() => null);

  return hlsLoader;
}

function loadArtPlayer() {
  artPlayerLoader ??= import("artplayer")
    .then((mod) => mod.default)
    .catch(() => null);

  return artPlayerLoader;
}

function buildMxPlayerIntent(url: string, title: string) {
  return `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(title)};end`;
}
