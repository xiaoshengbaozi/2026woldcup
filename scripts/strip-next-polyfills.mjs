import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const chunkDirs = [
  path.join(process.cwd(), ".next", "static", "chunks"),
  path.join(process.cwd(), "out", "_next", "static", "chunks"),
];

let updated = 0;

for (const dir of chunkDirs) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    continue;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
      .map(async (entry) => {
        const file = path.join(dir, entry.name);
        const source = await readFile(file, "utf8");
        const next = stripLegacyPolyfillModule(source);

        if (next !== source) {
          await writeFile(file, next);
          updated += 1;
        }
      })
  );
}

if (updated) {
  console.log(`Stripped legacy Next.js polyfills from ${updated} chunk${updated === 1 ? "" : "s"}.`);
}

function stripLegacyPolyfillModule(source) {
  const marker = "1572:function(){";
  const start = source.indexOf(marker);
  if (start === -1) return source;

  const bodyStart = start + marker.length - 1;
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const nextChar = source[index + 1];
        if (nextChar !== ",") return source;

        const moduleSource = source.slice(start, index + 2);
        if (
          !moduleSource.includes("Array.prototype.flat") ||
          !moduleSource.includes("Object.fromEntries") ||
          !moduleSource.includes("URL.canParse")
        ) {
          return source;
        }

        return `${source.slice(0, start)}1572:function(){},${source.slice(index + 2)}`;
      }
    }
  }

  return source;
}
