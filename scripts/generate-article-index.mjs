import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const articlesDir = path.join(rootDir, "content", "articles");
const outputPath = path.join(rootDir, "data", "articles.generated.json");

function parseFrontmatter(source, fileName) {
  if (!source.startsWith("---")) {
    throw new Error(`${fileName} is missing frontmatter`);
  }

  const end = source.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error(`${fileName} frontmatter is not closed`);
  }

  const rawFrontmatter = source.slice(3, end).trim();
  const body = source.slice(end + 4).trim();
  const meta = {};

  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    meta[key] = parseValue(rawValue.trim());
  }

  return { meta, body };
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

function normalizeArticle(fileName, meta, body) {
  const inferredSlug = fileName.replace(/\.md$/i, "");
  const slug = String(meta.slug || inferredSlug).trim();
  const title = String(meta.title || slug).trim();
  const summary = String(meta.summary || body.split(/\r?\n/).find(Boolean) || "").trim();
  const publishedAt = String(meta.publishedAt || "").trim();

  if (!slug) throw new Error(`${fileName} is missing slug`);
  if (!title) throw new Error(`${fileName} is missing title`);
  if (!publishedAt) throw new Error(`${fileName} is missing publishedAt`);

  return {
    slug,
    title,
    summary,
    category: String(meta.category || "专题"),
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    cover: String(meta.cover || ""),
    publishedAt,
    featured: Boolean(meta.featured),
    status: String(meta.status || "draft"),
    sourceFile: `content/articles/${fileName}`,
    readingMinutes: Math.max(1, Math.ceil(body.replace(/\s/g, "").length / 500)),
  };
}

const files = (await readdir(articlesDir)).filter((file) => file.endsWith(".md"));
const articles = [];

for (const file of files) {
  const source = await readFile(path.join(articlesDir, file), "utf8");
  const { meta, body } = parseFrontmatter(source, file);
  const article = normalizeArticle(file, meta, body);
  if (article.status === "published") articles.push(article);
}

articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(articles, null, 2)}\n`, "utf8");

console.log(`Generated ${articles.length} published article${articles.length === 1 ? "" : "s"}.`);
