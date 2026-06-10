import fs from "node:fs";
import path from "node:path";

export type ArticleMeta = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  cover: string;
  publishedAt: string;
  featured: boolean;
  status: string;
  sourceFile: string;
  readingMinutes: number;
};

export type Article = ArticleMeta & {
  body: string;
};

const articlesDir = path.join(process.cwd(), "content", "articles");

export function getPublishedArticles(): ArticleMeta[] {
  if (!fs.existsSync(articlesDir)) return [];

  return fs
    .readdirSync(articlesDir)
    .filter((file) => file.endsWith(".md"))
    .map(readArticleFile)
    .filter((article) => article.status === "published")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map(({ body: _body, ...meta }) => meta);
}

export function getArticleBySlug(slug: string): Article | null {
  return readAllArticles().find((article) => article.slug === slug && article.status === "published") ?? null;
}

function readAllArticles(): Article[] {
  if (!fs.existsSync(articlesDir)) return [];
  return fs.readdirSync(articlesDir).filter((file) => file.endsWith(".md")).map(readArticleFile);
}

function readArticleFile(fileName: string): Article {
  const source = fs.readFileSync(path.join(articlesDir, fileName), "utf8");
  const { meta, body } = parseFrontmatter(source, fileName);
  const inferredSlug = fileName.replace(/\.md$/i, "");
  const slug = String(meta.slug || inferredSlug).trim();
  const title = String(meta.title || slug).trim();
  const summary = String(meta.summary || body.split(/\r?\n/).find(Boolean) || "").trim();
  const publishedAt = String(meta.publishedAt || "").trim();

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
    body,
  };
}

function parseFrontmatter(source: string, fileName: string) {
  if (!source.startsWith("---")) {
    throw new Error(`${fileName} is missing frontmatter`);
  }

  const end = source.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error(`${fileName} frontmatter is not closed`);
  }

  const rawFrontmatter = source.slice(3, end).trim();
  const body = source.slice(end + 4).trim();
  const meta: Record<string, unknown> = {};

  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    meta[match[1]] = parseValue(match[2].trim());
  }

  return { meta, body };
}

function parseValue(value: string): unknown {
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

export function markdownToBlocks(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{2,3})\s+(.+)$/);
      if (heading) {
        return {
          type: heading[1].length === 2 ? "h2" : "h3",
          text: heading[2],
        } as const;
      }

      return {
        type: "p",
        text: block.replace(/\n/g, " "),
      } as const;
    });
}
