import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "team-landscapes");
const MANIFEST = path.join(OUT_DIR, "index.json");
const TARGET_WIDTH = 2560;
const TARGET_HEIGHT = 1080;
const REQUEST_DELAY_MS = 1800;

const teams = [
  ["canada", "Canada", ["Banff National Park lake landscape", "Moraine Lake Canada panorama", "Canadian Rockies landscape"]],
  ["mexico", "Mexico", ["Teotihuacan landscape Mexico", "Copper Canyon Mexico landscape", "Yucatan Mexico coastline landscape"]],
  ["united-states", "United States", ["Yosemite Valley panorama", "Grand Canyon landscape", "Monument Valley landscape"]],
  ["haiti", "Haiti", ["Citadelle Laferriere Haiti landscape", "Labadee Haiti coastline", "Haiti mountain landscape"]],
  ["curacao", "Curacao", ["Willemstad Curacao panorama", "Curacao coastline panorama", "Christoffelberg Curacao landscape"]],
  ["panama", "Panama", ["San Blas Islands Panama panorama", "Panama City skyline panorama", "Panama Canal landscape"]],
  ["argentina", "Argentina", ["Patagonia Argentina landscape", "Mount Fitz Roy Argentina panorama", "Perito Moreno Glacier landscape"]],
  ["brazil", "Brazil", ["Rio de Janeiro landscape", "Lençóis Maranhenses landscape", "Iguazu Falls Brazil landscape"]],
  ["colombia", "Colombia", ["Cocora Valley Colombia landscape", "Cartagena Colombia coastline", "Colombia coffee region landscape"]],
  ["ecuador", "Ecuador", ["Cotopaxi Ecuador landscape", "Galapagos Ecuador landscape", "Quilotoa Ecuador panorama"]],
  ["paraguay", "Paraguay", ["Saltos del Monday Paraguay landscape", "Itaipu Paraguay landscape", "Asuncion Paraguay panorama"]],
  ["uruguay", "Uruguay", ["Punta del Este Uruguay landscape", "Colonia del Sacramento Uruguay landscape", "Uruguay coastline landscape"]],
  ["algeria", "Algeria", ["Sahara Algeria landscape", "Tassili n'Ajjer Algeria landscape", "Algeria desert landscape"]],
  ["morocco", "Morocco", ["Ait Benhaddou Morocco landscape", "Sahara Morocco landscape", "Atlas Mountains Morocco landscape"]],
  ["south-africa", "South Africa", ["Table Mountain Cape Town landscape", "Drakensberg South Africa landscape", "Cape of Good Hope landscape"]],
  ["cape-verde", "Cabo Verde", ["Cabo Verde landscape", "Cape Verde coastline landscape", "Santo Antao Cabo Verde landscape"]],
  ["ivory-coast", "Cote d'Ivoire", ["Cote d'Ivoire coastline landscape", "Tai National Park Cote d'Ivoire", "Basilica Yamoussoukro landscape"]],
  ["dr-congo", "DR Congo", ["Virunga National Park landscape", "Congo River landscape", "DR Congo landscape"]],
  ["egypt", "Egypt", ["Giza pyramids landscape", "Nile Egypt landscape", "White Desert Egypt landscape"]],
  ["ghana", "Ghana", ["Kakum National Park Ghana landscape", "Cape Coast Castle Ghana panorama", "Mole National Park Ghana landscape"]],
  ["senegal", "Senegal", ["Pink Lake Senegal landscape", "Dakar Senegal coastline", "Senegal landscape"]],
  ["tunisia", "Tunisia", ["Sidi Bou Said Tunisia landscape", "Sahara Tunisia landscape", "Dougga Tunisia landscape"]],
  ["australia", "Australia", ["Uluru Australia landscape", "Great Ocean Road Australia landscape", "Sydney Harbour landscape"]],
  ["iran", "Iran", ["Mount Damavand Iran landscape", "Persepolis Iran landscape", "Dasht-e Lut Iran landscape"]],
  ["iraq", "Iraq", ["Mesopotamian marshes Iraq landscape", "Ziggurat of Ur Iraq landscape", "Iraq landscape"]],
  ["japan", "Japan", ["Mount Fuji Japan landscape", "Kyoto Japan landscape", "Shirakawa-go Japan landscape"]],
  ["jordan", "Jordan", ["Wadi Rum Jordan landscape", "Petra Jordan landscape", "Dead Sea Jordan landscape"]],
  ["qatar", "Qatar", ["Doha skyline Qatar landscape", "Qatar desert landscape", "Khor Al Adaid Qatar landscape"]],
  ["saudi-arabia", "Saudi Arabia", ["AlUla Saudi Arabia landscape", "Edge of the World Saudi Arabia landscape", "Saudi Arabia desert landscape"]],
  ["korea-republic", "Korea Republic", ["Seoraksan South Korea landscape", "Jeju Island South Korea landscape", "Seoul skyline landscape"]],
  ["uzbekistan", "Uzbekistan", ["Samarkand Uzbekistan landscape", "Registan Uzbekistan landscape", "Uzbekistan desert landscape"]],
  ["new-zealand", "New Zealand", ["Milford Sound New Zealand landscape", "Mount Cook New Zealand landscape", "New Zealand fjord landscape"]],
  ["austria", "Austria", ["Hallstatt Austria landscape", "Austrian Alps landscape", "Salzburg Austria landscape"]],
  ["belgium", "Belgium", ["Bruges Belgium landscape", "Dinant Belgium landscape", "Ardennes Belgium landscape"]],
  ["bosnia-and-herzegovina", "Bosnia and Herzegovina", ["Mostar Bosnia landscape", "Bosnia and Herzegovina mountain landscape", "Una National Park Bosnia landscape"]],
  ["croatia", "Croatia", ["Dubrovnik Croatia landscape", "Plitvice Lakes Croatia landscape", "Dalmatian coast Croatia landscape"]],
  ["czechia", "Czechia", ["Bohemian Switzerland Czechia landscape", "Cesky Krumlov Czechia panorama", "Prague skyline panorama"]],
  ["england", "England", ["Lake District England landscape", "Durdle Door England landscape", "London England skyline landscape"]],
  ["france", "France", ["Mont Saint Michel France landscape", "French Alps landscape", "Provence France landscape"]],
  ["germany", "Germany", ["Bavarian Alps Germany panorama", "Rhine Valley Germany landscape", "Neuschwanstein Germany landscape"]],
  ["netherlands", "Netherlands", ["Kinderdijk Netherlands landscape", "Amsterdam Netherlands landscape", "Netherlands tulip fields landscape"]],
  ["norway", "Norway", ["Geirangerfjord Norway landscape", "Lofoten Norway landscape", "Norway fjord landscape"]],
  ["portugal", "Portugal", ["Lisbon Portugal landscape", "Douro Valley Portugal landscape", "Algarve Portugal coastline"]],
  ["scotland", "Scotland", ["Isle of Skye Scotland landscape", "Glencoe Scotland landscape", "Edinburgh Scotland landscape"]],
  ["spain", "Spain", ["Alhambra Spain landscape", "Barcelona Spain landscape", "Andalusia Spain landscape"]],
  ["sweden", "Sweden", ["Stockholm Sweden landscape", "Lapland Sweden landscape", "Swedish archipelago landscape"]],
  ["switzerland", "Switzerland", ["Matterhorn Switzerland landscape", "Swiss Alps landscape", "Lauterbrunnen Switzerland landscape"]],
  ["turkiye", "Turkiye", ["Cappadocia Turkiye landscape", "Istanbul Turkiye landscape", "Pamukkale Turkiye landscape"]],
];

