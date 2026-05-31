const countryEnglishNames: Record<string, string> = {
  mx: "Mexico", za: "South Africa", kr: "South Korea", cz: "Czechia",
  ca: "Canada", ba: "Bosnia & Herz.", us: "United States", py: "Paraguay",
  qa: "Qatar", ch: "Switzerland", br: "Brazil", ma: "Morocco", ht: "Haiti",
  "gb-sct": "Scotland", tr: "Turkey", jp: "Japan", de: "Germany",
  cw: "Curacao", au: "Australia", eg: "Egypt", fr: "France", co: "Colombia",
  it: "Italy", tn: "Tunisia", dz: "Algeria", pe: "Peru", ar: "Argentina",
  at: "Austria", dk: "Denmark", uy: "Uruguay", pt: "Portugal", no: "Norway",
  "gb-eng": "England", hr: "Croatia", ec: "Ecuador", nl: "Netherlands",
  sn: "Senegal", ae: "UAE", ir: "Iran", nz: "New Zealand", ci: "Cote d'Ivoire",
  gh: "Ghana", pa: "Panama", cv: "Cape Verde"
};

function getEnglishName(image: string | undefined, fallback: string): string {
  if (!image) return fallback;
  const code = image.split("/").pop()?.split(".")[0] ?? "";
  return countryEnglishNames[code] ?? code.toUpperCase();
}

export function TeamSignal({ image, name }: { code: string; image?: string; name: string }) {
  const englishName = getEnglishName(image, name);
  const shortCode = englishName.length > 3 ? englishName.slice(0, 3).toUpperCase() : englishName.toUpperCase();

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-none">
      <span className="text-5xl font-normal leading-none text-volt/90 sm:text-7xl" style={{ fontFamily: "ScreenMatrix, monospace" }}>{shortCode}</span>
      <span className="inline-flex max-w-full items-center gap-1.5">
        {image && (<img src={image} alt="" className="h-4 w-5 shrink-0 rounded-sm object-cover" loading="lazy" />)}
        <span className="truncate text-xs font-semibold uppercase text-white/86 sm:text-sm">{name}</span>
      </span>
    </div>
  );
}
