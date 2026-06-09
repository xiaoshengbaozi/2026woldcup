"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogIn, Trophy, UserPlus, UserRound, X } from "lucide-react";
import {
  fallbackUserPreferenceCatalog,
  getPlayerAvatar,
  type UserPreferenceCatalog,
  type UserPreferencePlayer,
  type UserPreferenceTeam,
} from "@/lib/user-preferences";
import { injectMockData } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { getFlagCode } from "@/lib/world-cup-2026";
import { userApi } from "@/lib/user-system";
import { AvatarPicker } from "@/components/avatar-picker";

export type SharedAuthMode = "login" | "register";
type RegisterStep = "account" | "preferences";

const SUPERSTAR_NAMES = [
  "Lionel Messi", "Kylian Mbappe", "Erling Haaland", "Vinicius Junior", "Jude Bellingham", "Harry Kane",
  "Cristiano Ronaldo", "Neymar", "Mohamed Salah", "Kevin De Bruyne", "Lautaro Martinez", "Antoine Griezmann",
  "Bukayo Saka", "Phil Foden", "Rodri", "Pedri", "Jamal Musiala", "Florian Wirtz", "Bruno Fernandes",
  "Federico Valverde", "Luka Modric", "Raphinha", "Julian Alvarez", "Khvicha Kvaratskhelia", "Victor Osimhen",
  "Heung-min Son",
];

const WONDERKID_NAMES = [
  "Lamine Yamal", "Endrick", "Estevao", "Arda Guler", "Kobbie Mainoo", "Pau Cubarsi", "Joao Neves",
  "Warren Zaire-Emery", "Claudio Echeverri",
];

type MeAuthDialogProps = {
  mode: SharedAuthMode | null;
  onClose: () => void;
  onAuthenticated?: () => void;
};