function commonsUrl(params) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 5) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (response.status !== 429 || attempt === retries) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) ? retryAfter * 1000 : 5000 + attempt * 5000;
    await wait(backoff);
  }
}

async function searchCommons(query) {
  await wait(REQUEST_DELAY_MS);
  const url = commonsUrl({
    action: "query",
    generator: "search",
    gsrnamespace: 6,
    gsrlimit: 12,
    gsrsearch: `${query} -flag -map -logo -diagram -football -soccer`,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: 3840,
    format: "json",
    origin: "*",
  });
  const response = await fetchWithRetry(url, {
    headers: { "User-Agent": "2026-world-cup-dashboard/1.0 (local asset preparation)" },
  });
  if (!response.ok) throw new Error(`Commons search failed: ${response.status}`);
  const data = await response.json();
  return Object.values(data.query?.pages ?? {})
    .map((page) => {
      const info = page.imageinfo?.[0];
      return info && {
        title: page.title,
        url: info.thumburl || info.url,
        sourceUrl: info.descriptionurl,
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        originalWidth: info.width,
        originalHeight: info.height,
        mime: info.mime,
        artist: info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "") || "",
        license: info.extmetadata?.LicenseShortName?.value || "",
        credit: info.extmetadata?.Credit?.value?.replace(/<[^>]+>/g, "") || "",
      };
    })
    .filter(Boolean)
    .filter((image) => /^image\/(jpeg|png|webp)$/i.test(image.mime))
    .filter((image) => image.originalWidth >= 1600 && image.originalHeight >= 700)
    .filter((image) => image.originalWidth / image.originalHeight >= 1.25)
    .sort((a, b) => {
      const ar = Math.abs(a.originalWidth / a.originalHeight - TARGET_WIDTH / TARGET_HEIGHT);
      const br = Math.abs(b.originalWidth / b.originalHeight - TARGET_WIDTH / TARGET_HEIGHT);
      return ar - br || b.originalWidth * b.originalHeight - a.originalWidth * a.originalHeight;
    });
}

