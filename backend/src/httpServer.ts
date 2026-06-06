import http from "http";
import { execFile } from "child_process";
import { timingSafeEqual } from "crypto";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { promisify } from "util";
import type { ApiFootballEndpoint, ApiFootballService } from "./apiFootball";
import type { HistoryBuffer } from "./historyBuffer";
import type { PlayerXTimelineService } from "./playerXTimeline";
import type { SnapshotCache } from "./snapshotCache";
import type { UserSystem } from "./userSystem";
import { renderAdminPageHtml } from "./adminPage";
import { deleteLiveChannel, getPublicLiveChannels, readLiveChannels, upsertLiveChannel } from "./liveChannels";
import type { CountryData, MatchLinesResponse } from "./types";
import { getWorldCupPlayerProfile, getWorldCupTopScorers } from "./playerProfileData";
import { getSiteAnalyticsStats, recordSiteHeartbeat, recordSiteVisit } from "./siteAnalytics";
import {
  getWorldCupFixtures,
  getWorldCupLiveFixtures,
  getWorldCupMatchDetail,
  getWorldCupRounds,
  getWorldCupSquads,
  getWorldCupStandings,
  getWorldCupWarmupFixtures,
} from "./worldCupData";

const execFileAsync = promisify(execFile);
const NEWS_SERVICE_DIR = process.env.NEWS_SERVICE_DIR || "/opt/worldcup-news";
const NEWS_SERVICE_ENV_FILE = process.env.NEWS_SERVICE_ENV_FILE || `${NEWS_SERVICE_DIR}/.env`;
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "worldcup2026-admin";
const DEFAULT_CORS_ORIGINS = [
  "https://ball.boyzi.fun",
  "https://beta-wzja.world-cup-2026-625.pages.dev",
  "https://world-cup-2026-625.pages.dev",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
];

interface HttpServerOptions {
  snapshotCache: SnapshotCache;
  historyBuffer: HistoryBuffer;
  wsServer: {
    getClientCount: () => number;
    getSubscribedClientCount: () => number;
  };
  apiFootball?: ApiFootballService;
  playerXTimeline?: PlayerXTimelineService;
  getState: () => {
    countries: CountryData[];
    sequenceNumber: number;
    startedAt: number;
    polymarketConnected: boolean;
    lastPolymarketUpdate: number | null;
    matchLines: MatchLinesResponse;
  };
  userSystem?: UserSystem;
}

