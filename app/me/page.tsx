"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Bookmark,
  Eye,
  LogOut,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { userApi, type PublicUser, type UserHomePayload } from "@/lib/user-system";

const featuredTeams = [
  { id: "ARG", name: "阿根廷", region: "CONMEBOL" },
  { id: "BRA", name: "巴西", region: "CONMEBOL" },
  { id: "FRA", name: "法国", region: "UEFA" },
  { id: "ENG", name: "英格兰", region: "UEFA" },
];

const featuredPlayers = [
  { id: "lionel-messi", name: "Lionel Messi", team: "阿根廷", position: "Forward" },
  { id: "kylian-mbappe", name: "Kylian Mbappe", team: "法国", position: "Forward" },
  { id: "jude-bellingham", name: "Jude Bellingham", team: "英格兰", position: "Midfielder" },
  { id: "vinicius-junior", name: "Vinicius Junior", team: "巴西", position: "Forward" },
];

const sampleMatch = {
  id: "opening-match",
  matchId: "opening-match",
  title: "揭幕战 · 2026 世界杯",
  stage: "小组赛",
  startsAt: "2026-06-11T19:00:00-05:00",
};

export default function MePage() {
  const [home, setHome] = useState<UserHomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@worldcup.local");
  const [password, setPassword] = useState("worldcup2026");
  const [displayName, setDisplayName] = useState("World Cup Pilot");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function loadHome() {
    try {
      setLoading(true);
      setHome(await userApi<UserHomePayload>("/api/me/home", { cache: "no-store" }));
      setError("");
    } catch {
      setHome(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(mode);
    setError("");

    try {
      await userApi<{ user: PublicUser }>(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      await loadHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await userApi("/api/auth/logout", { method: "POST", body: "{}" });
      setHome(null);
    } finally {
      setBusy("");
    }
  }

  async function mutate(path: string, body: unknown, label: string) {
    setBusy(label);
    setError("");
    try {
      await userApi(path, { method: "POST", body: JSON.stringify(body) });
      await loadHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy("");
    }
  }

  return (
    <DashboardShell>
      <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="hero-shell overflow-hidden p-5 sm:p-7 lg:p-8"
        >
          <div className="relative z-10 flex flex-col gap-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="glass-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-volt">
                  <Sparkles className="h-3.5 w-3.5" />
                  MY WORLD CUP
                </div>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  我的世界杯主页
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/58">
                  {home
                    ? `${home.user.profile.displayName} 的关注、提醒、预测和观看记录。`
                    : "登录后同步关注、提醒、预测和订阅。"}
                </p>
              </div>

              {home && (
                <button
                  type="button"
                  onClick={logout}
                  disabled={busy === "logout"}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-white/72 shadow-glass transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              )}
            </div>

            {home ? (
              <UserCommandCenter home={home} busy={busy} onMutate={mutate} />
            ) : (
              <AuthPanel
                mode={mode}
                email={email}
                password={password}
                displayName={displayName}
                busy={busy}
                error={error}
                loading={loading}
                onModeChange={setMode}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onDisplayNameChange={setDisplayName}
                onSubmit={submitAuth}
              />
            )}
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="hero-card p-5 sm:p-6"
        >
          <div className="relative z-10 flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-white/36">Personal Signal</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">赛事雷达</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-volt/12 text-volt shadow-[0_0_28px_rgba(216,255,62,.18)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <SignalRail home={home} loading={loading} />
          </div>
        </motion.aside>
      </section>
    </DashboardShell>
  );
}

function AuthPanel(props: {
  mode: "login" | "register";
  email: string;
  password: string;
  displayName: string;
  busy: string;
  error: string;
  loading: boolean;
  onModeChange: (mode: "login" | "register") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="grid gap-4 rounded-[1.5rem] bg-white/[0.035] p-4 shadow-glass sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2 flex rounded-full bg-black/24 p-1">
        {(["login", "register"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => props.onModeChange(mode)}
            className={`h-10 flex-1 rounded-full text-sm font-semibold transition ${
              props.mode === mode
                ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.22)]"
                : "text-white/48 hover:text-white"
            }`}
          >
            {mode === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>

      {props.mode === "register" && (
        <label className="sm:col-span-2 grid gap-2 text-sm text-white/52">
          昵称
          <input
            value={props.displayName}
            onChange={(event) => props.onDisplayNameChange(event.target.value)}
            className="h-12 rounded-2xl bg-black/24 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
          />
        </label>
      )}

      <label className="grid gap-2 text-sm text-white/52">
        邮箱
        <input
          type="email"
          value={props.email}
          onChange={(event) => props.onEmailChange(event.target.value)}
          className="h-12 rounded-2xl bg-black/24 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
        />
      </label>

      <label className="grid gap-2 text-sm text-white/52">
        密码
        <input
          type="password"
          value={props.password}
          onChange={(event) => props.onPasswordChange(event.target.value)}
          className="h-12 rounded-2xl bg-black/24 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
        />
      </label>

      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-flare/80">{props.error}</p>
        <button
          type="submit"
          disabled={Boolean(props.busy) || props.loading}
          className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-full bg-volt px-5 text-sm font-bold text-black shadow-[0_0_30px_rgba(216,255,62,.2)] transition hover:scale-[1.02] disabled:opacity-60"
        >
          <UserRound className="h-4 w-4" />
          {props.busy ? "同步中" : props.mode === "login" ? "进入主页" : "创建主页"}
        </button>
      </div>
    </form>
  );
}

function UserCommandCenter({
  home,
  busy,
  onMutate,
}: {
  home: UserHomePayload;
  busy: string;
  onMutate: (path: string, body: unknown, label: string) => Promise<void>;
}) {
  const nextTeam = useMemo(
    () => featuredTeams.find((team) => !home.user.followedTeams.some((item) => item.id === team.id)) ?? featuredTeams[0],
    [home.user.followedTeams]
  );
  const nextPlayer = useMemo(
    () => featuredPlayers.find((player) => !home.user.followedPlayers.some((item) => item.id === player.id)) ?? featuredPlayers[0],
    [home.user.followedPlayers]
  );

  const actions = [
    {
      label: `关注 ${nextTeam.name}`,
      icon: Trophy,
      busyKey: "team",
      onClick: () => onMutate("/api/me/follow/team", nextTeam, "team"),
    },
    {
      label: `关注 ${nextPlayer.name}`,
      icon: Star,
      busyKey: "player",
      onClick: () => onMutate("/api/me/follow/player", nextPlayer, "player"),
    },
    {
      label: "收藏揭幕战",
      icon: Bookmark,
      busyKey: "favorite",
      onClick: () => onMutate("/api/me/favorite-match", sampleMatch, "favorite"),
    },
    {
      label: "设置提醒",
      icon: Bell,
      busyKey: "reminder",
      onClick: () => onMutate("/api/me/reminder", { ...sampleMatch, remindBeforeMinutes: 30, channel: "site", enabled: true }, "reminder"),
    },
    {
      label: "提交预测",
      icon: Target,
      busyKey: "prediction",
      onClick: () => onMutate("/api/me/prediction", { ...sampleMatch, homeScore: 2, awayScore: 1, confidence: 68 }, "prediction"),
    },
    {
      label: "记录观看",
      icon: Eye,
      busyKey: "watch",
      onClick: () => onMutate("/api/me/watch-record", { ...sampleMatch, status: "planned" }, "watch"),
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={Users} label="关注" value={home.summary.followedTeamCount + home.summary.followedPlayerCount} />
        <MetricCard icon={Bell} label="提醒" value={home.summary.enabledReminderCount} />
        <MetricCard icon={Target} label="预测" value={home.summary.predictionCount} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={busy === action.busyKey}
            className="group flex min-h-20 items-center justify-between gap-3 rounded-[1.35rem] bg-white/[0.045] px-4 text-left shadow-glass transition hover:-translate-y-0.5 hover:bg-white/[0.075] disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-semibold text-white">{action.label}</span>
              <span className="mt-1 block text-xs uppercase text-white/32">{busy === action.busyKey ? "SYNCING" : "READY"}</span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/24 text-volt transition group-hover:bg-volt group-hover:text-black">
              <action.icon className="h-5 w-5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-[1.35rem] bg-white/[0.045] p-4 shadow-glass">
      <div className="flex items-center justify-between text-white/42">
        <span className="text-xs font-semibold uppercase">{label}</span>
        <Icon className="h-4 w-4 text-volt" />
      </div>
      <strong className="mt-4 block text-3xl font-semibold text-white tabular">{value}</strong>
    </div>
  );
}

function SignalRail({ home, loading }: { home: UserHomePayload | null; loading: boolean }) {
  const rows = home
    ? [
        { label: "收藏比赛", value: home.summary.favoriteMatchCount, icon: Bookmark },
        { label: "观看记录", value: home.summary.watchedMatchCount, icon: Eye },
        { label: "新闻订阅", value: home.summary.activeNewsTopicCount, icon: Newspaper },
      ]
    : [
        { label: "收藏比赛", value: loading ? "--" : 0, icon: Bookmark },
        { label: "观看记录", value: loading ? "--" : 0, icon: Eye },
        { label: "新闻订阅", value: loading ? "--" : 0, icon: Newspaper },
      ];

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between rounded-[1.35rem] bg-white/[0.04] p-4 shadow-glass">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/24 text-volt">
              <row.icon className="h-5 w-5" />
            </span>
            <span className="font-semibold text-white/82">{row.label}</span>
          </div>
          <strong className="text-2xl font-semibold text-white tabular">{row.value}</strong>
        </div>
      ))}

      <div className="mt-2 rounded-[1.35rem] bg-volt/[0.08] p-4 ring-1 ring-volt/15">
        <p className="text-xs font-semibold uppercase text-volt/80">Profile Layer</p>
        <p className="mt-3 text-sm leading-6 text-white/58">
          {home ? `${home.user.email} · ${home.user.profile.timezone}` : "Auth · Preferences · Reminders"}
        </p>
      </div>
    </div>
  );
}
