import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import { parseCalendar } from "@/lib/calendar";
import { generateMatchSlug } from "@/lib/match-detail";
import { MatchDetailClient } from "./client";

type Props = { params: { slug: string } };

function getAllSlugs(): string[] {
  try {
    const icsPath = path.join(process.cwd(), "public", "calendar.ics");
    const text = fs.readFileSync(icsPath, "utf-8");
    const matches = parseCalendar(text);
    const slugs = matches.map((m) => generateMatchSlug(m.summary));
    return [...new Set(slugs.flatMap((slug) => [slug, encodeURIComponent(slug)]))];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${title} | FIFA World Cup 2026`,
    description: `Match details, live odds, lineups, and analysis for ${title} - FIFA World Cup 2026.`,
    openGraph: {
      title: `${title} - World Cup 2026`,
      description: `Live match details and prediction market data for ${title}.`,
    },
  };
}

export default function MatchDetailPage({ params }: Props) {
  return <MatchDetailClient slug={decodeURIComponent(params.slug)} />;
}
