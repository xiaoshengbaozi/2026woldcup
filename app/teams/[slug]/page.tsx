import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { TeamProfile } from "@/components/team-profile";
import { qualifiedTeams } from "@/data/teams";
import { teamProfiles } from "@/data/team-profiles";

interface TeamPageProps {
  params: {
    slug: string;
  };
}

function resolveProfile(slug: string) {
  return teamProfiles[slug as keyof typeof teamProfiles];
}

export function generateStaticParams() {
  return qualifiedTeams.map((team) => ({ slug: team.slug }));
}

export function generateMetadata({ params }: TeamPageProps): Metadata {
  const profile = resolveProfile(params.slug);

  if (!profile) {
    return {
      title: "球队档案 | 2026 世界杯",
    };
  }

  return {
    title: `${profile.nameCn} | 2026 世界杯球队档案`,
    description: `${profile.nameEn} (${profile.nameCn}) 的世界杯历史、关键球员与球队档案。`,
  };
}

export default function TeamPage({ params }: TeamPageProps) {
  const profile = resolveProfile(params.slug);

  if (!profile) notFound();

  return (
    <DashboardShell>
      <TeamProfile data={profile} />
    </DashboardShell>
  );
}