async function downloadImage(url) {
  await wait(REQUEST_DELAY_MS);
  const response = await fetchWithRetry(url, {
    headers: { "User-Agent": "2026-world-cup-dashboard/1.0 (local asset preparation)" },
  });
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function buildOne(slug, name, queries) {
  for (const query of queries) {
    const candidates = await searchCommons(query);
    for (const image of candidates) {
      try {
        const input = await downloadImage(image.url);
        const output = path.join(OUT_DIR, `${slug}.webp`);
        const meta = await sharp(input).metadata();
        if ((meta.width ?? 0) < 1600 || (meta.height ?? 0) < 700) continue;
        await sharp(input)
          .rotate()
          .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "cover", position: "attention" })
          .webp({ quality: 82, effort: 6 })
          .toFile(output);
        const stat = await fs.stat(output);
        return {
          slug,
          name,
          path: `/team-landscapes/${slug}.webp`,
          width: TARGET_WIDTH,
          height: TARGET_HEIGHT,
          bytes: stat.size,
          query,
          title: image.title,
          sourceUrl: image.sourceUrl,
          license: image.license,
          artist: image.artist,
          credit: image.credit,
          originalWidth: image.originalWidth,
          originalHeight: image.originalHeight,
        };
      } catch (error) {
        console.warn(`  skip ${image.title}: ${error.message}`);
      }
    }
  }
  throw new Error(`No suitable landscape found for ${name}`);
}

await fs.mkdir(OUT_DIR, { recursive: true });

let previous = { images: [], failures: [] };
try {
  previous = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
} catch {}

const manifest = [...(previous.images ?? [])];
const failures = [];
const completed = new Set(manifest.map((item) => item.slug));

const teamNames = new Map(teams.map(([slug, name]) => [slug, name]));
for (const [slug] of teams) {
  const existing = path.join(OUT_DIR, `${slug}.webp`);
  try {
    const stat = await fs.stat(existing);
    if (!completed.has(slug)) {
      manifest.push({
        slug,
        name: teamNames.get(slug),
        path: `/team-landscapes/${slug}.webp`,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        bytes: stat.size,
        sourceUrl: "",
        license: "",
        note: "Recovered from an earlier interrupted run.",
      });
      completed.add(slug);
    }
  } catch {}
}

async function writeManifest() {
  manifest.sort((a, b) => teams.findIndex(([slug]) => slug === a.slug) - teams.findIndex(([slug]) => slug === b.slug));
  await fs.writeFile(MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), images: manifest, failures }, null, 2));
}

for (const [index, [slug, name, queries]] of teams.entries()) {
  process.stdout.write(`[${index + 1}/${teams.length}] ${name}... `);
  if (completed.has(slug)) {
    console.log("already saved");
    continue;
  }
  try {
    const item = await buildOne(slug, name, queries);
    manifest.push(item);
    completed.add(slug);
    await writeManifest();
    console.log(`${Math.round(item.bytes / 1024)} KB`);
  } catch (error) {
    failures.push({ slug, name, error: error.message });
    console.log(`failed: ${error.message}`);
  }
}

await writeManifest();

console.log(`\nSaved ${manifest.length} images to ${path.relative(ROOT, OUT_DIR)}`);
if (failures.length) {
  console.log(`Failures: ${failures.map((failure) => failure.slug).join(", ")}`);
  process.exitCode = 1;
}
