import http from "http";
import type { HistoryBuffer } from "./historyBuffer";
import type { SnapshotCache } from "./snapshotCache";
import type { CountryData, MatchLinesResponse } from "./types";

interface HttpServerOptions {
  snapshotCache: SnapshotCache;
  historyBuffer: HistoryBuffer;
  wsServer: {
    getClientCount: () => number;
    getSubscribedClientCount: () => number;
  };
  getState: () => {
    countries: CountryData[];
    sequenceNumber: number;
    startedAt: number;
    polymarketConnected: boolean;
    lastPolymarketUpdate: number | null;
    matchLines: MatchLinesResponse;
  };
}

export function createHttpServer(options: HttpServerOptions) {
  return http.createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      sendEmpty(res, 200);
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/") {
      redirect(res, "/admin");
      return;
    }

    if (req.method === "GET" && url.pathname === "/admin") {
      sendHtml(res, renderAdminPage());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      const state = options.getState();
      sendJson(res, {
        status: state.polymarketConnected ? "ok" : "degraded",
        upstream: {
          polymarketConnected: state.polymarketConnected,
          lastUpdateTimestamp: state.lastPolymarketUpdate,
        },
        clients: options.wsServer.getClientCount(),
        subscribedClients: options.wsServer.getSubscribedClientCount(),
        countries: state.countries.length,
        sequenceNumber: state.sequenceNumber,
        uptime: process.uptime(),
      });
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

function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
