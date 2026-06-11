import type { TeamProfile } from "@/types/team-profile";

import algeria from "./algeria";
import argentina from "./argentina";
import australia from "./australia";
import austria from "./austria";
import belgium from "./belgium";
import bosnia_and_herzegovina from "./bosnia-and-herzegovina";
import brazil from "./brazil";
import canada from "./canada";
import cape_verde from "./cape-verde";
import colombia from "./colombia";
import croatia from "./croatia";
import curacao from "./curacao";
import czechia from "./czechia";
import dr_congo from "./dr-congo";
import ecuador from "./ecuador";
import egypt from "./egypt";
import england from "./england";
import france from "./france";
import germany from "./germany";
import ghana from "./ghana";
import haiti from "./haiti";
import iran from "./iran";
import iraq from "./iraq";
import ivory_coast from "./ivory-coast";
import japan from "./japan";
import jordan from "./jordan";
import korea_republic from "./korea-republic";
import mexico from "./mexico";
import morocco from "./morocco";
import netherlands from "./netherlands";
import new_zealand from "./new-zealand";
import norway from "./norway";
import panama from "./panama";
import paraguay from "./paraguay";
import playoff_1 from "./playoff-1";
import playoff_2 from "./playoff-2";
import portugal from "./portugal";
import qatar from "./qatar";
import saudi_arabia from "./saudi-arabia";
import scotland from "./scotland";
import senegal from "./senegal";
import south_africa from "./south-africa";
import spain from "./spain";
import sweden from "./sweden";
import switzerland from "./switzerland";
import tunisia from "./tunisia";
import turkiye from "./turkiye";
import united_states from "./united-states";
import uruguay from "./uruguay";
import uzbekistan from "./uzbekistan";

export const teamProfiles: Record<string, TeamProfile> = {
  "algeria": algeria,
  "argentina": argentina,
  "australia": australia,
  "austria": austria,
  "belgium": belgium,
  "bosnia-and-herzegovina": bosnia_and_herzegovina,
  "brazil": brazil,
  "canada": canada,
  "cape-verde": cape_verde,
  "colombia": colombia,
  "croatia": croatia,
  "curacao": curacao,
  "czechia": czechia,
  "dr-congo": dr_congo,
  "ecuador": ecuador,
  "egypt": egypt,
  "england": england,
  "france": france,
  "germany": germany,
  "ghana": ghana,
  "haiti": haiti,
  "iran": iran,
  "iraq": iraq,
  "ivory-coast": ivory_coast,
  "japan": japan,
  "jordan": jordan,
  "korea-republic": korea_republic,
  "mexico": mexico,
  "morocco": morocco,
  "netherlands": netherlands,
  "new-zealand": new_zealand,
  "norway": norway,
  "panama": panama,
  "paraguay": paraguay,
  "playoff-1": playoff_1,
  "playoff-2": playoff_2,
  "portugal": portugal,
  "qatar": qatar,
  "saudi-arabia": saudi_arabia,
  "scotland": scotland,
  "senegal": senegal,
  "south-africa": south_africa,
  "spain": spain,
  "sweden": sweden,
  "switzerland": switzerland,
  "tunisia": tunisia,
  "turkiye": turkiye,
  "united-states": united_states,
  "uruguay": uruguay,
  "uzbekistan": uzbekistan,
};

export type TeamSlug = keyof typeof teamProfiles;

export const teamSlugs = Object.keys(teamProfiles) as TeamSlug[];
