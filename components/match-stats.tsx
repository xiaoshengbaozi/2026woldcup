import { motion } from "framer-motion";
import { CalendarDays, Flag, MapPin, Trophy } from "lucide-react";
import { StatCard } from "@/components/stat-card";

type MatchStatsProps = {
  totalMatches: number;
  visible: number;
  totalMatchDays: number;
  remainingMatchDays: number;
  activeTeamCount: number;
  totalTeamCount: number;
  visibleCities: number;
  totalCities: number;
};

export function MatchStats({
  totalMatches,
  visible,
  totalMatchDays,
  remainingMatchDays,
  activeTeamCount,
  totalTeamCount,
  visibleCities,
  totalCities,
}: MatchStatsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      className="grid grid-cols-4 gap-1.5 sm:gap-3"
    >
      <StatCard
        label="比赛"
        value={`${visible}/${totalMatches}`}
        detail="筛选 / 全部"
        icon={Trophy}
        accent
        href="/matches"
      />
      <StatCard
        label="比赛日"
        value={`${remainingMatchDays}/${totalMatchDays}`}
        detail="剩余 / 全部"
        icon={CalendarDays}
        href="/matches"
      />
      <StatCard
        label="球队"
        value={`${activeTeamCount}/${totalTeamCount}`}
        detail="未淘汰 / 全部"
        icon={Flag}
        href="/teams"
      />
      <StatCard
        label="城市"
        value={`${visibleCities}/${totalCities}`}
        detail="筛选 / 全部"
        icon={MapPin}
      />
    </motion.section>
  );
}
