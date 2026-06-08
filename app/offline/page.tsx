import Link from "next/link";

const fallbackLinks = [
  { href: "/", label: "首页" },
  { href: "/matches/", label: "赛程" },
  { href: "/teams/", label: "球队" },
  { href: "/favorites/", label: "收藏" }
];

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#05070f] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-[0_24px_120px_rgba(34,211,238,0.16)] backdrop-blur-2xl md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">CYBERBALL OFFLINE</p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            网络暂时不可用
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            你仍然可以打开已经缓存过的赛程、球队资料和收藏内容。实时比分、赔率与登录状态会在网络恢复后自动更新。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {fallbackLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/15"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