export function createHttpServer(options: HttpServerOptions) {
  assertProductionAdminCredentials();

  return http.createServer((req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      sendEmpty(res, 200);
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    if ((pathname === "/admin" || pathname === "/admini" || url.pathname.startsWith("/api/admin/")) && !isAdminAuthorized(req)) {
      sendAdminUnauthorized(res);
      return;
    }

    if (url.pathname === "/api/admin/news-translation") {
      handleNewsTranslationSettings(req, res).catch((error: Error & { statusCode?: number }) => {
        sendJson(res, { error: error.message || "news_translation_settings_failed" }, error.statusCode ?? 500);
      });
      return;
    }

    if (url.pathname === "/api/live-channels" || url.pathname === "/api/admin/live-channels") {
      handleLiveChannelsRequest(req, url, res).catch((error: Error & { statusCode?: number }) => {
        sendJson(res, { error: error.message || "live_channels_failed" }, error.statusCode ?? 500);
      });
      return;
    }

    if (
      options.userSystem &&
      (url.pathname.startsWith("/api/auth/") ||
        url.pathname.startsWith("/api/avatar/") ||
        url.pathname === "/api/player-x-timeline" ||
        url.pathname === "/api/user-preferences" ||
        url.pathname.startsWith("/api/me/") ||
        url.pathname.startsWith("/api/admin/"))
    ) {
      options.userSystem.handleRequest(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      redirect(res, "/admin");
      return;
    }

    if (req.method === "GET" && (pathname === "/admin" || pathname === "/admini")) {
      sendHtml(res, renderAdminPage());
      return;
    }

    if (url.pathname === "/api/site-analytics") {
      handleSiteAnalyticsRequest(req, res).catch((error: Error & { statusCode?: number }) => {
        sendJson(res, { error: error.message || "site_analytics_failed" }, error.statusCode ?? 500);
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      const state = options.getState();
      sendJson(res, {
        status: state.polymarketConnected ? "ok" : "degraded",
        upstream: {
          polymarketConnected: state.polymarketConnected,
          lastUpdateTimestamp: state.lastPolymarketUpdate,
          apiFootballConfigured: options.apiFootball?.isConfigured() ?? false,
          xApi: options.playerXTimeline?.getRuntimeStats() ?? null,
        },
        clients: options.wsServer.getClientCount(),
        subscribedClients: options.wsServer.getSubscribedClientCount(),
        countries: state.countries.length,
        sequenceNumber: state.sequenceNumber,
        uptime: process.uptime(),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/cf-failover-active") {
      if (!isFailoverOriginActive()) {
        sendJson(res, { status: "standby" }, 503);
        return;
      }

      sendJson(res, { status: "active" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/status") {
      const state = options.getState();
      const snapshot = options.snapshotCache.getLatest();
      const sorted = [...state.countries].sort((a, b) => b.impliedProbability - a.impliedProbability);
      sendJson(res, {
        service: "worldcup-prediction-backend",
        status: state.polymarketConnected ? "online" : "degraded",
        startedAt: state.startedAt,
        uptimeMs: Date.now() - state.startedAt,
        clients: {
          total: options.wsServer.getClientCount(),
          subscribed: options.wsServer.getSubscribedClientCount(),
        },
        upstream: {
          polymarketConnected: state.polymarketConnected,
          lastUpdateTimestamp: state.lastPolymarketUpdate,
          apiFootballConfigured: options.apiFootball?.isConfigured() ?? false,
          xApi: options.playerXTimeline?.getRuntimeStats() ?? null,
        },
        data: {
          sequenceNumber: state.sequenceNumber,
          countryCount: state.countries.length,
          snapshotTimestamp: snapshot?.timestamp ?? null,
          matchLineCount: state.matchLines.count,
          matchLineTimestamp: state.matchLines.timestamp,
          leaders: sorted.slice(0, 8).map(toMarketSummary),
        },
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/news") {
      handleNewsRequest(url, res);
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/football/")) {
      handleApiFootballRequest(options.apiFootball, url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/player/one-vs-one") {
      getOneVsOnePlayerSummary(url)
        .then((payload) => sendJson(res, payload))
        .catch((error: Error & { statusCode?: number }) => {
          sendJson(res, { error: error.message || "one_vs_one_unavailable" }, error.statusCode ?? 500);
        });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/worldcup/")) {
      handleWorldCupRequest(options.apiFootball, url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/snapshot") {
      const snapshot = options.snapshotCache.getLatest();
      sendJson(res, snapshot ?? { type: "snapshot", timestamp: Date.now(), countries: [], events: [], history: {} });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/markets") {
      const state = options.getState();
      sendJson(res, {
        timestamp: Date.now(),
        count: state.countries.length,
        markets: [...state.countries]
          .sort((a, b) => b.impliedProbability - a.impliedProbability)
          .map(toMarketSummary),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/match-lines") {
      sendJson(res, options.getState().matchLines);
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/history/")) {
      const countryCode = decodeURIComponent(url.pathname.split("/").pop() ?? "").toUpperCase();
      const now = Date.now();
      const from = Number(url.searchParams.get("from") ?? now - 24 * 60 * 60 * 1000);
      const to = Number(url.searchParams.get("to") ?? now);
      sendJson(res, {
        countryCode,
        from,
        to,
        data: options.historyBuffer.getHistory(countryCode, from, to),
      });
      return;
    }

    sendJson(res, { error: "not_found", path: url.pathname }, 404);
  });
}

function isFailoverOriginActive() {
  const activeFile = process.env.CF_FAILOVER_ACTIVE_FILE;
  if (activeFile) return existsSync(activeFile);
  return process.env.CF_FAILOVER_ACTIVE !== "false";
}

async function handleSiteAnalyticsRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === "GET") {
    sendJson(res, await getSiteAnalyticsStats());
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, { error: "method_not_allowed" }, 405);
    return;
  }

  const body = await readJsonBody(req);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const action = body.action === "heartbeat" ? "heartbeat" : "view";

  if (action === "heartbeat") {
    sendJson(res, await recordSiteHeartbeat(sessionId));
    return;
  }

  sendJson(res, await recordSiteVisit(sessionId));
}

function handleWorldCupRequest(
  apiFootball: ApiFootballService | undefined,
  url: URL,
  res: http.ServerResponse
) {
  if (!apiFootball) {
    sendJson(res, { error: "api_football_gateway_unavailable" }, 503);
    return;
  }

  const handlers: Record<string, (apiFootball: ApiFootballService, url: URL) => Promise<unknown>> = {
    "/api/worldcup/fixtures": getWorldCupFixtures,
    "/api/worldcup/live": getWorldCupLiveFixtures,
    "/api/worldcup/rounds": getWorldCupRounds,
    "/api/worldcup/standings": getWorldCupStandings,
    "/api/worldcup/match-detail": getWorldCupMatchDetail,
    "/api/worldcup/player-profile": getWorldCupPlayerProfile,
    "/api/worldcup/top-scorers": getWorldCupTopScorers,
    "/api/worldcup/squads": getWorldCupSquads,
    "/api/worldcup/warmups": getWorldCupWarmupFixtures,
  };

  const handler = handlers[url.pathname.replace(/\/+$/, "")];
  if (!handler) {
    sendJson(res, { error: "worldcup_endpoint_not_found" }, 404);
    return;
  }

  handler(apiFootball, url)
    .then((payload) => sendJson(res, payload))
    .catch((error: Error & { statusCode?: number; details?: unknown }) => {
      sendJson(
        res,
        {
          error: error.message || "worldcup_data_request_failed",
          details: error.details,
        },
        error.statusCode ?? 500
      );
    });
}

function handleApiFootballRequest(
  apiFootball: ApiFootballService | undefined,
  url: URL,
  res: http.ServerResponse
) {
  if (!apiFootball) {
    sendJson(res, { error: "api_football_gateway_unavailable" }, 503);
    return;
  }

  const endpoint = parseApiFootballEndpoint(url.pathname);
  if (!endpoint) {
    sendJson(res, { error: "api_football_endpoint_not_allowed" }, 404);
    return;
  }

  apiFootball
    .request(endpoint, url.searchParams)
    .then((payload) => sendJson(res, payload))
    .catch((error: Error & { statusCode?: number; details?: unknown }) => {
      sendJson(
        res,
        {
          error: error.message || "api_football_request_failed",
          details: error.details,
        },
        error.statusCode ?? 500
      );
    });
}

function parseApiFootballEndpoint(pathname: string): ApiFootballEndpoint | null {
  const endpoint = pathname.replace(/^\/api\/football\/?/, "").replace(/\/+$/, "");
  const allowed = new Set<ApiFootballEndpoint>([
    "fixtures",
    "fixtures/rounds",
    "fixtures/statistics",
    "fixtures/lineups",
    "fixtures/events",
    "fixtures/players",
    "fixtures/headtohead",
    "players",
    "players/profiles",
    "players/squads",
    "players/topscorers",
    "players/topassists",
    "players/topyellowcards",
    "players/topredcards",
    "standings",
    "injuries",
    "teams",
    "transfers",
    "trophies",
    "sidelined",
    "leagues",
    "coachs",
    "predictions",
    "odds",
    "odds/live",
  ]);

  return allowed.has(endpoint as ApiFootballEndpoint) ? (endpoint as ApiFootballEndpoint) : null;
}

function isAdminAuthorized(req: http.IncomingMessage) {
  const authorization = req.headers.authorization ?? "";
  if (!authorization.startsWith("Basic ")) return false;

  const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return safeEqual(username, process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME) && safeEqual(password, process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD);
}

function assertProductionAdminCredentials() {
  if (process.env.NODE_ENV !== "production") return;

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD must be set when NODE_ENV=production."
    );
  }
}

function safeEqual(value: string, expected: string) {
  const supplied = Buffer.from(value);
  const target = Buffer.from(expected);
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}

function sendAdminUnauthorized(res: http.ServerResponse) {
  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="World Cup Admin"',
  });
  res.end("Admin credentials required.");
}

function handleNewsRequest(url: URL, res: http.ServerResponse) {
  const newsApi = (process.env.NEWS_API_URL || process.env.NEXT_PUBLIC_NEWS_API_URL || "https://news.20250114.xyz")
    .replace(/\/+$/, "");
  const params = new URLSearchParams(url.searchParams);
  if (!params.has("limit")) params.set("limit", "24");

  fetch(`${newsApi}/api/news?${params.toString()}`, { cache: "no-store" })
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        sendJson(res, { error: "news_api_request_failed", status: response.status, details: payload }, response.status);
        return;
      }
      sendJson(res, {
        source: "news-api",
        endpoint: newsApi,
        timestamp: Date.now(),
        ...payload,
      });
    })
    .catch((error: Error) => {
      sendJson(res, { error: error.message || "news_api_unavailable" }, 502);
    });
}

async function handleLiveChannelsRequest(req: http.IncomingMessage, url: URL, res: http.ServerResponse) {
  const isAdmin = url.pathname === "/api/admin/live-channels";

  if (!isAdmin) {
    if (req.method !== "GET") {
      sendJson(res, { error: "method_not_allowed" }, 405);
      return;
    }
    const matchId = url.searchParams.get("matchId")?.trim();
    if (!matchId) {
      sendJson(res, { error: "missing_match_id" }, 400);
      return;
    }
    sendJson(res, { channels: await getPublicLiveChannels(matchId) });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, { channels: await readLiveChannels() });
    return;
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    sendJson(res, { channel: await upsertLiveChannel(body) });
    return;
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id")?.trim();
    if (!id) {
      sendJson(res, { error: "missing_channel_id" }, 400);
      return;
    }
    sendJson(res, await deleteLiveChannel(id));
    return;
  }

  sendJson(res, { error: "method_not_allowed" }, 405);
}

async function handleNewsTranslationSettings(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, { error: "method_not_allowed" }, 405);
    return;
  }

  if (req.method === "GET") {
    sendJson(res, await readNewsTranslationSettings());
    return;
  }

  const body = await readJsonBody(req);
  const next = await updateNewsTranslationSettings({
    listTranslationEnabled: typeof body.listTranslationEnabled === "boolean" ? body.listTranslationEnabled : undefined,
    articleTranslationEnabled: typeof body.articleTranslationEnabled === "boolean" ? body.articleTranslationEnabled : undefined,
  });
  await restartNewsService();
  sendJson(res, { ok: true, restarted: true, ...next });
}

