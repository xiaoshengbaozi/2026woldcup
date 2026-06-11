import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getPublishedArticles } from "@/lib/articles";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export const metadata = {
  title: "文章专题 | CYBERBALL",
  description: "世界杯深度专题、城市指南、球队观察与观赛攻略。",
};

export default function ArticlesPage() {
  const articles = getPublishedArticles();
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const rest = articles.filter((article) => article.slug !== featured?.slug);

  return (
    <DashboardShell>
      <main className="space-y-6">
        <section className="hero-shell overflow-hidden p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-volt/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-volt ring-1 ring-volt/25">
                <Sparkles className="h-3.5 w-3.5" />
                Articles
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
                世界杯专题库
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
                用 Obsidian 写作，用 Cloudflare Pages 发布。这里收纳城市指南、球队观察、赛程攻略和长线专题。
              </p>
            </div>

            {featured && (
              <Link
                href={`/articles/${featured.slug}/`}
                className="hero-card group relative z-10 min-h-[320px] overflow-hidden p-5 transition duration-300 hover:-translate-y-1 sm:p-6"
              >
                {featured.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.cover}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-105 group-hover:opacity-58"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10 flex min-h-[270px] flex-col justify-end">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {featured.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-volt ring-1 ring-white/[0.08]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{featured.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/58 line-clamp-2">{featured.summary}</p>
                  <div className="mt-5 flex items-center justify-between text-xs text-white/42">
                    <span>{dateFormatter.format(new Date(featured.publishedAt))}</span>
                    <span className="inline-flex items-center gap-2 text-volt">
                      阅读专题 <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(featured ? rest : articles).map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </section>

        {articles.length === 0 && (
          <section className="hero-card flex min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center">
            <BookOpen className="h-10 w-10 text-white/20" />
            <div>
              <h2 className="text-lg font-semibold text-white">还没有已发布文章</h2>
              <p className="mt-2 text-sm text-white/45">把 Markdown 的 status 改成 published 后，构建时会自动出现在这里。</p>
            </div>
          </section>
        )}
      </main>
    </DashboardShell>
  );
}

function ArticleCard({ article }: { article: ReturnType<typeof getPublishedArticles>[number] }) {
  return (
    <Link href={`/articles/${article.slug}/`} className="hero-card group overflow-hidden transition duration-300 hover:-translate-y-1">
      <div className="relative h-44 overflow-hidden bg-white/[0.035]">
        {article.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.cover} alt="" className="h-full w-full object-cover opacity-76 transition duration-500 group-hover:scale-105 group-hover:opacity-95" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(216,255,62,0.14),transparent_38%)]">
            <BookOpen className="h-8 w-8 text-volt/45" />
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-volt backdrop-blur-xl">
          {article.category}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 text-[11px] text-white/36">
          <span>{dateFormatter.format(new Date(article.publishedAt))}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {article.readingMinutes} 分钟
          </span>
        </div>
        <h2 className="mt-3 text-lg font-semibold leading-snug text-white transition group-hover:text-volt line-clamp-2">{article.title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/48 line-clamp-2">{article.summary}</p>
      </div>
    </Link>
  );
}
