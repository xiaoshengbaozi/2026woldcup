import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import { parseCalendar } from "@/lib/calendar";
import { generateLegacyMatchSlug, generateMatchSlug, generateStageLegacyMatchSlug } from "@/lib/match-detail";
import { MatchDetailClient } from "./client";

type Props = { params: { slug: string } };

function getAllSlugs(): string[] {
  try {
    const icsPath = path.join(process.cwd(), "public", "calendar.ics");
    const text = fs.readFileSync(icsPath, "utf-8");
    const matches = parseCalendar(text);
    const slugs = matches.flatMap((m) => [
      generateMatchSlug(m.summary),
      generateLegacyMatchSlug(m.summary),
      generateStageLegacyMatchSlug(m.summary),
    ]);
    return [...new Set(slugs.flatMap((slug) => [slug, encodeURIComponent(slug)]))];
  } catch {
    return [];
  }
}

async function getApiFixtureSlugs(): Promise<string[]> {
  try {
    const response = await fetch("http://localhost:3001/api/worldcup/fixtures", { cache: "no-store" });
    if (!response.ok) return [];
    const payload = (await response.json()) as { fixtures?: Array<{ summary?: string }> };
    const slugs = (payload.fixtures ?? [])
      .filter((fixture): fixture is { summary: string } => Boolean(fixture.summary))
      .flatMap((fixture) => [
        generateMatchSlug(fixture.summary),
        generateLegacyMatchSlug(fixture.summary),
        generateStageLegacyMatchSlug(fixture.summary),
      ]);

    return slugs.flatMap((slug) => [slug, encodeURIComponent(slug)]);
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const slugs = [...getAllSlugs(), ...(await getApiFixtureSlugs())];
  return [...new Set(slugs)].map((slug) => ({ slug }));
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