export function MeAuthDialog({ mode, onClose, onAuthenticated }: MeAuthDialogProps) {
  const [currentMode, setCurrentMode] = useState<SharedAuthMode | null>(mode);
  const [catalog, setCatalog] = useState<UserPreferenceCatalog>(fallbackUserPreferenceCatalog);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("account");
  const [email, setEmail] = useState("demo@worldcup.local");
  const [password, setPassword] = useState("worldcup2026");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(compactIds(fallbackUserPreferenceCatalog.teams[0]?.id));
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(["lionel-messi"]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [postRegisterPrompt, setPostRegisterPrompt] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const countries = useStore((state) => state.countries);
  const countryCount = countries.size;

  const avatarPlayerId = selectedPlayerIds[0] ?? catalog.players[0]?.id ?? fallbackUserPreferenceCatalog.players[0]?.id;

  useEffect(() => {
    if (!mode) return;
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!currentMode) return;
    let active = true;
    userApi<UserPreferenceCatalog>("/api/user-preferences", { cache: "no-store" })
      .then((payload) => {
        if (!active) return;
        setCatalog(payload);
        setSelectedTeamIds((value) => (value.length ? value : compactIds(payload.teams[0]?.id)));
        setSelectedPlayerIds((value) => (value.length ? value : ["lionel-messi"]));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentMode]);

  useEffect(() => {
    if (!mode || countryCount > 0) return;
    injectMockData();
  }, [countryCount, mode]);

  useEffect(() => {
    if (!currentMode) return;
    setRegisterStep("account");
    setError("");
    if (currentMode === "register") {
      setEmail("");
      setPassword("");
      setRepeatPassword("");
      setInvitationCode("");
      setDisplayName("");
      setCustomAvatarUrl("");
      setPostRegisterPrompt(false);
    }
  }, [currentMode]);

  const recommendedTeams = useMemo(() => buildRecommendedTeams(catalog, countries), [catalog, countries]);
  const recommendedPlayers = useMemo(() => buildRecommendedPlayers(catalog), [catalog]);

  const followedTeams = useMemo(() => catalog.teams.filter((team) => selectedTeamIds.includes(team.id)), [catalog.teams, selectedTeamIds]);
  const followedPlayers = useMemo(
    () =>
      catalog.players
        .filter((player) => selectedPlayerIds.includes(player.id))
        .map(({ avatar, ...player }) => player),
    [catalog.players, selectedPlayerIds]
  );

  function close() {
    if (busy) return;
    onClose();
  }

  function applyRecommendedSelection() {
    setSelectedTeamIds(recommendedTeams.map((team) => team.id));
    setSelectedPlayerIds(recommendedPlayers.map((player) => player.id));
  }

  async function applyRecommendedPack() {
    applyRecommendedSelection();
    await savePreferences(recommendedTeams, recommendedPlayers);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setError("");

    try {
      await userApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setError(readableError(err, "登录失败，请检查邮箱和密码"));
    } finally {
      setBusy("");
    }
  }

  async function submitRegisterAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!displayName.trim()) return setError("请填写昵称");
    if (!email.trim()) return setError("请填写邮箱");
    if (!isValidEmail(email)) return setError("请输入有效的邮箱地址");
    if (!password) return setError("请填写密码");
    if (password.length < 8) return setError("密码至少需要 8 位");
    if (password !== repeatPassword) return setError("两次输入的密码不一致");
    if (!invitationCode.trim()) return setError("请填写赛波码");

    setBusy("register");
    try {
      await userApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          invitationCode: invitationCode.trim(),
          displayName: displayName.trim(),
          avatarPlayerId,
          avatarUrl: customAvatarUrl || undefined,
        }),
      });
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setError(readableError(err, "注册失败，请稍后再试"));
    } finally {
      setBusy("");
    }
  }

  async function savePreferences(teams = followedTeams, players = followedPlayers) {
    setBusy("preferences");
    setError("");

    try {
      const matches = inferFavoriteMatches(catalog, teams, players);
      const nextAvatarPlayerId = players[0]?.id ?? avatarPlayerId;
      await Promise.all([
        nextAvatarPlayerId ? userApi("/api/me/profile", { method: "PATCH", body: JSON.stringify({ avatarPlayerId: nextAvatarPlayerId }) }) : Promise.resolve(),
        ...teams.map((team) => userApi("/api/me/follow/team", { method: "POST", body: JSON.stringify(team) })),
        ...players.map((player) => userApi("/api/me/follow/player", { method: "POST", body: JSON.stringify(player) })),
        ...matches.map((match) => userApi("/api/me/favorite-match", { method: "POST", body: JSON.stringify(match) })),
      ]);
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setError(readableError(err, "保存关注失败，请稍后再试"));
    } finally {
      setBusy("");
    }
  }

  function skipPreferences() {
    onAuthenticated?.();
    onClose();
  }

  return (
    <AnimatePresence>
      {mode && currentMode && (
        <AuthModal mode={currentMode} registerStep={registerStep} onClose={close}>
          {currentMode === "login" ? (
            <LoginForm
              email={email}
              password={password}
              busy={busy}
              error={error}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSwitchToRegister={() => {
                setError("");
                setCurrentMode("register");
              }}
              onSubmit={submitLogin}
            />
          ) : registerStep === "account" ? (
            <RegisterAccountForm
              displayName={displayName}
              email={email}
              password={password}
              repeatPassword={repeatPassword}
              invitationCode={invitationCode}
              catalog={catalog}
              avatarPlayerId={avatarPlayerId}
              customAvatarUrl={customAvatarUrl}
              error={error}
              onDisplayNameChange={setDisplayName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onRepeatPasswordChange={setRepeatPassword}
              onInvitationCodeChange={setInvitationCode}
              onAvatarPlayerChange={(id) => setSelectedPlayerIds(compactIds(id))}
              onCustomAvatarUrlChange={setCustomAvatarUrl}
              onUploadError={setError}
              onSwitchToLogin={() => {
                setError("");
                setRegisterStep("account");
                setCurrentMode("login");
              }}
              onSubmit={submitRegisterAccount}
            />
          ) : (
            <RegisterPreferences
              catalog={catalog}
              selectedTeamIds={selectedTeamIds}
              selectedPlayerIds={selectedPlayerIds}
              busy={busy}
              error={error}
              onBack={() => {
                setRegisterStep("account");
                setError("");
              }}
              onTeamToggle={(id) => setSelectedTeamIds((value) => toggleValue(value, id))}
              onPlayerToggle={(id) => setSelectedPlayerIds((value) => toggleValue(value, id))}
              onSubmit={() => savePreferences()}
            />
          )}
        </AuthModal>
      )}
    </AnimatePresence>
  );
}