async function readNewsTranslationSettings() {
  const env = parseEnvFile(await readFile(NEWS_SERVICE_ENV_FILE, "utf8"));
  return {
    serviceDir: NEWS_SERVICE_DIR,
    listTranslationEnabled: parseEnvBoolean(env.NEWS_LIST_TRANSLATION_ENABLED, true),
    articleTranslationEnabled: parseEnvBoolean(env.NEWS_ARTICLE_TRANSLATION_ENABLED, false),
    model: env.OPENAI_TRANSLATION_MODEL || "deepseek-v4-flash",
    target: env.OPENAI_TRANSLATION_TARGET || "Simplified Chinese",
    batchSize: Number(env.TRANSLATION_BATCH_SIZE || 4),
  };
}

async function updateNewsTranslationSettings(settings: {
  listTranslationEnabled?: boolean;
  articleTranslationEnabled?: boolean;
}) {
  const raw = await readFile(NEWS_SERVICE_ENV_FILE, "utf8");
  const next = upsertEnvValue(
    upsertEnvValue(raw, "NEWS_LIST_TRANSLATION_ENABLED", settings.listTranslationEnabled),
    "NEWS_ARTICLE_TRANSLATION_ENABLED",
    settings.articleTranslationEnabled
  );
  await writeFile(NEWS_SERVICE_ENV_FILE, next, "utf8");
  return readNewsTranslationSettings();
}

