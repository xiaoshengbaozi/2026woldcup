export function renderAdminPageHtml() {
  return String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>世界杯市场网关管理台</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050708;
      --panel: rgba(255, 255, 255, .075);
      --panel-2: rgba(255, 255, 255, .035);
      --line: rgba(255, 255, 255, .11);
      --text: rgba(255, 255, 255, .93);
      --muted: rgba(255, 255, 255, .58);
      --faint: rgba(255, 255, 255, .34);
      --volt: #d8ff3e;
      --cyan: #5ce1e6;
      --red: #ff5b6e;
      --amber: #ffd166;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 18% 0%, rgba(216,255,62,.14), transparent 34rem),
        radial-gradient(circle at 86% 18%, rgba(92,225,230,.12), transparent 30rem),
        linear-gradient(180deg, rgba(255,255,255,.035), transparent 38vh),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    main { width: min(1220px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 44px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: clamp(28px, 4vw, 46px); font-weight: 760; letter-spacing: 0; }
    h2 { margin: 0 0 16px; font-size: 18px; font-weight: 680; letter-spacing: 0; }
    h3 { margin: 0; font-size: 14px; font-weight: 680; }
    p { margin: 0; color: var(--muted); }
    .eyebrow { margin-bottom: 10px; color: var(--cyan); font-size: 12px; letter-spacing: .14em; text-transform: uppercase; }
    .pill, .tab {
      display: inline-flex; align-items: center; gap: 8px; border-radius: 999px;
      background: rgba(255,255,255,.07); border: 1px solid var(--line); backdrop-filter: blur(20px);
    }
    .pill { padding: 10px 14px; font-size: 12px; color: rgba(255,255,255,.82); }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--faint); box-shadow: 0 0 18px currentColor; }
    .dot.ok { background: var(--volt); color: var(--volt); }
    .dot.bad { background: var(--red); color: var(--red); }
    .dot.warn { background: var(--amber); color: var(--amber); }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 18px; }
    .tab {
      min-height: 42px; padding: 0 16px; color: var(--muted); cursor: pointer; transition: .2s ease;
      font: inherit; font-size: 13px;
    }
    .tab:hover, .tab.active { color: white; border-color: rgba(216,255,62,.34); background: rgba(216,255,62,.1); box-shadow: 0 0 34px rgba(216,255,62,.08); }
    .view { display: none; }
    .view.active { display: block; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .card {
      border-radius: 30px; padding: 20px; background: linear-gradient(145deg, var(--panel), var(--panel-2));
      border: 1px solid var(--line); box-shadow: 0 24px 80px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter: blur(24px);
    }
    .metric span { display: block; color: var(--faint); font-size: 12px; }
    .metric strong { display: block; margin-top: 10px; font-size: 30px; letter-spacing: 0; font-variant-numeric: tabular-nums; }
    .wide { grid-column: span 2; }
    .full { grid-column: 1 / -1; }
    .stack { display: grid; gap: 12px; }
    .mini-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .mini {
      border-radius: 22px; padding: 14px; background: rgba(0,0,0,.22);
      border: 1px solid rgba(255,255,255,.075);
    }
    .mini span { display: block; color: var(--faint); font-size: 12px; }
    .mini strong { display: block; margin-top: 8px; color: white; font-size: 22px; font-variant-numeric: tabular-nums; }
    .status-row, .match-row {
      display: grid; gap: 12px; align-items: center; border-radius: 22px;
      background: rgba(0,0,0,.22); border: 1px solid rgba(255,255,255,.075); padding: 14px;
    }
    .status-row { grid-template-columns: auto 1fr auto; }
    .match-row { grid-template-columns: 1.4fr auto 1.4fr auto; }
    .team { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .team strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .score { min-width: 76px; text-align: center; color: var(--volt); font-size: 24px; font-weight: 760; font-variant-numeric: tabular-nums; }
    .badge {
      display: inline-flex; width: fit-content; align-items: center; gap: 6px; border-radius: 999px;
      padding: 7px 10px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.055);
      color: rgba(255,255,255,.76); font-size: 12px; white-space: nowrap;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 13px 10px; border-bottom: 1px solid rgba(255,255,255,.075); text-align: left; font-size: 13px; }
    th { color: var(--faint); font-size: 12px; font-weight: 580; }
    td:nth-child(3), td:nth-child(4), td:nth-child(5) { font-variant-numeric: tabular-nums; }
    .prob { color: var(--volt); font-weight: 720; }
    .muted { color: var(--muted); }
    .endpoints { display: grid; gap: 10px; }
    code {
      display: block; padding: 12px 14px; border-radius: 16px; background: rgba(0,0,0,.32);
      border: 1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.78); overflow: auto;
    }
    @media (max-width: 920px) {
      header { align-items: start; flex-direction: column; }
      .grid { grid-template-columns: 1fr; }
      .wide { grid-column: span 1; }
      .mini-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .match-row { grid-template-columns: 1fr auto; }
      .match-row .score { order: 3; text-align: left; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <div class="eyebrow">World Cup 2026 Control Plane</div>
        <h1>世界杯市场网关管理台</h1>
        <p>实时监控 Polymarket、api-football 与比赛数据服务</p>
      </div>
      <div class="pill"><i id="statusDot" class="dot"></i><span id="statusText">正在加载</span></div>
    </header>

    <nav class="tabs" aria-label="管理面板导航">
      <button class="tab active" data-tab="overview" type="button">总览</button>
      <button class="tab" data-tab="live" type="button">比赛实况</button>
      <button class="tab" data-tab="news" type="button">新闻</button>
      <button class="tab" data-tab="endpoints" type="button">接口清单</button>
    </nav>

    <section id="overview" class="view active">
      <div class="grid">
        <div class="card metric"><span>国家数量</span><strong id="countryCount">--</strong></div>
        <div class="card metric"><span>客户端</span><strong id="clientCount">--</strong></div>
        <div class="card metric"><span>序列号</span><strong id="sequenceNumber">--</strong></div>
        <div class="card metric"><span>运行时长</span><strong id="uptime">--</strong></div>

        <div class="card wide">
          <h2>上游状态</h2>
          <div class="stack" id="upstreamRows">
            <div class="status-row"><i class="dot warn"></i><div><h3>正在读取</h3><p>等待服务状态返回</p></div><span class="badge">--</span></div>
          </div>
        </div>

        <div class="card wide">
          <h2>数据新鲜度</h2>
          <div class="stack">
            <div class="status-row"><i class="dot" id="marketDot"></i><div><h3>市场行情</h3><p id="lastUpdate">--</p></div><span class="badge" id="matchLineCount">--</span></div>
            <div class="status-row"><i class="dot" id="footballDot"></i><div><h3>api-football</h3><p id="footballFreshness">--</p></div><span class="badge" id="footballCache">--</span></div>
          </div>
        </div>

        <div class="card full">
          <h2>夺冠概率领先队伍</h2>
          <table>
            <thead><tr><th>球队</th><th>代码</th><th>概率</th><th>24 小时</th><th>价差</th></tr></thead>
            <tbody id="leaders"><tr><td colspan="5" class="muted">正在加载...</td></tr></tbody>
          </table>
        </div>
      </div>
    </section>

    <section id="live" class="view">
      <div class="grid">
        <div class="card metric"><span>实况比赛</span><strong id="liveCount">--</strong></div>
        <div class="card metric"><span>api-football</span><strong id="apiFootballState">--</strong></div>
        <div class="card metric"><span>已加载球员</span><strong id="playerCount">--</strong></div>
        <div class="card metric"><span>更新时间</span><strong id="liveUpdatedAt">--</strong></div>
        <div class="card full">
          <h2>数据详情</h2>
          <div class="mini-grid">
            <div class="mini"><span>赛程总数</span><strong id="fixtureCount">--</strong></div>
            <div class="mini"><span>参赛球队</span><strong id="teamCount">--</strong></div>
            <div class="mini"><span>正式小组</span><strong id="standingGroupCount">--</strong></div>
            <div class="mini"><span>第三名排名</span><strong id="thirdPlaceGroupCount">--</strong></div>
            <div class="mini"><span>积分榜球队</span><strong id="standingRowCount">--</strong></div>
            <div class="mini"><span>未开始</span><strong id="scheduledCount">--</strong></div>
            <div class="mini"><span>已结束</span><strong id="finishedCount">--</strong></div>
            <div class="mini"><span>中断/延期</span><strong id="interruptedCount">--</strong></div>
            <div class="mini"><span>球员覆盖队伍</span><strong id="squadTeamCount">--</strong></div>
          </div>
        </div>
        <div class="card full">
          <h2>比赛实况</h2>
          <div class="stack" id="liveMatches">
            <div class="status-row"><i class="dot warn"></i><div><h3>正在加载</h3><p>读取世界杯实时比赛列表</p></div><span class="badge">LIVE</span></div>
          </div>
        </div>
        <div class="card full">
          <h2>近期比赛</h2>
          <div class="stack" id="upcomingMatches">
            <div class="status-row"><i class="dot warn"></i><div><h3>正在加载</h3><p>读取最近赛程</p></div><span class="badge">赛程</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="news" class="view">
      <div class="grid">
        <div class="card metric"><span>新闻条数</span><strong id="newsCount">--</strong></div>
        <div class="card metric"><span>新闻总量</span><strong id="newsTotal">--</strong></div>
        <div class="card metric"><span>来源数量</span><strong id="newsSourceCount">--</strong></div>
        <div class="card metric"><span>同步状态</span><strong id="newsState">--</strong></div>

        <div class="card wide">
          <h2>新闻 API 状态</h2>
          <div class="stack">
            <div class="status-row"><i class="dot" id="newsDot"></i><div><h3>聚合新闻服务</h3><p id="newsFreshness">--</p></div><span class="badge" id="newsErrors">--</span></div>
            <div class="status-row"><i class="dot ok"></i><div><h3>新闻端点</h3><p id="newsEndpoint">--</p></div><span class="badge">/api/news</span></div>
          </div>
        </div>

        <div class="card wide">
          <h2>新闻来源</h2>
          <div class="stack" id="newsSources">
            <div class="status-row"><i class="dot warn"></i><div><h3>正在加载</h3><p>统计新闻来源</p></div><span class="badge">来源</span></div>
          </div>
        </div>

        <div class="card full">
          <h2>最新新闻</h2>
          <div class="stack" id="newsItems">
            <div class="status-row"><i class="dot warn"></i><div><h3>正在加载</h3><p>读取新闻 API 数据</p></div><span class="badge">NEWS</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="endpoints" class="view">
      <div class="grid">
        <div class="card wide">
          <h2>核心接口</h2>
          <div class="endpoints">
            <code>GET /api/health</code>
            <code>GET /api/status</code>
            <code>GET /api/snapshot</code>
            <code>GET /api/markets</code>
            <code>GET /api/history/:countryCode?from=&to=</code>
            <code>GET /api/match-lines</code>
            <code>GET /api/news?limit=24</code>
            <code>WS /</code>
          </div>
        </div>
        <div class="card wide">
          <h2>世界杯与 api-football</h2>
          <div class="endpoints">
            <code>GET /api/worldcup/fixtures</code>
            <code>GET /api/worldcup/live</code>
            <code>GET /api/worldcup/rounds</code>
            <code>GET /api/worldcup/standings</code>
            <code>GET /api/worldcup/match-detail?fixture=</code>
            <code>GET /api/football/fixtures?league=1&season=2026</code>
            <code>GET /api/football/odds/live</code>
          </div>
        </div>
      </div>
    </section>
  </main>
  <script>
    const fmt = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });
    const timeFmt = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" });

    function byId(id) { return document.getElementById(id); }
    function percent(value) { return Number.isFinite(value) ? fmt.format(value) + "%" : "--"; }
    function minutes(ms) { return Math.max(0, Math.floor(ms / 60000)) + " 分钟"; }
    function fromNow(ms) {
      if (!ms) return "暂无更新";
      const diff = Date.now() - ms;
      if (diff < 60000) return "刚刚更新";
      if (diff < 3600000) return Math.round(diff / 60000) + " 分钟前更新";
      return Math.round(diff / 3600000) + " 小时前更新";
    }
    function fixtureTime(value) {
      if (!value) return "--";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "--";
      return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
    }
    function newsTime(value) {
      if (!value) return "--";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "--";
      return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
    }
    function statusDotClass(ok, warn) { return "dot " + (ok ? "ok" : warn ? "warn" : "bad"); }

    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (item) { item.classList.remove("active"); });
        document.querySelectorAll(".view").forEach(function (item) { item.classList.remove("active"); });
        tab.classList.add("active");
        byId(tab.dataset.tab).classList.add("active");
      });
    });

    async function refreshStatus() {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      const online = data.status === "online";
      byId("statusDot").className = statusDotClass(online, false);
      byId("statusText").textContent = online ? "在线" : "降级运行";
      byId("countryCount").textContent = data.data.countryCount;
      byId("clientCount").textContent = data.clients.total + "/" + data.clients.subscribed;
      byId("sequenceNumber").textContent = data.data.sequenceNumber;
      byId("uptime").textContent = minutes(data.uptimeMs);
      byId("marketDot").className = statusDotClass(data.upstream.polymarketConnected, false);
      byId("lastUpdate").textContent = fromNow(data.upstream.lastUpdateTimestamp);
      byId("matchLineCount").textContent = data.data.matchLineCount + " 条比赛盘口";

      const apiConfigured = Boolean(data.upstream.apiFootballConfigured);
      byId("apiFootballState").textContent = apiConfigured ? "已接入" : "未配置";
      byId("footballDot").className = statusDotClass(apiConfigured, false);

      byId("upstreamRows").innerHTML =
        upstreamRow(data.upstream.polymarketConnected, "Polymarket", data.upstream.polymarketConnected ? "CLOB WebSocket 已连接" : "正在重连市场行情", data.upstream.polymarketConnected ? "在线" : "降级") +
        upstreamRow(apiConfigured, "api-football", apiConfigured ? "API Key 已配置，可读取赛程与实况" : "缺少 API_FOOTBALL_KEY", apiConfigured ? "已配置" : "不可用");

      byId("leaders").innerHTML = data.data.leaders.map(function (item) {
        return "<tr><td>" + item.flagEmoji + " " + item.countryName + "</td><td class=\"muted\">" + item.countryCode + "</td><td class=\"prob\">" + percent(item.impliedProbability) + "</td><td>" + percent(item.delta24h) + "</td><td>" + fmt.format(item.spread) + "¢</td></tr>";
      }).join("");
    }

    function upstreamRow(ok, title, text, badge) {
      return "<div class=\"status-row\"><i class=\"" + statusDotClass(ok, false) + "\"></i><div><h3>" + title + "</h3><p>" + text + "</p></div><span class=\"badge\">" + badge + "</span></div>";
    }

    async function refreshLive() {
      try {
        const res = await fetch("/api/worldcup/live", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "worldcup_live_failed");

        byId("liveCount").textContent = data.count;
        byId("liveUpdatedAt").textContent = data.timestamp ? timeFmt.format(new Date(data.timestamp)) : "--";
        byId("footballFreshness").textContent = fromNow(data.timestamp);
        byId("footballCache").textContent = data.cached ? "缓存命中" : "实时请求";
        byId("footballDot").className = statusDotClass(true, false);

        const fixtures = Array.isArray(data.fixtures) ? data.fixtures : [];
        if (!fixtures.length) {
          byId("liveMatches").innerHTML = "<div class=\"status-row\"><i class=\"dot warn\"></i><div><h3>当前没有进行中的世界杯比赛</h3><p>接口正常返回，暂无 live=all 的比赛数据。</p></div><span class=\"badge\">0 场</span></div>";
          return;
        }

        byId("liveMatches").innerHTML = fixtures.map(function (match) {
          const home = match.homeTeam || {};
          const away = match.awayTeam || {};
          const score = ((match.score && match.score.home) ?? "-") + " : " + ((match.score && match.score.away) ?? "-");
          const minute = match.elapsed ? match.elapsed + "'" : match.statusLabel || "实况";
          const venue = match.location || match.stage || "";
          return "<article class=\"match-row\"><div class=\"team\"><strong>" + (home.name || "主队") + "</strong><span class=\"muted\">" + (home.code || "") + "</span></div><div class=\"score\">" + score + "</div><div class=\"team\"><strong>" + (away.name || "客队") + "</strong><span class=\"muted\">" + (away.code || venue) + "</span></div><span class=\"badge\">" + minute + "</span></article>";
        }).join("");
      } catch (error) {
        byId("liveCount").textContent = "--";
        byId("liveUpdatedAt").textContent = "--";
        byId("footballFreshness").textContent = "api-football 实况读取失败";
        byId("footballCache").textContent = "不可用";
        byId("footballDot").className = statusDotClass(false, false);
        byId("liveMatches").innerHTML = "<div class=\"status-row\"><i class=\"dot bad\"></i><div><h3>比赛实况不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\"badge\">错误</span></div>";
      }
    }

    async function refreshFootballDetails() {
      try {
        const [fixturesRes, standingsRes] = await Promise.all([
          fetch("/api/worldcup/fixtures", { cache: "no-store" }),
          fetch("/api/worldcup/standings", { cache: "no-store" })
        ]);
        const fixturesData = await fixturesRes.json();
        const standingsData = await standingsRes.json();
        if (!fixturesRes.ok) throw new Error(fixturesData.error || "fixtures_failed");
        if (!standingsRes.ok) throw new Error(standingsData.error || "standings_failed");

        const fixtures = Array.isArray(fixturesData.fixtures) ? fixturesData.fixtures : [];
        const standings = Array.isArray(standingsData.standings) ? standingsData.standings : [];
        const groups = standingsData.groups ? Object.keys(standingsData.groups) : [];
        const teamIds = [];
        const teamCodes = new Set();

        fixtures.forEach(function (match) {
          [match.homeTeam, match.awayTeam].forEach(function (team) {
            if (!team) return;
            if (team.code) teamCodes.add(team.code);
            if (team.id && !teamIds.includes(team.id)) teamIds.push(team.id);
          });
        });

        const statusCounts = fixtures.reduce(function (counts, match) {
          counts[match.status] = (counts[match.status] || 0) + 1;
          return counts;
        }, {});

        byId("fixtureCount").textContent = fixtures.length;
        byId("teamCount").textContent = teamCodes.size || "--";
        const officialGroups = groups.filter(function (group) { return /^[A-L] 组/.test(group); });
        const thirdPlaceGroups = groups.filter(function (group) { return group.indexOf("第三") !== -1; });
        byId("standingGroupCount").textContent = officialGroups.length;
        byId("thirdPlaceGroupCount").textContent = thirdPlaceGroups.length;
        byId("standingRowCount").textContent = standings.length;
        byId("scheduledCount").textContent = statusCounts.not_started || 0;
        byId("finishedCount").textContent = statusCounts.finished || 0;
        byId("interruptedCount").textContent = (statusCounts.postponed || 0) + (statusCounts.cancelled || 0) + (statusCounts.halftime || 0);

        const now = Date.now();
        const upcoming = fixtures
          .filter(function (match) { return match.startIso && new Date(match.startIso).getTime() >= now; })
          .sort(function (a, b) { return new Date(a.startIso).getTime() - new Date(b.startIso).getTime(); })
          .slice(0, 6);

        byId("upcomingMatches").innerHTML = upcoming.length ? upcoming.map(function (match) {
          const home = match.homeTeam || {};
          const away = match.awayTeam || {};
          return "<article class=\"match-row\"><div class=\"team\"><strong>" + (home.name || "主队") + "</strong><span class=\"muted\">" + (home.code || "") + "</span></div><div class=\"score\">VS</div><div class=\"team\"><strong>" + (away.name || "客队") + "</strong><span class=\"muted\">" + (away.code || match.stage || "") + "</span></div><span class=\"badge\">" + fixtureTime(match.startIso) + "</span></article>";
        }).join("") : "<div class=\"status-row\"><i class=\"dot warn\"></i><div><h3>暂无即将开始的比赛</h3><p>赛程接口已返回，但没有未来比赛。</p></div><span class=\"badge\">0 场</span></div>";

        if (teamIds.length) {
          const squadsRes = await fetch("/api/worldcup/squads?team=" + teamIds.slice(0, 8).join(","), { cache: "no-store" });
          const squadsData = await squadsRes.json();
          if (!squadsRes.ok) throw new Error(squadsData.error || "squads_failed");
          const squads = Array.isArray(squadsData.squads) ? squadsData.squads : [];
          const playerTotal = squads.reduce(function (total, squad) { return total + (Array.isArray(squad.players) ? squad.players.length : 0); }, 0);
          byId("playerCount").textContent = playerTotal;
          byId("squadTeamCount").textContent = squads.length + "/8";
        }
      } catch (error) {
        ["fixtureCount", "teamCount", "standingGroupCount", "thirdPlaceGroupCount", "standingRowCount", "scheduledCount", "finishedCount", "interruptedCount", "playerCount", "squadTeamCount"].forEach(function (id) {
          byId(id).textContent = "--";
        });
        byId("upcomingMatches").innerHTML = "<div class=\"status-row\"><i class=\"dot bad\"></i><div><h3>详细数据不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\"badge\">错误</span></div>";
      }
    }

    async function refreshNews() {
      try {
        const res = await fetch("/api/news?limit=24", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "news_api_failed");

        const items = Array.isArray(data.items) ? data.items : [];
        const errors = Array.isArray(data.errors) ? data.errors : [];
        const sourceCounts = items.reduce(function (counts, item) {
          const source = item.source || item.sourceFeed || "未知来源";
          counts[source] = (counts[source] || 0) + 1;
          return counts;
        }, {});
        const sources = Object.keys(sourceCounts).sort(function (a, b) { return sourceCounts[b] - sourceCounts[a]; });

        byId("newsCount").textContent = data.count ?? items.length;
        byId("newsTotal").textContent = data.total ?? items.length;
        byId("newsSourceCount").textContent = sources.length;
        byId("newsState").textContent = errors.length ? "有告警" : "正常";
        byId("newsDot").className = statusDotClass(!errors.length, errors.length > 0);
        byId("newsFreshness").textContent = data.updatedAt ? "新闻源更新于 " + newsTime(data.updatedAt) : "代理读取于 " + newsTime(data.timestamp);
        byId("newsErrors").textContent = errors.length ? errors.length + " 个错误" : "无错误";
        byId("newsEndpoint").textContent = data.endpoint || "--";

        byId("newsSources").innerHTML = sources.length ? sources.slice(0, 6).map(function (source) {
          return "<div class=\"status-row\"><i class=\"dot ok\"></i><div><h3>" + source + "</h3><p>当前返回 " + sourceCounts[source] + " 条新闻</p></div><span class=\"badge\">" + sourceCounts[source] + "</span></div>";
        }).join("") : "<div class=\"status-row\"><i class=\"dot warn\"></i><div><h3>暂无来源</h3><p>新闻 API 未返回 items。</p></div><span class=\"badge\">0</span></div>";

        byId("newsItems").innerHTML = items.length ? items.slice(0, 10).map(function (item) {
          const tag = Array.isArray(item.tags) && item.tags.length ? item.tags[0].replaceAll("-", " ") : (item.sourceFeed || "新闻");
          const summary = item.summary || item.source || "";
          return "<article class=\"status-row\"><i class=\"dot ok\"></i><div><h3>" + (item.title || "未命名新闻") + "</h3><p>" + summary + "</p></div><span class=\"badge\">" + tag + " · " + newsTime(item.publishedAt) + "</span></article>";
        }).join("") : "<div class=\"status-row\"><i class=\"dot warn\"></i><div><h3>暂无新闻</h3><p>新闻 API 当前没有返回内容。</p></div><span class=\"badge\">0 条</span></div>";
      } catch (error) {
        byId("newsCount").textContent = "--";
        byId("newsTotal").textContent = "--";
        byId("newsSourceCount").textContent = "--";
        byId("newsState").textContent = "异常";
        byId("newsDot").className = statusDotClass(false, false);
        byId("newsFreshness").textContent = "新闻 API 读取失败";
        byId("newsErrors").textContent = "错误";
        byId("newsEndpoint").textContent = "--";
        byId("newsSources").innerHTML = "<div class=\"status-row\"><i class=\"dot bad\"></i><div><h3>新闻来源不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\"badge\">错误</span></div>";
        byId("newsItems").innerHTML = "<div class=\"status-row\"><i class=\"dot bad\"></i><div><h3>新闻列表不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\"badge\">错误</span></div>";
      }
    }

    async function refreshAll() {
      await Promise.allSettled([refreshStatus(), refreshLive(), refreshFootballDetails(), refreshNews()]);
    }

    refreshAll();
    setInterval(refreshAll, 5000);
  </script>
</body>
</html>`;
}