function AuthModal({ mode, registerStep, onClose, children }: { mode: SharedAuthMode; registerStep: RegisterStep; onClose: () => void; children: ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const wide = mode === "register" || registerStep === "preferences";

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;

    const preventBackgroundTouch = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && modalRef.current?.contains(target)) return;
      event.preventDefault();
    };

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.addEventListener("touchmove", preventBackgroundTouch, { passive: false, capture: true });

    return () => {
      document.removeEventListener("touchmove", preventBackgroundTouch, { capture: true });
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, []);

  return (
    <motion.div className="fixed inset-0 z-[500] grid place-items-center overflow-hidden bg-black/72 px-4 py-6 backdrop-blur-xl sm:py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`hero-card relative max-h-[calc(100dvh-3rem)] w-full overflow-hidden px-4 py-5 sm:px-7 sm:py-7 ${wide ? "max-w-4xl" : "max-w-lg"}`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />
        <div className="relative mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-volt/80">{mode === "login" ? "SIGN IN" : registerStep === "account" ? "CREATE ACCOUNT" : "PREFERENCES"}</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{mode === "login" ? "登录个人主页" : registerStep === "account" ? "创建个人主页" : "设置关注偏好"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/58 transition hover:bg-white/[0.1] hover:text-white" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative -mx-1 max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain px-1 pb-1">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function LoginForm({
  email,
  password,
  busy,
  error,
  onEmailChange,
  onPasswordChange,
  onSwitchToRegister,
  onSubmit,
}: {
  email: string;
  password: string;
  busy: string;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSwitchToRegister: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <AuthInput label="邮箱" type="email" value={email} required onChange={onEmailChange} />
      <AuthInput label="密码" type="password" value={password} required onChange={onPasswordChange} />
      <ModalFooter error={error}>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton type="button" disabled={Boolean(busy)} onClick={onSwitchToRegister}>
            <UserPlus className="h-4 w-4" />
            注册
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={Boolean(busy)}>
            <UserRound className="h-4 w-4" />
            {busy === "login" ? "登录中" : "进入主页"}
          </PrimaryButton>
        </div>
      </ModalFooter>
    </form>
  );
}

function RegisterAccountForm({
  displayName,
  email,
  password,
  repeatPassword,
  invitationCode,
  catalog,
  avatarPlayerId,
  customAvatarUrl,
  error,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onRepeatPasswordChange,
  onInvitationCodeChange,
  onAvatarPlayerChange,
  onCustomAvatarUrlChange,
  onUploadError,
  onSwitchToLogin,
  onSubmit,
}: {
  displayName: string;
  email: string;
  password: string;
  repeatPassword: string;
  invitationCode: string;
  catalog: UserPreferenceCatalog;
  avatarPlayerId: string;
  customAvatarUrl: string;
  error: string;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRepeatPasswordChange: (value: string) => void;
  onInvitationCodeChange: (value: string) => void;
  onAvatarPlayerChange: (value: string) => void;
  onCustomAvatarUrlChange: (value: string) => void;
  onUploadError: (value: string) => void;
  onSwitchToLogin: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <AuthInput label="昵称" value={displayName} required onChange={onDisplayNameChange} />
      <AuthInput label="邮箱" type="email" value={email} required onChange={onEmailChange} />
      <AuthInput label="密码" type="password" value={password} required onChange={onPasswordChange} />
      <AuthInput label="重复密码" type="password" value={repeatPassword} required onChange={onRepeatPasswordChange} />
      <AuthInput label="赛波码" value={invitationCode} required onChange={onInvitationCodeChange} />
      <AvatarPicker
        catalog={catalog}
        selectedPlayerId={avatarPlayerId}
        customAvatarUrl={customAvatarUrl}
        onPlayerSelect={onAvatarPlayerChange}
        onCustomAvatarUrlChange={onCustomAvatarUrlChange}
        onUploadError={onUploadError}
      />
      <ModalFooter error={error}>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton type="button" onClick={onSwitchToLogin}>
            <LogIn className="h-4 w-4" />
            登录
          </SecondaryButton>
          <PrimaryButton type="submit">
            完成注册
          </PrimaryButton>
        </div>
      </ModalFooter>
    </form>
  );
}

function RegisterPreferences({
  catalog,
  selectedTeamIds,
  selectedPlayerIds,
  busy,
  error,
  onBack,
  onTeamToggle,
  onPlayerToggle,
  onSubmit,
}: {
  catalog: UserPreferenceCatalog;
  selectedTeamIds: string[];
  selectedPlayerIds: string[];
  busy: string;
  error: string;
  onBack: () => void;
  onTeamToggle: (id: string) => void;
  onPlayerToggle: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-5">
      <PreferencePicker title="关注球队" description="从官方名单里选择你想持续关注的球队。">
        <TeamGrid items={catalog.teams} selected={selectedTeamIds} onToggle={onTeamToggle} />
      </PreferencePicker>
      <PreferencePicker title="关注球员" description="只展示官方名单里的球员，可多选。">
        <PlayerGrid items={catalog.players} selected={selectedPlayerIds} catalogPlayers={catalog.players} onToggle={onPlayerToggle} />
      </PreferencePicker>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="h-11 rounded-full bg-white/[0.06] px-5 text-sm font-semibold text-white/64 transition hover:bg-white/[0.1] hover:text-white">
          返回
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {error && <p className="text-sm text-flare/80">{error}</p>}
          <PrimaryButton type="button" disabled={Boolean(busy)} onClick={onSubmit}>
            <UserPlus className="h-4 w-4" />
            {busy === "register" ? "创建中" : "完成注册"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function RecommendationStep({
  catalog,
  selectedTeamIds,
  selectedPlayerIds,
  recommendedTeams,
  recommendedPlayers,
  busy,
  error,
  onUseRecommended,
  onApplyRecommended,
  onTeamToggle,
  onPlayerToggle,
  onSave,
  onSkip,
}: {
  catalog: UserPreferenceCatalog;
  selectedTeamIds: string[];
  selectedPlayerIds: string[];
  recommendedTeams: UserPreferenceTeam[];
  recommendedPlayers: UserPreferencePlayer[];
  busy: string;
  error: string;
  onUseRecommended: () => void;
  onApplyRecommended: () => void;
  onTeamToggle: (id: string) => void;
  onPlayerToggle: (id: string) => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="rounded-[1.5rem] bg-white/[0.035] p-4 ring-1 ring-white/10">
        <p className="text-sm font-semibold text-white">账号已创建，关注项可以稍后再选。</p>
        <p className="mt-1 text-sm text-white/42">推荐包包含概率前十国家、26 位超级巨星和 9 位神童。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <PrimaryButton type="button" disabled={Boolean(busy)} onClick={onApplyRecommended}>
            <UserPlus className="h-4 w-4" />
            一键关注推荐包
          </PrimaryButton>
          <SecondaryButton type="button" disabled={Boolean(busy)} onClick={onUseRecommended}>
            填入推荐后微调
          </SecondaryButton>
          <button type="button" disabled={Boolean(busy)} onClick={onSkip} className="h-12 rounded-full px-5 text-sm font-semibold text-white/54 transition hover:text-white disabled:opacity-60">
            跳过
          </button>
        </div>
      </div>

      <PreferencePicker title="国家推荐概率 Top 10" description="按当前冠军概率排序，一键即可关注。">
        <PreviewChips items={recommendedTeams.map((team) => team.name)} />
      </PreferencePicker>
      <PreferencePicker title="26 超级巨星 + 9 神童" description="从官方球员名单匹配，完整名单会直接关注。">
        <PreviewChips items={recommendedPlayers.map((player) => player.name)} limit={18} suffix={`共 ${recommendedPlayers.length} 位`} />
      </PreferencePicker>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-5 text-sm text-flare/80">{error}</p>
        <PrimaryButton type="button" disabled={Boolean(busy)} onClick={onSave}>
          {busy === "preferences" ? "保存中" : "保存推荐选择"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function PreviewChips({ items, limit = items.length, suffix }: { items: string[]; limit?: number; suffix?: string }) {
  const visible = items.slice(0, limit);
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((item) => (
        <span key={item} className="rounded-full bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-white/72 ring-1 ring-white/[0.08]">
          {item}
        </span>
      ))}
      {items.length > visible.length || suffix ? (
        <span className="rounded-full bg-volt/12 px-3 py-1.5 text-xs font-bold text-volt ring-1 ring-volt/20">
          {suffix ?? `还有 ${items.length - visible.length} 项`}
        </span>
      ) : null}
    </div>
  );
}

function AuthInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm text-white/52">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-full border border-white/10 bg-black/24 px-4 text-white outline-none transition placeholder:text-white/24 focus:border-volt/45"
      />
    </label>
  );
}

function ModalFooter({ error, children }: { error: string; children: ReactNode }) {
  return (
    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="min-h-5 text-sm text-flare/80">{error}</p>
      {children}
    </div>
  );
}

function PreferencePicker({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[1.5rem] bg-white/[0.035] p-4 shadow-glass ring-1 ring-white/10">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/42">{description}</p>
      </div>
      {children}
    </section>
  );
}

function TeamGrid({ items, selected, onToggle }: { items: UserPreferenceTeam[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid gap-2 pr-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((team) => {
        const checked = selected.includes(team.id);
        return (
          <button
            key={team.id}
            type="button"
            onClick={() => onToggle(team.id)}
            className={`min-h-14 rounded-[1.1rem] px-3 text-left text-sm transition ring-1 ${
              checked ? "bg-volt/12 text-white ring-volt/35 shadow-[0_0_22px_rgba(216,255,62,.12)]" : "bg-white/[0.035] text-white/64 ring-white/8 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
                {team.logo ? <Image src={team.logo} alt={team.name} fill sizes="32px" className="object-contain p-1" /> : <Trophy className="m-2 h-4 w-4 text-volt" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{team.name}</span>
                <span className="mt-0.5 block text-xs text-white/36">{team.region || "World Cup"}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PlayerGrid({ items, selected, catalogPlayers, onToggle }: { items: UserPreferencePlayer[]; selected: string[]; catalogPlayers: UserPreferencePlayer[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid gap-2 pr-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((player) => {
        const checked = selected.includes(player.id);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onToggle(player.id)}
            className={`min-h-14 rounded-[1.1rem] px-3 text-left text-sm transition ring-1 ${
              checked ? "bg-volt/12 text-white ring-volt/35 shadow-[0_0_22px_rgba(216,255,62,.12)]" : "bg-white/[0.035] text-white/64 ring-white/8 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-volt/20">
                <Image src={player.photo || getPlayerAvatar(player.id, catalogPlayers)} alt={player.name} fill sizes="36px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{player.name}</span>
                <span className="mt-0.5 block truncate text-xs text-white/36">{[player.team, player.position].filter(Boolean).join(" / ")}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="auth-primary-button inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-full border border-transparent bg-volt px-4 text-sm font-bold text-black shadow-[0_0_30px_rgba(216,255,62,.2)] outline-none transition hover:scale-[1.02] focus-visible:border-volt/40 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-semibold text-white/78 outline-none transition hover:bg-white/[0.1] hover:text-white focus-visible:border-white/22 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function inferFavoriteMatches(catalog: UserPreferenceCatalog, teams: UserPreferenceTeam[], players: UserPreferencePlayer[]) {
  const tokens = new Set<string>();
  for (const team of teams) {
    tokens.add(team.name);
    if (team.region) tokens.add(team.region);
  }
  for (const player of players) {
    if (player.team) tokens.add(player.team);
  }
  return catalog.matches.filter((match) => Array.from(tokens).some((token) => token && match.title.includes(token)));
}

function buildRecommendedTeams(catalog: UserPreferenceCatalog, countries: Map<string, { countryCode: string; impliedProbability: number }>) {
  const rankedCodes = Array.from(countries.values())
    .sort((a, b) => b.impliedProbability - a.impliedProbability)
    .slice(0, 10)
    .map((country) => getFlagCode(country.countryCode).toUpperCase());

  const teams = rankedCodes
    .map((code) => catalog.teams.find((team) => team.region?.toUpperCase() === code || team.id.toUpperCase() === code))
    .filter(Boolean) as UserPreferenceTeam[];

  return teams.length ? teams : catalog.teams.slice(0, 10);
}

function buildRecommendedPlayers(catalog: UserPreferenceCatalog) {
  const wanted = [...SUPERSTAR_NAMES, ...WONDERKID_NAMES].map(normalizeName);
  const byName = new Map(catalog.players.map((player) => [normalizeName(player.name), player]));
  return wanted.map((name) => byName.get(name)).filter(Boolean) as UserPreferencePlayer[];
}

function mergeRecommendedFirst<T extends { id: string }>(recommended: T[], all: T[]) {
  const seen = new Set<string>();
  return [...recommended, ...all].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function readableError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  const messages: Record<string, string> = {
    invalid_credentials: "邮箱或密码不符合要求，密码至少 8 位",
    invalid_email_or_password: "邮箱或密码不正确",
    email_already_registered: "这个邮箱已经注册过了",
    user_disabled: "这个账号已被停用",
    authentication_required: "请先登录",
    invitation_code_required: "请填写赛波码",
    invalid_invitation_code: "赛波码无效",
    invitation_code_disabled: "这个赛波码已停用",
    invitation_code_expired: "这个赛波码已过期",
    invitation_code_exhausted: "这个赛波码使用次数已满",
  };
  return messages[message] ?? fallback;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function toggleValue(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function compactIds(id: string | undefined) {
  return id ? [id] : [];
}