function parseEnvFile(raw: string) {
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

function parseEnvBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

function upsertEnvValue(raw: string, key: string, value: boolean | undefined) {
  if (value === undefined) return raw;
  const line = `${key}=${value ? "true" : "false"}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(raw)) return raw.replace(pattern, line);
  return `${raw.trimEnd()}\n${line}\n`;
}

async function restartNewsService() {
  await execFileAsync("docker", ["compose", "up", "-d", "--force-recreate", "worldcup-news"], {
    cwd: NEWS_SERVICE_DIR,
    timeout: 120000,
    windowsHide: true,
  });
}

function readJsonBody(req: http.IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("invalid_json_body"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

async function getOneVsOnePlayerSummary(url: URL) {
  const name = url.searchParams.get("name")?.trim();
  if (!name) {
    const error = new Error("missing_name") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const candidates = buildOneVsOneSlugCandidates(name);
  for (const slug of candidates) {
    const profileUrl = `https://one-versus-one.com/en/players/${slug}`;
    const response = await fetch(profileUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 compatible; WorldCupDashboard/1.0",
      },
    });

    if (!response.ok) continue;

    const html = await response.text();
    const jsonLd = parseOneVsOnePersonJsonLd(html);
    return {
      source: "one-versus-one",
      url: profileUrl,
      found: true,
      player: {
        name: [jsonLd?.givenName, jsonLd?.familyName].filter(Boolean).join(" ") || name,
        birthDate: jsonLd?.birthDate ?? null,
        nationality: jsonLd?.nationality ?? null,
        image: toOneVsOneAbsoluteUrl(jsonLd?.image),
        teamName: extractOneVsOneTeamName(jsonLd?.affiliation?.["@id"]),
        teamUrl: jsonLd?.affiliation?.["@id"] ?? null,
      },
    };
  }

  return {
    source: "one-versus-one",
    found: false,
    url: null,
    player: null,
  };
}

