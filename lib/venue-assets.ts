import type { Match } from "@/types/match";

import arrowheadDay from "@/assets/venues/arrowhead-stadium/day.jpg";
import arrowheadNight from "@/assets/venues/arrowhead-stadium/night.jpg";
import attDay from "@/assets/venues/att-stadium/day.jpg";
import attNight from "@/assets/venues/att-stadium/night.jpg";
import bcPlaceDay from "@/assets/venues/bc-place/day.jpg";
import bcPlaceNight from "@/assets/venues/bc-place/night.jpg";
import bmoFieldDay from "@/assets/venues/bmo-field/day.jpg";
import bmoFieldNight from "@/assets/venues/bmo-field/night.jpg";
import estadioAkronDay from "@/assets/venues/estadio-akron/day.jpg";
import estadioAkronNight from "@/assets/venues/estadio-akron/night.jpg";
import estadioAztecaDay from "@/assets/venues/estadio-azteca/day.jpg";
import estadioAztecaNight from "@/assets/venues/estadio-azteca/night.jpg";
import estadioBbvaDay from "@/assets/venues/estadio-bbva/day.jpg";
import estadioBbvaNight from "@/assets/venues/estadio-bbva/night.jpg";
import gilletteDay from "@/assets/venues/gillette-stadium/day.jpg";
import gilletteNight from "@/assets/venues/gillette-stadium/night.jpg";
import hardRockDay from "@/assets/venues/hard-rock-stadium/day.jpg";
import hardRockNight from "@/assets/venues/hard-rock-stadium/night.jpg";
import levisDay from "@/assets/venues/levis-stadium/day.jpg";
import levisNight from "@/assets/venues/levis-stadium/night.jpg";
import lincolnDay from "@/assets/venues/lincoln-financial-field/day.jpg";
import lincolnNight from "@/assets/venues/lincoln-financial-field/night.jpg";
import lumenDay from "@/assets/venues/lumen-field/day.jpg";
import lumenNight from "@/assets/venues/lumen-field/night.jpg";
import mercedesDay from "@/assets/venues/mercedes-benz-stadium/day.jpg";
import mercedesNight from "@/assets/venues/mercedes-benz-stadium/night.jpg";
import metlifeDay from "@/assets/venues/metlife-stadium/day.jpg";
import metlifeNight from "@/assets/venues/metlife-stadium/night.jpg";
import nrgDay from "@/assets/venues/nrg-stadium/day.jpg";
import nrgNight from "@/assets/venues/nrg-stadium/night.jpg";
import sofiDay from "@/assets/venues/sofi-stadium/day.jpg";
import sofiNight from "@/assets/venues/sofi-stadium/night.jpg";

type VenueBanner = {
  aliases: string[];
  day: string;
  night: string;
};

const VENUE_BANNERS: VenueBanner[] = [
  {
    aliases: ["metlife", "\u5927\u90fd\u4f1a\u4eba\u5bff", "\u7ebd\u7ea6/\u65b0\u6cfd\u897f", "\u7ebd\u7ea6-\u65b0\u6cfd\u897f"],
    day: metlifeDay.src,
    night: metlifeNight.src,
  },
  {
    aliases: ["sofi", "\u6d1b\u6749\u77f6"],
    day: sofiDay.src,
    night: sofiNight.src,
  },
  {
    aliases: ["at&t", "at & t", "\u8fbe\u62c9\u65af"],
    day: attDay.src,
    night: attNight.src,
  },
  {
    aliases: ["mercedes-benz", "mercedes benz", "\u6885\u8d5b\u5fb7\u65af", "\u4e9a\u7279\u5170\u5927"],
    day: mercedesDay.src,
    night: mercedesNight.src,
  },
  {
    aliases: ["hard rock", "\u786c\u77f3", "\u8fc8\u963f\u5bc6"],
    day: hardRockDay.src,
    night: hardRockNight.src,
  },
  {
    aliases: ["gillette", "\u5409\u5217", "\u6ce2\u58eb\u987f"],
    day: gilletteDay.src,
    night: gilletteNight.src,
  },
  {
    aliases: ["nrg", "\u4f11\u65af\u6566"],
    day: nrgDay.src,
    night: nrgNight.src,
  },
  {
    aliases: ["levi", "\u674e\u7ef4\u65af", "\u65e7\u91d1\u5c71\u6e7e\u533a"],
    day: levisDay.src,
    night: levisNight.src,
  },
  {
    aliases: ["lumen", "\u6d41\u660e", "\u897f\u96c5\u56fe"],
    day: lumenDay.src,
    night: lumenNight.src,
  },
  {
    aliases: ["lincoln financial", "\u6797\u80af\u91d1\u878d", "\u8d39\u57ce"],
    day: lincolnDay.src,
    night: lincolnNight.src,
  },
  {
    aliases: ["arrowhead", "\u7bad\u5934", "\u582a\u8428\u65af\u57ce"],
    day: arrowheadDay.src,
    night: arrowheadNight.src,
  },
  {
    aliases: ["bc place", "\u5351\u8bd7", "\u6e29\u54e5\u534e"],
    day: bcPlaceDay.src,
    night: bcPlaceNight.src,
  },
  {
    aliases: ["bmo", "\u591a\u4f26\u591a"],
    day: bmoFieldDay.src,
    night: bmoFieldNight.src,
  },
  {
    aliases: ["azteca", "banorte", "\u963f\u5179\u7279\u514b", "\u5df4\u8bfa\u5c14\u7279", "\u58a8\u897f\u54e5\u57ce"],
    day: estadioAztecaDay.src,
    night: estadioAztecaNight.src,
  },
  {
    aliases: ["akron", "\u963f\u514b\u4f26", "\u74dc\u8fbe\u62c9\u54c8\u62c9"],
    day: estadioAkronDay.src,
    night: estadioAkronNight.src,
  },
  {
    aliases: ["bbva", "\u8499\u7279\u96f7"],
    day: estadioBbvaDay.src,
    night: estadioBbvaNight.src,
  },
];

export function getVenueBannerImage(match: Match) {
  const normalizedLocation = match.location.toLowerCase();
  const venue = VENUE_BANNERS.find((entry) =>
    entry.aliases.some((alias) => normalizedLocation.includes(alias.toLowerCase()))
  );

  if (!venue) return null;
  return isVenueNight(match.start, match.geo) ? venue.night : venue.day;
}

function isVenueNight(start: Date, geo: Match["geo"]) {
  const hour = getApproximateVenueHour(start, geo);
  return hour < 6 || hour >= 18;
}

function getApproximateVenueHour(start: Date, geo: Match["geo"]) {
  if (!geo) return start.getHours();

  const offset = Math.round(geo.lon / 15);
  return positiveModulo(start.getUTCHours() + offset, 24);
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
