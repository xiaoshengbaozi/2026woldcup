import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getArticleBySlug, getPublishedArticles, markdownToBlocks } from "@/lib/articles";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function generateStaticParams() {
  return getPublishedArticles().map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getArticleBySlug(params.slug);
  if (!article) return {};

  return {
    title: `${article.title} | CYBERBALL`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      images: article.cover ? [article.cover] : undefined,
    },
  };
}

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug);
  if (!article) notFound();

  const blocks = markdownToBlocks(article.body);

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-5xl">
        <Link href="/articles/" className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/[0.055] px-4 py-2 text-sm font-semibold text-white/62 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          返回专题库
        </Link>

        <article className="hero-shell overflow-hidden">
          {article.cover && (
            <div className="relative h-[320px] overflow-hidden sm:h-[430px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.cover} alt="" className="h-full w-full object-cover opacity-72" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050708] via-black/20 to-transparent" />
            </div>
          )}

          <div className="relative z-10 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/42">
              <span className="rounded-full bg-volt/12 px-3 py-1 font-semibold uppercase tracking-[0.14em] text-volt ring-1 ring-volt/25">
                {article.category}
              </span>
              <span>{dateFormatter.format(new Date(article.publishedAt))}</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {article.readingMinutes} 分钟
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">{article.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/56">{article.summary}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/[0.055] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/48 ring-1 ring-white/[0.08]">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-10 space-y-6 text-[16px] leading-8 text-white/72">
              {blocks.map((block, index) => {
                if (block.type === "h2") {
                  return <h2 key={index} className="pt-4 text-2xl font-semibold leading-snug text-white">{block.text}</h2>;
                }
                if (block.type === "h3") {
                  return <h3 key={index} className="pt-3 text-xl font-semibold leading-snug text-white/90">{block.text}</h3>;
                }
                return <p key={index}>{block.text}</p>;
              })}
            </div>
          </div>
        </article>
      </main>
    </DashboardShell>
  );
}