function buildOneVsOneSlugCandidates(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" ").filter(Boolean);
  const candidates = new Set<string>();

  if (parts.length >= 2) {
    candidates.add(parts.join("-"));
    candidates.add([parts[0], parts[parts.length - 1]].join("-"));
    candidates.add(parts.slice(0, 3).join("-"));
  }
  candidates.add(cleaned.replace(/\s+/g, "-"));

  return [...candidates].filter(Boolean);
}

function parseOneVsOnePersonJsonLd(html: string) {
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const raw = block
      .replace(/^<script type="application\/ld\+json">/i, "")
      .replace(/<\/script>$/i, "")
      .replace(/,\s*}/g, "}")
      .trim();

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.["@type"] === "Person") return parsed;
    } catch {
      // Some 1vs1 pages include permissive JSON-LD. Ignore malformed blocks.
    }
  }
  return null;
}

function toOneVsOneAbsoluteUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  return `https://one-versus-one.com${value.startsWith("/") ? "" : "/"}${value}`;
}

function extractOneVsOneTeamName(value: string | null | undefined) {
  if (!value) return null;
  const slug = value.split("/").filter(Boolean).pop();
  return slug ? decodeURIComponent(slug).replace(/-/g, " ") : null;
}

function toMarketSummary(country: CountryData) {
  return {
    countryCode: country.countryCode,
    countryName: country.countryName,
    flagEmoji: country.flagEmoji,
    impliedProbability: country.impliedProbability,
    yesPrice: country.yesPrice,
    delta1m: country.delta1m,
    delta5m: country.delta5m,
    delta1h: country.delta1h,
    delta24h: country.delta24h,
    volume24h: country.volume24h,
    volume5m: country.volume5m,
    spread: country.spread,
    liquidity: country.liquidity,
    lastUpdated: country.lastUpdated,
  };
}

function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse) {
  const allowedOrigins = getAllowedCorsOrigins();
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
    if (isCredentialedCorsPath(pathname)) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getAllowedCorsOrigins() {
  const configured = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== "*");
  return new Set(configured.length ? configured : DEFAULT_CORS_ORIGINS);
}

function isCredentialedCorsPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname === "/admini" ||
    pathname === "/api/user-preferences" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/avatar/") ||
    pathname.startsWith("/api/me/") ||
    pathname.startsWith("/api/admin/")
  );
}

function sendEmpty(res: http.ServerResponse, statusCode: number) {
  res.writeHead(statusCode);
  res.end();
}

function redirect(res: http.ServerResponse, location: string) {
  res.writeHead(302, { Location: location });
  res.end();
}

function sendJson(res: http.ServerResponse, payload: unknown, statusCode = 200) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendHtml(res: http.ServerResponse, html: string) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function renderAdminPage() {
  return renderAdminPageHtml();
}

function renderAdminPageLegacy() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>World Cup Market Gateway</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050708;
      --panel: rgba(255,255,255,.065);
      --panel-2: rgba(255,255,255,.035);
      --line: rgba(255,255,255,.1);
      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.52);
      --faint: rgba(255,255,255,.32);
      --volt: #d8ff3e;
      --cyan: #5ce1e6;
      --red: #ff5b6e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 20% 0%, rgba(216,255,62,.14), transparent 34rem),
        radial-gradient(circle at 85% 20%, rgba(92,225,230,.12), transparent 30rem),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: clamp(26px, 4vw, 44px); letter-spacing: -.02em; }
    p { margin: 0; color: var(--muted); }
    .pill {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 999px;
      background: var(--panel); border: 1px solid var(--line); backdrop-filter: blur(20px);
      font-size: 12px; text-transform: uppercase; letter-spacing: .12em;
    }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--faint); box-shadow: 0 0 18px currentColor; }
    .dot.ok { background: var(--volt); color: var(--volt); }
    .dot.bad { background: var(--red); color: var(--red); }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .card {
      border-radius: 28px; padding: 20px; background: linear-gradient(145deg, var(--panel), var(--panel-2));
      border: 1px solid var(--line); box-shadow: 0 24px 80px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter: blur(22px);
    }
    .metric span { display: block; color: var(--faint); font-size: 11px; text-transform: uppercase; letter-spacing: .14em; }
    .metric strong { display: block; margin-top: 10px; font-size: 28px; letter-spacing: -.02em; }
    .wide { grid-column: span 2; }
    .full { grid-column: 1 / -1; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 13px 10px; border-bottom: 1px solid rgba(255,255,255,.075); text-align: left; font-size: 13px; }
    th { color: var(--faint); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; }
    td:nth-child(3), td:nth-child(4), td:nth-child(5) { font-variant-numeric: tabular-nums; }
    .prob { color: var(--volt); font-weight: 700; }
    .muted { color: var(--muted); }
    .endpoints { display: grid; gap: 10px; margin-top: 12px; }
    code {
      display: block; padding: 12px 14px; border-radius: 16px; background: rgba(0,0,0,.32);
      border: 1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.78); overflow: auto;
    }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } .wide { grid-column: span 1; } header { align-items: start; flex-direction: column; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Market Gateway</h1>
        <p>Polymarket World Cup 2026 data service</p>
      </div>
      <div class="pill"><i id="statusDot" class="dot"></i><span id="statusText">Loading</span></div>
    </header>

    <section class="grid">
      <div class="card metric"><span>Countries</span><strong id="countryCount">--</strong></div>
      <div class="card metric"><span>Clients</span><strong id="clientCount">--</strong></div>
      <div class="card metric"><span>Sequence</span><strong id="sequenceNumber">--</strong></div>
      <div class="card metric"><span>Uptime</span><strong id="uptime">--</strong></div>

      <div class="card wide">
        <h2>API Endpoints</h2>
        <div class="endpoints">
          <code>GET /api/health</code>
          <code>GET /api/status</code>
          <code>GET /api/snapshot</code>
          <code>GET /api/markets</code>
          <code>GET /api/history/:countryCode?from=&to=</code>
          <code>GET /api/match-lines</code>
          <code>WS /</code>
        </div>
      </div>

      <div class="card wide">
        <h2>Upstream</h2>
        <p id="upstream">Waiting for Polymarket status...</p>
        <p class="muted" id="lastUpdate" style="margin-top:14px;"></p>
      </div>

      <div class="card full">
        <h2>Leaders</h2>
        <table>
          <thead><tr><th>Team</th><th>Code</th><th>Probability</th><th>24h</th><th>Spread</th></tr></thead>
          <tbody id="leaders"><tr><td colspan="5" class="muted">Loading...</td></tr></tbody>
        </table>
      </div>
    </section>
  </main>
  <script>
    const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
    const clock = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
    function relative(ms) {
      if (!ms) return "--";
      const seconds = Math.round((ms - Date.now()) / 1000);
      if (Math.abs(seconds) < 60) return clock.format(seconds, "second");
      const minutes = Math.round(seconds / 60);
      return clock.format(minutes, "minute");
    }
    async function refresh() {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      const online = data.status === "online";
      document.getElementById("statusDot").className = "dot " + (online ? "ok" : "bad");
      document.getElementById("statusText").textContent = online ? "Online" : "Degraded";
      document.getElementById("countryCount").textContent = data.data.countryCount;
      document.getElementById("clientCount").textContent = data.clients.total + "/" + data.clients.subscribed;
      document.getElementById("sequenceNumber").textContent = data.data.sequenceNumber;
      document.getElementById("uptime").textContent = Math.floor(data.uptimeMs / 60000) + "m";
      document.getElementById("upstream").textContent = data.upstream.polymarketConnected ? "Connected to Polymarket CLOB WebSocket" : "Polymarket connection is reconnecting";
      document.getElementById("lastUpdate").textContent = "Last update " + relative(data.upstream.lastUpdateTimestamp);
      document.getElementById("lastUpdate").textContent += " · Match lines " + data.data.matchLineCount;
      document.getElementById("leaders").innerHTML = data.data.leaders.map((item) => \`
        <tr>
          <td>\${item.flagEmoji} \${item.countryName}</td>
          <td class="muted">\${item.countryCode}</td>
          <td class="prob">\${fmt.format(item.impliedProbability)}%</td>
          <td>\${fmt.format(item.delta24h)}%</td>
          <td>\${fmt.format(item.spread)}¢</td>
        </tr>
      \`).join("");
    }
    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
}
