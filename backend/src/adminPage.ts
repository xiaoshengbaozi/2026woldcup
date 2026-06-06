export function renderAdminPageHtml() {
  return `<!doctype html>
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
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
    .action-btn {
      min-height: 34px; border: 1px solid rgba(255,255,255,.1); border-radius: 999px;
      background: rgba(255,255,255,.06); color: rgba(255,255,255,.78); padding: 0 12px;
      font: inherit; font-size: 12px; cursor: pointer; transition: .2s ease;
    }
    .action-btn:hover { border-color: rgba(216,255,62,.36); color: white; background: rgba(216,255,62,.1); }
    .action-btn.danger:hover { border-color: rgba(255,91,110,.42); background: rgba(255,91,110,.12); }
    .switch-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      border-radius: 22px; background: rgba(0,0,0,.22); border: 1px solid rgba(255,255,255,.075); padding: 14px;
    }
    .switch-row button {
      position: relative; width: 58px; height: 32px; border: 1px solid rgba(255,255,255,.12); border-radius: 999px;
      background: rgba(255,255,255,.08); cursor: pointer; transition: .22s ease; flex: 0 0 auto;
    }
    .switch-row button::after {
      content: ""; position: absolute; top: 4px; left: 4px; width: 22px; height: 22px; border-radius: 999px;
      background: rgba(255,255,255,.72); box-shadow: 0 8px 20px rgba(0,0,0,.28); transition: .22s ease;
    }
    .switch-row button.active { border-color: rgba(216,255,62,.4); background: rgba(216,255,62,.18); }
    .switch-row button.active::after { left: 30px; background: var(--volt); box-shadow: 0 0 22px rgba(216,255,62,.35); }
    .split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .8fr); gap: 14px; }
    .record-list { max-height: 560px; overflow: auto; padding-right: 4px; }
    .detail-block { border-radius: 22px; background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.075); padding: 14px; }
    .detail-block h3 { margin-bottom: 8px; }
    .detail-block ul { margin: 0; padding-left: 18px; color: var(--muted); }
    .admin-form { display: grid; grid-template-columns: 1.2fr 1fr .7fr auto; gap: 10px; align-items: end; }
    .live-channel-form { display: grid; grid-template-columns: 1fr 1fr 1.4fr .6fr auto; gap: 10px; align-items: end; }
    .admin-field { display: grid; gap: 6px; color: var(--faint); font-size: 12px; }
    .admin-field input, .admin-field select, .admin-field textarea {
      min-height: 40px; border: 1px solid rgba(255,255,255,.1); border-radius: 16px;
      background: rgba(0,0,0,.28); color: white; padding: 0 12px; outline: none; font: inherit;
    }
    .admin-field textarea { min-height: 96px; padding: 10px 12px; resize: vertical; }
    .admin-field input:focus, .admin-field select:focus, .admin-field textarea:focus { border-color: rgba(216,255,62,.42); box-shadow: 0 0 26px rgba(216,255,62,.08); }
    .channel-match-picker { display: grid; gap: 10px; margin-top: 14px; }
    .channel-match-list { display: grid; max-height: 320px; gap: 8px; overflow: auto; padding-right: 4px; }
    .channel-match-row {
      display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center;
      border-radius: 18px; background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.075); padding: 10px 12px;
    }
    .channel-match-row input { accent-color: var(--volt); }
    .channel-match-row strong { display: block; font-size: 13px; }
    .channel-match-row span { display: block; color: var(--faint); font-size: 11px; }
    code {
      display: block; padding: 12px 14px; border-radius: 16px; background: rgba(0,0,0,.32);
      border: 1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.78); overflow: auto;
    }
    @media (max-width: 920px) {
      header { align-items: start; flex-direction: column; }
      .grid { grid-template-columns: 1fr; }
      .wide { grid-column: span 1; }
      .mini-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .split { grid-template-columns: 1fr; }
      .admin-form { grid-template-columns: 1fr; }
      .live-channel-form { grid-template-columns: 1fr; }
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
      <button class="tab" data-tab="channels" type="button">直播通道</button>
      <button class="tab" data-tab="users" type="button">用户系统</button>
      <button class="tab" data-tab="endpoints" type="button">接口清单</button>
    </nav>

    <section id="overview" class="view active">
      <div class="grid">
        <div class="card metric"><span>国家数量</span><strong id="countryCount">--</strong></div>
        <div class="card metric"><span>客户端</span><strong id="clientCount">--</strong></div>
        <div class="card metric"><span>序列号</span><strong id="sequenceNumber">--</strong></div>
        <div class="card metric"><span>运行时长</span><strong id="uptime">--</strong></div>
        <div class="card metric"><span>X API</span><strong id="xApiState">--</strong></div>

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
            <div class="status-row"><i class="dot" id="xApiDot"></i><div><h3>X API</h3><p id="xApiFreshness">--</p></div><span class="badge" id="xApiRuntime">--</span></div>
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
        <div class="card metric"><span>翻译文章</span><strong id="newsTranslatedCount">--</strong></div>
        <div class="card metric"><span>翻译 Token</span><strong id="newsTranslationTokens">--</strong></div>
        <div class="card metric"><span>翻译调用</span><strong id="newsTranslationCalls">--</strong></div>
        <div class="card metric"><span>翻译模型</span><strong id="newsTranslationModel">--</strong></div>

        <div class="card wide">
          <h2>新闻 API 状态</h2>
          <div class="stack">
            <div class="status-row"><i class="dot" id="newsDot"></i><div><h3>聚合新闻服务</h3><p id="newsFreshness">--</p></div><span class="badge" id="newsErrors">--</span></div>
            <div class="status-row"><i class="dot ok"></i><div><h3>新闻端点</h3><p id="newsEndpoint">--</p></div><span class="badge">/api/news</span></div>
            <div class="status-row"><i class="dot" id="newsTranslationDot"></i><div><h3>翻译模型调用</h3><p id="newsTranslationDetail">--</p></div><span class="badge" id="newsTranslationBadge">--</span></div>
          </div>
        </div>

        <div class="card wide">
          <h2>翻译功能开关</h2>
          <div class="stack">
            <div class="switch-row">
              <div>
                <h3>新闻列表标题/摘要翻译</h3>
                <p id="newsListTranslationSwitchText">--</p>
              </div>
              <button id="newsListTranslationSwitch" type="button" aria-label="切换新闻列表翻译"></button>
            </div>
            <div class="switch-row">
              <div>
                <h3>站内阅读正文翻译</h3>
                <p id="newsArticleTranslationSwitchText">--</p>
              </div>
              <button id="newsArticleTranslationSwitch" type="button" aria-label="切换正文翻译"></button>
            </div>
            <div class="status-row"><i class="dot" id="newsSettingsDot"></i><div><h3>开关状态</h3><p id="newsTranslationSettingsText">正在读取配置</p></div><span class="badge" id="newsTranslationSettingsBadge">--</span></div>
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

    <section id="channels" class="view">
      <div class="grid">
        <div class="card metric"><span>通道数量</span><strong id="liveChannelCount">--</strong></div>
        <div class="card metric"><span>启用通道</span><strong id="liveChannelActiveCount">--</strong></div>
        <div class="card metric"><span>绑定比赛</span><strong>按 slug</strong></div>
        <div class="card metric"><span>播放器</span><strong>HLS</strong></div>

        <div class="card full">
          <h2>直播通道维护</h2>
          <form class="live-channel-form" id="liveChannelForm">
            <input id="liveChannelIdInput" type="hidden" />
            <label class="admin-field">主比赛 slug<input id="liveChannelMatchInput" type="text" placeholder="mexico-vs-south-africa" /></label>
            <label class="admin-field">通道名称<input id="liveChannelNameInput" type="text" placeholder="主直播通道" /></label>
            <label class="admin-field">m3u8 地址<input id="liveChannelUrlInput" type="url" placeholder="https://example.com/live/index.m3u8" /></label>
            <label class="admin-field">排序<input id="liveChannelSortInput" type="number" min="1" value="1" /></label>
            <button class="action-btn" type="submit">保存通道</button>
          </form>
          <div class="channel-match-picker">
            <label class="admin-field">适用比赛 slug（每行一个，可勾选下方比赛自动填入）<textarea id="liveChannelMatchIdsInput" placeholder="mexico-vs-south-africa&#10;canada-vs-switzerland"></textarea></label>
            <label class="admin-field">筛选比赛<input id="liveChannelMatchSearchInput" type="search" placeholder="输入球队、城市、阶段" /></label>
            <div class="channel-match-list" id="liveChannelMatchPicker">
              <div class="status-row"><i class="dot warn"></i><div><h3>正在读取赛程</h3><p>稍后可勾选比赛绑定到当前直播源。</p></div><span class="badge">MATCHES</span></div>
            </div>
          </div>
          <div class="toolbar" style="margin-top:12px">
            <button class="action-btn" id="resetLiveChannelForm" type="button">新建通道</button>
            <a class="action-btn" href="http://localhost:3000/matches" target="_blank" rel="noreferrer">打开赛程</a>
          </div>
          <div class="record-list" style="margin-top:14px">
            <table>
              <thead><tr><th>通道</th><th>比赛</th><th>地址</th><th>状态</th><th>排序</th><th>操作</th></tr></thead>
              <tbody id="liveChannelRows"><tr><td colspan="6" class="muted">正在加载...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <section id="users" class="view">
      <div class="grid">
        <div class="card metric"><span>用户总数</span><strong id="adminUserCount">--</strong></div>
        <div class="card metric"><span>活跃用户</span><strong id="adminActiveUsers">--</strong></div>
        <div class="card metric"><span>启用提醒</span><strong id="adminEnabledReminders">--</strong></div>
        <div class="card metric"><span>未读通知</span><strong id="adminUnreadNotifications">--</strong></div>
        <div class="card metric"><span>有效邀请码</span><strong id="adminActiveInvitations">--</strong></div>
        <div class="card metric"><span>邀请码使用</span><strong id="adminInvitationUses">--</strong></div>

        <div class="card full">
          <h2>用户系统</h2>
          <div class="mini-grid">
            <div class="mini"><span>关注球队</span><strong id="adminFollowedTeams">--</strong></div>
            <div class="mini"><span>收藏比赛</span><strong id="adminFavoriteMatches">--</strong></div>
            <div class="mini"><span>预测记录</span><strong id="adminPredictionCount">--</strong></div>
            <div class="mini"><span>新闻订阅</span><strong id="adminNewsSubscriptions">--</strong></div>
          </div>
        </div>

        <div class="card full">
          <h2>邀请码管理</h2>
          <form class="admin-form" id="invitationForm">
            <label class="admin-field">邀请码（留空随机生成）<input id="inviteCodeInput" type="text" placeholder="WC26-VIP-001" /></label>
            <label class="admin-field">过期时间<input id="inviteExpiresAtInput" type="datetime-local" /></label>
            <label class="admin-field">可使用次数<input id="inviteMaxUsesInput" type="number" min="1" value="1" /></label>
            <button class="action-btn" type="submit">生成邀请码</button>
          </form>
          <div class="record-list" style="margin-top:14px">
            <table>
              <thead><tr><th>邀请码</th><th>状态</th><th>次数</th><th>过期时间</th><th>最近使用</th><th>操作</th></tr></thead>
              <tbody id="adminInvitationRows"><tr><td colspan="6" class="muted">正在加载...</td></tr></tbody>
            </table>
          </div>
        </div>

        <div class="card full">
          <div class="split">
            <div>
              <h2>用户列表</h2>
              <div class="record-list">
                <table>
                  <thead><tr><th>用户</th><th>关注</th><th>收藏</th><th>预测</th><th>提醒</th><th>状态</th></tr></thead>
                  <tbody id="adminUserRows"><tr><td colspan="6" class="muted">正在加载...</td></tr></tbody>
                </table>
              </div>
            </div>
            <div>
              <h2>用户详情</h2>
              <div class="stack" id="adminUserDetail">
                <div class="status-row"><i class="dot warn"></i><div><h3>未选择用户</h3><p>点击用户行查看关注、收藏、预测、提醒和订阅详情。</p></div><span class="badge">DETAIL</span></div>
              </div>
            </div>
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
      const xApi = data.upstream.xApi || {};
      const xConfigured = Boolean(xApi.configured);
      const xHealthy = xApi.status === "ok" || xApi.status === "idle";
      byId("xApiState").textContent = xConfigured ? xApi.status || "configured" : "未配置";
      byId("xApiDot").className = statusDotClass(xConfigured && xHealthy, xConfigured && !xHealthy);
      byId("xApiFreshness").textContent = xConfigured ? "最近成功 " + fromNow(xApi.lastSuccessAt) + " · 错误 " + (xApi.apiErrors || 0) : "缺少 X_BEARER_TOKEN";
      byId("xApiRuntime").textContent = "请求 " + (xApi.requestsTotal || 0) + " · 缓存 " + (xApi.cacheEntries || 0);

      byId("upstreamRows").innerHTML =
        upstreamRow(data.upstream.polymarketConnected, "Polymarket", data.upstream.polymarketConnected ? "CLOB WebSocket 已连接" : "正在重连市场行情", data.upstream.polymarketConnected ? "在线" : "降级") +
        upstreamRow(apiConfigured, "api-football", apiConfigured ? "API Key 已配置，可读取赛程与实况" : "缺少 API_FOOTBALL_KEY", apiConfigured ? "已配置" : "不可用") +
        upstreamRow(xConfigured && xHealthy, "X API", xConfigured ? xApiRuntimeText(xApi) : "缺少 X_BEARER_TOKEN", xConfigured ? (xApi.status || "configured") : "不可用");

      byId("leaders").innerHTML = data.data.leaders.map(function (item) {
        return "<tr><td>" + item.flagEmoji + " " + item.countryName + "</td><td class=\\"muted\\">" + item.countryCode + "</td><td class=\\"prob\\">" + percent(item.impliedProbability) + "</td><td>" + percent(item.delta24h) + "</td><td>" + fmt.format(item.spread) + "¢</td></tr>";
      }).join("");
    }

    function upstreamRow(ok, title, text, badge) {
      return "<div class=\\"status-row\\"><i class=\\"" + statusDotClass(ok, false) + "\\"></i><div><h3>" + title + "</h3><p>" + text + "</p></div><span class=\\"badge\\">" + badge + "</span></div>";
    }

    function xApiRuntimeText(xApi) {
      return "handles " + (xApi.knownHandleCount || 0) +
        " · requests " + (xApi.requestsTotal || 0) +
        " · user " + (xApi.xUserRequests || 0) +
        " · tweets " + (xApi.xTweetRequests || 0) +
        " · hits " + (xApi.cacheHits || 0) +
        " · misses " + (xApi.cacheMisses || 0) +
        (xApi.lastError ? " · last error " + xApi.lastError : "");
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
          byId("liveMatches").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot warn\\"></i><div><h3>当前没有进行中的世界杯比赛</h3><p>接口正常返回，暂无 live=all 的比赛数据。</p></div><span class=\\"badge\\">0 场</span></div>";
          return;
        }

        byId("liveMatches").innerHTML = fixtures.map(function (match) {
          const home = match.homeTeam || {};
          const away = match.awayTeam || {};
          const score = ((match.score && match.score.home) ?? "-") + " : " + ((match.score && match.score.away) ?? "-");
          const minute = match.elapsed ? match.elapsed + "'" : match.statusLabel || "实况";
          const venue = match.location || match.stage || "";
          return "<article class=\\"match-row\\"><div class=\\"team\\"><strong>" + (home.name || "主队") + "</strong><span class=\\"muted\\">" + (home.code || "") + "</span></div><div class=\\"score\\">" + score + "</div><div class=\\"team\\"><strong>" + (away.name || "客队") + "</strong><span class=\\"muted\\">" + (away.code || venue) + "</span></div><span class=\\"badge\\">" + minute + "</span></article>";
        }).join("");
      } catch (error) {
        byId("liveCount").textContent = "--";
        byId("liveUpdatedAt").textContent = "--";
        byId("footballFreshness").textContent = "api-football 实况读取失败";
        byId("footballCache").textContent = "不可用";
        byId("footballDot").className = statusDotClass(false, false);
        byId("liveMatches").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot bad\\"></i><div><h3>比赛实况不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\\"badge\\">错误</span></div>";
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
          return "<article class=\\"match-row\\"><div class=\\"team\\"><strong>" + (home.name || "主队") + "</strong><span class=\\"muted\\">" + (home.code || "") + "</span></div><div class=\\"score\\">VS</div><div class=\\"team\\"><strong>" + (away.name || "客队") + "</strong><span class=\\"muted\\">" + (away.code || match.stage || "") + "</span></div><span class=\\"badge\\">" + fixtureTime(match.startIso) + "</span></article>";
        }).join("") : "<div class=\\"status-row\\"><i class=\\"dot warn\\"></i><div><h3>暂无即将开始的比赛</h3><p>赛程接口已返回，但没有未来比赛。</p></div><span class=\\"badge\\">0 场</span></div>";

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
        byId("upcomingMatches").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot bad\\"></i><div><h3>详细数据不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\\"badge\\">错误</span></div>";
      }
    }

    let newsTranslationSettings = {
      listTranslationEnabled: false,
      articleTranslationEnabled: false
    };
    let newsTranslationSettingsSaving = false;

    function renderNewsTranslationSettings(settings, saving) {
      newsTranslationSettings = {
        listTranslationEnabled: Boolean(settings.listTranslationEnabled),
        articleTranslationEnabled: Boolean(settings.articleTranslationEnabled)
      };
      byId("newsListTranslationSwitch").className = newsTranslationSettings.listTranslationEnabled ? "active" : "";
      byId("newsArticleTranslationSwitch").className = newsTranslationSettings.articleTranslationEnabled ? "active" : "";
      byId("newsListTranslationSwitch").disabled = Boolean(saving);
      byId("newsArticleTranslationSwitch").disabled = Boolean(saving);
      byId("newsListTranslationSwitchText").textContent = newsTranslationSettings.listTranslationEnabled ? "已开启，新闻流会翻译标题和摘要" : "已关闭，新闻流保留原文标题和摘要";
      byId("newsArticleTranslationSwitchText").textContent = newsTranslationSettings.articleTranslationEnabled ? "已开启，站内阅读器可按需翻译正文" : "已关闭，站内阅读器不会消耗正文翻译 Token";
      byId("newsSettingsDot").className = statusDotClass(true, newsTranslationSettings.articleTranslationEnabled);
      byId("newsTranslationSettingsText").textContent = saving
        ? "正在保存配置并重启新闻服务"
        : "列表翻译 " + (newsTranslationSettings.listTranslationEnabled ? "开启" : "关闭") + "，正文翻译 " + (newsTranslationSettings.articleTranslationEnabled ? "开启" : "关闭");
      byId("newsTranslationSettingsBadge").textContent = saving ? "保存中" : (newsTranslationSettings.articleTranslationEnabled ? "正文可翻译" : "正文关闭");
    }

    async function refreshNewsTranslationSettings() {
      try {
        const res = await fetch("/api/admin/news-translation", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "news_translation_settings_failed");
        renderNewsTranslationSettings(data, false);
      } catch (error) {
        byId("newsSettingsDot").className = statusDotClass(false, false);
        byId("newsTranslationSettingsText").textContent = "翻译开关读取失败：" + String(error.message || error);
        byId("newsTranslationSettingsBadge").textContent = "错误";
      }
    }

    async function updateNewsTranslationSettings(patch) {
      if (newsTranslationSettingsSaving) return;
      newsTranslationSettingsSaving = true;
      renderNewsTranslationSettings({ ...newsTranslationSettings, ...patch }, true);
      try {
        const res = await fetch("/api/admin/news-translation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const data = await res.json().catch(function () { return null; });
        if (!res.ok) throw new Error((data && data.error) || "news_translation_settings_failed");
        renderNewsTranslationSettings(data, false);
        await refreshNews();
      } catch (error) {
        byId("newsSettingsDot").className = statusDotClass(false, false);
        byId("newsTranslationSettingsText").textContent = "保存失败：" + String(error.message || error);
        byId("newsTranslationSettingsBadge").textContent = "错误";
        await refreshNewsTranslationSettings();
      } finally {
        newsTranslationSettingsSaving = false;
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

        const translation = data.translation || {};
        const usage = translation.usage || {};
        const totalTokens = usage.totalTokens ?? usage.total_tokens ?? 0;
        const promptTokens = usage.promptTokens ?? usage.prompt_tokens ?? 0;
        const completionTokens = usage.completionTokens ?? usage.completion_tokens ?? 0;
        const translatedCount = translation.translatedArticleCount ?? translation.translatedItems ?? 0;
        const candidateCount = translation.candidateCount ?? 0;
        const callCount = translation.calls ?? 0;
        const failedCalls = translation.failedCalls ?? 0;
        byId("newsTranslatedCount").textContent = translatedCount + "/" + candidateCount;
        byId("newsTranslationTokens").textContent = totalTokens ? new Intl.NumberFormat("zh-CN").format(totalTokens) : "0";
        byId("newsTranslationCalls").textContent = failedCalls ? callCount + "/" + failedCalls + " 错误" : String(callCount);
        byId("newsTranslationModel").textContent = translation.model || "--";
        byId("newsTranslationDot").className = statusDotClass(Boolean(translation.enabled) && !failedCalls, Boolean(translation.enabled));
        byId("newsTranslationDetail").textContent = translation.enabled
          ? "已翻译 " + translatedCount + " 篇，候选 " + candidateCount + " 篇；Prompt " + promptTokens + " / Completion " + completionTokens + " tokens"
          : "翻译服务未启用";
        byId("newsTranslationBadge").textContent = translation.model || "未配置";
        if (data.features) {
          renderNewsTranslationSettings({
            listTranslationEnabled: data.features.listTranslationEnabled,
            articleTranslationEnabled: data.features.articleTranslationEnabled
          }, false);
        }

        byId("newsSources").innerHTML = sources.length ? sources.slice(0, 6).map(function (source) {
          return "<div class=\\"status-row\\"><i class=\\"dot ok\\"></i><div><h3>" + source + "</h3><p>当前返回 " + sourceCounts[source] + " 条新闻</p></div><span class=\\"badge\\">" + sourceCounts[source] + "</span></div>";
        }).join("") : "<div class=\\"status-row\\"><i class=\\"dot warn\\"></i><div><h3>暂无来源</h3><p>新闻 API 未返回 items。</p></div><span class=\\"badge\\">0</span></div>";

        byId("newsItems").innerHTML = items.length ? items.slice(0, 10).map(function (item) {
          const tag = Array.isArray(item.tags) && item.tags.length ? item.tags[0].replaceAll("-", " ") : (item.sourceFeed || "新闻");
          const summary = item.summary || item.source || "";
          return "<article class=\\"status-row\\"><i class=\\"dot ok\\"></i><div><h3>" + (item.title || "未命名新闻") + "</h3><p>" + summary + "</p></div><span class=\\"badge\\">" + tag + " · " + newsTime(item.publishedAt) + "</span></article>";
        }).join("") : "<div class=\\"status-row\\"><i class=\\"dot warn\\"></i><div><h3>暂无新闻</h3><p>新闻 API 当前没有返回内容。</p></div><span class=\\"badge\\">0 条</span></div>";
      } catch (error) {
        byId("newsCount").textContent = "--";
        byId("newsTotal").textContent = "--";
        byId("newsSourceCount").textContent = "--";
        byId("newsState").textContent = "异常";
        byId("newsDot").className = statusDotClass(false, false);
        byId("newsFreshness").textContent = "新闻 API 读取失败";
        byId("newsErrors").textContent = "错误";
        byId("newsEndpoint").textContent = "--";
        byId("newsTranslatedCount").textContent = "--";
        byId("newsTranslationTokens").textContent = "--";
        byId("newsTranslationCalls").textContent = "--";
        byId("newsTranslationModel").textContent = "--";
        byId("newsTranslationDot").className = statusDotClass(false, false);
        byId("newsTranslationDetail").textContent = "翻译统计不可用";
        byId("newsTranslationBadge").textContent = "错误";
        byId("newsSources").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot bad\\"></i><div><h3>新闻来源不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\\"badge\\">错误</span></div>";
        byId("newsItems").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot bad\\"></i><div><h3>新闻列表不可用</h3><p>" + String(error.message || error) + "</p></div><span class=\\"badge\\">错误</span></div>";
      }
    }

    let selectedAdminUserId = null;

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\\"", "&quot;")
        .replaceAll("'", "&#039;");
    }

    function adminTime(value) {
      if (!value) return "--";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "--";
      return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
    }

    let liveChannelsCache = [];
    let liveChannelMatchOptions = [];

    async function refreshLiveChannels() {
      try {
        const res = await fetch("/api/admin/live-channels", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "live_channels_failed");

        liveChannelsCache = Array.isArray(data.channels) ? data.channels : [];
        byId("liveChannelCount").textContent = liveChannelsCache.length;
        byId("liveChannelActiveCount").textContent = liveChannelsCache.filter(function (channel) { return channel.isActive; }).length;
        byId("liveChannelRows").innerHTML = liveChannelsCache.length ? liveChannelsCache.map(function (channel) {
          const shortUrl = channel.streamUrl ? channel.streamUrl.replace(/^https?:\\/\\//, "").slice(0, 56) : "待填入";
          const statusLabel = channel.isActive ? "启用" : "停用";
          const toggleLabel = channel.isActive ? "停用" : "启用";
          const matchIds = getChannelMatchIds(channel);
          const matchText = matchIds.length > 1 ? channel.matchId + " 等 " + matchIds.length + " 场" : channel.matchId;
          return "<tr><td><strong>" + escapeHtml(channel.name) + "</strong><br><span class=\\"muted\\">" + escapeHtml(channel.platform || "HLS") + " · " + adminTime(channel.updatedAt) + "</span></td><td>" + escapeHtml(matchText) + "</td><td><span class=\\"muted\\">" + escapeHtml(shortUrl) + "</span></td><td><span class=\\"badge\\">" + statusLabel + "</span></td><td>" + channel.sortOrder + "</td><td><div class=\\"toolbar\\"><button class=\\"action-btn\\" data-live-edit=\\"" + escapeHtml(channel.id) + "\\">编辑</button><button class=\\"action-btn\\" data-live-toggle=\\"" + escapeHtml(channel.id) + "\\">" + toggleLabel + "</button><button class=\\"action-btn danger\\" data-live-delete=\\"" + escapeHtml(channel.id) + "\\">删除</button></div></td></tr>";
        }).join("") : "<tr><td colspan=\\"6\\" class=\\"muted\\">暂无直播通道，先保存一个测试通道。</td></tr>";

        document.querySelectorAll("[data-live-edit]").forEach(function (button) {
          button.addEventListener("click", function () { editLiveChannel(button.dataset.liveEdit); });
        });
        document.querySelectorAll("[data-live-toggle]").forEach(function (button) {
          button.addEventListener("click", function () { toggleLiveChannel(button.dataset.liveToggle); });
        });
        document.querySelectorAll("[data-live-delete]").forEach(function (button) {
          button.addEventListener("click", function () { deleteLiveChannel(button.dataset.liveDelete); });
        });
      } catch (error) {
        byId("liveChannelRows").innerHTML = "<tr><td colspan=\\"6\\" class=\\"muted\\">直播通道读取失败：" + escapeHtml(error.message || error) + "</td></tr>";
      }
    }

    function getChannelMatchIds(channel) {
      const ids = new Set();
      if (Array.isArray(channel.matchIds)) channel.matchIds.forEach(function (id) { if (id) ids.add(String(id)); });
      if (channel.matchId) ids.add(String(channel.matchId));
      return Array.from(ids);
    }

    function parseMatchIdsText(value) {
      return String(value || "")
        .split(/[\\n,，\\s]+/)
        .map(function (item) { return item.trim(); })
        .filter(Boolean)
        .filter(function (item, index, all) { return all.indexOf(item) === index; });
    }

    function syncPrimaryMatchInput() {
      const ids = parseMatchIdsText(byId("liveChannelMatchIdsInput").value);
      byId("liveChannelMatchInput").value = ids[0] || byId("liveChannelMatchInput").value;
    }

    function setMatchIds(ids) {
      const unique = ids.filter(function (item, index, all) { return item && all.indexOf(item) === index; });
      byId("liveChannelMatchIdsInput").value = unique.join("\\n");
      byId("liveChannelMatchInput").value = unique[0] || "";
      renderLiveChannelMatchPicker();
    }

    function toggleMatchId(slug, checked) {
      const ids = parseMatchIdsText(byId("liveChannelMatchIdsInput").value);
      const next = checked ? ids.concat(slug) : ids.filter(function (id) { return id !== slug; });
      setMatchIds(next);
    }

    async function refreshLiveChannelMatchOptions() {
      try {
        const res = await fetch("/api/worldcup/fixtures", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "fixtures_failed");
        liveChannelMatchOptions = (Array.isArray(data.fixtures) ? data.fixtures : []).map(function (fixture) {
          return {
            slug: generateAdminMatchSlug(fixture.summary || fixture.uid || ""),
            summary: fixture.summary || fixture.uid || "未命名比赛",
            stage: fixture.stage || "",
            location: fixture.location || "",
            start: fixture.startIso || ""
          };
        }).filter(function (item) { return item.slug; });
        renderLiveChannelMatchPicker();
      } catch (error) {
        byId("liveChannelMatchPicker").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot warn\\"></i><div><h3>赛程读取失败</h3><p>仍可手动填写比赛 slug：" + escapeHtml(error.message || error) + "</p></div><span class=\\"badge\\">手动</span></div>";
      }
    }

    function renderLiveChannelMatchPicker() {
      const query = String(byId("liveChannelMatchSearchInput").value || "").trim().toLowerCase();
      const selected = new Set(parseMatchIdsText(byId("liveChannelMatchIdsInput").value));
      const items = liveChannelMatchOptions.filter(function (item) {
        const haystack = [item.summary, item.stage, item.location, item.slug].join(" ").toLowerCase();
        return !query || haystack.includes(query);
      }).slice(0, 60);

      byId("liveChannelMatchPicker").innerHTML = items.length ? items.map(function (item) {
        const checked = selected.has(item.slug) ? " checked" : "";
        const meta = [item.stage, item.location, adminTime(item.start)].filter(Boolean).join(" · ");
        return "<label class=\\"channel-match-row\\"><input type=\\"checkbox\\" data-live-match-slug=\\"" + escapeHtml(item.slug) + "\\"" + checked + " /><div><strong>" + escapeHtml(item.summary) + "</strong><span>" + escapeHtml(item.slug) + "</span></div><span>" + escapeHtml(meta) + "</span></label>";
      }).join("") : "<div class=\\"status-row\\"><i class=\\"dot warn\\"></i><div><h3>没有匹配比赛</h3><p>换个关键词，或手动填写比赛 slug。</p></div><span class=\\"badge\\">0</span></div>";

      document.querySelectorAll("[data-live-match-slug]").forEach(function (input) {
        input.addEventListener("change", function () {
          toggleMatchId(input.dataset.liveMatchSlug, input.checked);
        });
      });
    }

    function generateAdminMatchSlug(summary) {
      const clean = String(summary || "")
        .replace(/^⚽\\s*/, "")
        .replace(/\\s*(?:\\([^)]+\\)|（[^）]+）)\\s*$/, "")
        .trim();
      const parts = clean.split(/\\s+vs\\s+/i);
      if (parts.length >= 2) {
        return slugifyAdminText(stripAdminFlag(parts[0])) + "-vs-" + slugifyAdminText(stripAdminFlag(parts[1]));
      }
      return slugifyAdminText(clean);
    }

    function stripAdminFlag(value) {
      return String(value || "")
        .replace(/[\\uD83C][\\uDDE6-\\uDDFF]/g, "")
        .replace(/\\s+/g, " ")
        .trim();
    }

    function slugifyAdminText(value) {
      return String(value || "")
        .normalize("NFKD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^\\p{L}\\p{N}\\s-]/gu, "")
        .replace(/\\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    function resetLiveChannelForm() {
      byId("liveChannelIdInput").value = "";
      byId("liveChannelMatchInput").value = "";
      byId("liveChannelMatchIdsInput").value = "";
      byId("liveChannelNameInput").value = "";
      byId("liveChannelUrlInput").value = "";
      byId("liveChannelSortInput").value = "1";
      renderLiveChannelMatchPicker();
    }

    function editLiveChannel(id) {
      const channel = liveChannelsCache.find(function (item) { return item.id === id; });
      if (!channel) return;
      byId("liveChannelIdInput").value = channel.id;
      const matchIds = getChannelMatchIds(channel);
      byId("liveChannelMatchInput").value = matchIds[0] || "";
      byId("liveChannelMatchIdsInput").value = matchIds.join("\\n");
      byId("liveChannelNameInput").value = channel.name || "";
      byId("liveChannelUrlInput").value = channel.streamUrl || "";
      byId("liveChannelSortInput").value = channel.sortOrder || 1;
      renderLiveChannelMatchPicker();
    }

    async function saveLiveChannel(event) {
      event.preventDefault();
      const current = liveChannelsCache.find(function (item) { return item.id === byId("liveChannelIdInput").value; });
      syncPrimaryMatchInput();
      const matchIds = parseMatchIdsText(byId("liveChannelMatchIdsInput").value);
      if (!matchIds.length && byId("liveChannelMatchInput").value) matchIds.push(byId("liveChannelMatchInput").value);
      const res = await fetch("/api/admin/live-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: byId("liveChannelIdInput").value || undefined,
          matchId: matchIds[0] || byId("liveChannelMatchInput").value,
          matchIds: matchIds,
          name: byId("liveChannelNameInput").value,
          platform: "HLS",
          streamUrl: byId("liveChannelUrlInput").value,
          sortOrder: Number(byId("liveChannelSortInput").value || 1),
          isActive: current ? current.isActive : true
        })
      });
      const data = await res.json().catch(function () { return null; });
      if (!res.ok) {
        byId("liveChannelRows").insertAdjacentHTML("afterbegin", "<tr><td colspan=\\"6\\" class=\\"muted\\">保存失败：" + escapeHtml((data && data.error) || res.status) + "</td></tr>");
        return;
      }
      resetLiveChannelForm();
      await refreshLiveChannels();
    }

    async function toggleLiveChannel(id) {
      const channel = liveChannelsCache.find(function (item) { return item.id === id; });
      if (!channel) return;
      const res = await fetch("/api/admin/live-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...channel, isActive: !channel.isActive })
      });
      if (res.ok) await refreshLiveChannels();
    }

    async function deleteLiveChannel(id) {
      if (!id) return;
      const res = await fetch("/api/admin/live-channels?id=" + encodeURIComponent(id), { method: "DELETE" });
      if (res.ok) await refreshLiveChannels();
    }

    function invitationStatusLabel(status) {
      return {
        active: "有效",
        disabled: "已停用",
        expired: "已过期",
        exhausted: "已用完"
      }[status] || status || "--";
    }

    function localDateTimeToIso(value) {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    async function refreshInvitations() {
      try {
        const res = await fetch("/api/admin/invitations", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "admin_invitations_failed");

        const summary = data.summary || {};
        byId("adminActiveInvitations").textContent = summary.activeInvitationCodes ?? 0;
        byId("adminInvitationUses").textContent = summary.invitationUses ?? 0;

        const invitations = Array.isArray(data.invitations) ? data.invitations : [];
        byId("adminInvitationRows").innerHTML = invitations.length ? invitations.map(function (invite) {
          const lastUse = Array.isArray(invite.usedBy) && invite.usedBy[0] ? invite.usedBy[0].email + " · " + adminTime(invite.usedBy[0].usedAt) : "--";
          const action = invite.status === "disabled" ? "enable" : "disable";
          const actionLabel = invite.status === "disabled" ? "启用" : "停用";
          return "<tr><td><strong>" + escapeHtml(invite.code) + "</strong><br><span class=\\"muted\\">" + escapeHtml(invite.note || invite.id) + "</span></td><td><span class=\\"badge\\">" + invitationStatusLabel(invite.status) + "</span></td><td>" + invite.usedCount + "/" + invite.maxUses + "</td><td>" + adminTime(invite.expiresAt) + "</td><td>" + escapeHtml(lastUse) + "</td><td><button class=\\"action-btn\\" data-invite-action=\\"" + action + "\\" data-invite-id=\\"" + escapeHtml(invite.id) + "\\">" + actionLabel + "</button></td></tr>";
        }).join("") : "<tr><td colspan=\\"6\\" class=\\"muted\\">暂无邀请码，创建一个后用户才能注册。</td></tr>";

        document.querySelectorAll("[data-invite-action]").forEach(function (button) {
          button.addEventListener("click", function () {
            runInvitationAction(button.dataset.inviteId, button.dataset.inviteAction);
          });
        });
      } catch (error) {
        byId("adminInvitationRows").innerHTML = "<tr><td colspan=\\"6\\" class=\\"muted\\">邀请码读取失败：" + escapeHtml(error.message || error) + "</td></tr>";
      }
    }

    async function createInvitation(event) {
      event.preventDefault();
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: byId("inviteCodeInput").value,
          expiresAt: localDateTimeToIso(byId("inviteExpiresAtInput").value),
          maxUses: byId("inviteMaxUsesInput").value || 1
        })
      });
      const data = await res.json().catch(function () { return null; });
      if (!res.ok) {
        byId("adminInvitationRows").insertAdjacentHTML("afterbegin", "<tr><td colspan=\\"6\\" class=\\"muted\\">创建失败：" + escapeHtml((data && data.error) || res.status) + "</td></tr>");
        return;
      }
      byId("inviteCodeInput").value = "";
      await refreshInvitations();
    }

    async function runInvitationAction(invitationId, action) {
      if (!invitationId || !action) return;
      const res = await fetch("/api/admin/invitations/" + encodeURIComponent(invitationId) + "/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      if (!res.ok) {
        const data = await res.json().catch(function () { return null; });
        byId("adminInvitationRows").insertAdjacentHTML("afterbegin", "<tr><td colspan=\\"6\\" class=\\"muted\\">操作失败：" + escapeHtml((data && data.error) || res.status) + "</td></tr>");
        return;
      }
      await refreshInvitations();
    }

    async function refreshUsers() {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "admin_users_failed");

        const summary = data.summary || {};
        byId("adminUserCount").textContent = summary.totalUsers ?? 0;
        byId("adminActiveUsers").textContent = summary.active24h ?? 0;
        byId("adminEnabledReminders").textContent = summary.enabledReminders ?? 0;
        byId("adminUnreadNotifications").textContent = summary.unreadNotifications ?? 0;
        byId("adminFollowedTeams").textContent = summary.followedTeams ?? 0;
        byId("adminFavoriteMatches").textContent = summary.favoriteMatches ?? 0;
        byId("adminPredictionCount").textContent = summary.predictions ?? 0;
        byId("adminNewsSubscriptions").textContent = summary.activeNewsSubscriptions ?? 0;

        const users = Array.isArray(data.users) ? data.users : [];
        byId("adminUserRows").innerHTML = users.length ? users.map(function (user) {
          const status = user.disabledAt ? "已禁用" : "正常";
          const badge = user.unreadNotifications ? user.unreadNotifications + " 通知" : status;
          return "<tr data-user-id=\\"" + escapeHtml(user.id) + "\\" style=\\"cursor:pointer\\"><td><strong>" + escapeHtml(user.displayName) + "</strong><br><span class=\\"muted\\">" + escapeHtml(user.email) + "</span></td><td>" + (user.followedTeams + user.followedPlayers) + "</td><td>" + user.favoriteMatches + "</td><td>" + user.predictions + "</td><td>" + user.reminders + "/" + user.queuedReminders + "</td><td><span class=\\"badge\\">" + badge + "</span></td></tr>";
        }).join("") : "<tr><td colspan=\\"6\\" class=\\"muted\\">暂无用户数据</td></tr>";

        document.querySelectorAll("[data-user-id]").forEach(function (row) {
          row.addEventListener("click", function () { loadAdminUser(row.dataset.userId); });
        });

        if (selectedAdminUserId) {
          await loadAdminUser(selectedAdminUserId, true);
        } else if (users[0]) {
          await loadAdminUser(users[0].id, true);
        }
      } catch (error) {
        byId("adminUserRows").innerHTML = "<tr><td colspan=\\"6\\" class=\\"muted\\">用户系统读取失败：" + escapeHtml(error.message || error) + "</td></tr>";
      }
    }

    async function loadAdminUser(userId, silent) {
      if (!userId) return;
      selectedAdminUserId = userId;
      try {
        const res = await fetch("/api/admin/users/" + encodeURIComponent(userId), { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "admin_user_detail_failed");
        renderAdminUserDetail(data);
      } catch (error) {
        if (!silent) {
          byId("adminUserDetail").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot bad\\"></i><div><h3>用户详情读取失败</h3><p>" + escapeHtml(error.message || error) + "</p></div><span class=\\"badge\\">ERROR</span></div>";
        }
      }
    }

    function renderAdminUserDetail(data) {
      const user = data.user;
      const summary = data.summary || {};
      const reminder = data.reminderStatus || {};
      const news = data.newsStats || {};
      const activity = data.activity || {};
      const disabled = Boolean(user.disabledAt);

      byId("adminUserDetail").innerHTML =
        "<div class=\\"detail-block\\"><h3>" + escapeHtml(user.profile.displayName) + "</h3><p>" + escapeHtml(user.email) + "</p><div class=\\"toolbar\\" style=\\"margin-top:12px\\">" +
        "<button class=\\"action-btn danger\\" data-admin-action=\\"" + (disabled ? "enable" : "disable") + "\\">" + (disabled ? "恢复用户" : "禁用用户") + "</button>" +
        "<button class=\\"action-btn\\" data-admin-action=\\"reset-reminders\\">重置提醒</button>" +
        "<button class=\\"action-btn danger\\" data-admin-action=\\"clean-anomalies\\">删除异常记录</button>" +
        "<button class=\\"action-btn danger\\" data-admin-action=\\"delete\\">删除用户</button>" +
        "</div></div>" +
        "<div class=\\"mini-grid\\">" +
        "<div class=\\"mini\\"><span>关注/收藏</span><strong>" + (summary.followedTeams + summary.followedPlayers + summary.favoriteMatches) + "</strong></div>" +
        "<div class=\\"mini\\"><span>预测</span><strong>" + summary.predictions + "</strong></div>" +
        "<div class=\\"mini\\"><span>提醒状态</span><strong>" + (reminder.enabled || 0) + "/" + (summary.reminders || 0) + "</strong></div>" +
        "<div class=\\"mini\\"><span>新闻订阅</span><strong>" + (news.enabled || 0) + "/" + (news.total || 0) + "</strong></div>" +
        "</div>" +
        "<div class=\\"detail-block\\"><h3>提醒任务状态</h3><p>已入队 " + (reminder.queued || 0) + "，缺少开赛时间 " + (reminder.missingStartTime || 0) + "。</p></div>" +
        "<div class=\\"detail-block\\"><h3>用户活跃度概览</h3><p>记录数 " + (activity.records || 0) + "，创建于 " + adminTime(activity.createdAt) + "，最后更新 " + adminTime(activity.lastUpdatedAt) + "。</p></div>" +
        "<div class=\\"detail-block\\"><h3>关注 / 收藏 / 预测 / 提醒记录</h3>" +
        renderRecordList("关注球队", user.followedTeams, "name") +
        renderRecordList("关注球员", user.followedPlayers, "name") +
        renderRecordList("收藏比赛", user.favoriteMatches, "title") +
        renderRecordList("预测记录", user.predictions, "title") +
        renderRecordList("提醒记录", user.reminders, "title") +
        "</div>";

      document.querySelectorAll("[data-admin-action]").forEach(function (button) {
        button.addEventListener("click", function () {
          runAdminUserAction(user.id, button.dataset.adminAction);
        });
      });
    }

    function renderRecordList(label, items, field) {
      const values = Array.isArray(items) ? items.slice(0, 5) : [];
      if (!values.length) return "<p>" + label + "：暂无</p>";
      return "<p>" + label + "</p><ul>" + values.map(function (item) {
        const meta = item.matchId || item.team || item.stage || item.channel || item.position || "";
        return "<li>" + escapeHtml(item[field] || item.id) + (meta ? " · " + escapeHtml(meta) : "") + "</li>";
      }).join("") + "</ul>";
    }

    async function runAdminUserAction(userId, action) {
      if (!userId || !action) return;
      if (action === "delete" && !window.confirm("确认永久删除这个用户？此操作不可恢复。")) return;
      const res = await fetch("/api/admin/users/" + encodeURIComponent(userId) + "/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const data = await res.json().catch(function () { return null; });
      if (!res.ok) {
        byId("adminUserDetail").insertAdjacentHTML("afterbegin", "<div class=\\"status-row\\"><i class=\\"dot bad\\"></i><div><h3>管理动作失败</h3><p>" + escapeHtml((data && data.error) || res.status) + "</p></div><span class=\\"badge\\">ERROR</span></div>");
        return;
      }
      if (action === "delete") {
        selectedAdminUserId = null;
        byId("adminUserDetail").innerHTML = "<div class=\\"status-row\\"><i class=\\"dot ok\\"></i><div><h3>用户已删除</h3><p>已从用户系统移除该账号及其个人记录。</p></div><span class=\\"badge\\">DONE</span></div>";
        await refreshUsers();
        return;
      }
      renderAdminUserDetail(data);
      await refreshUsers();
    }

    async function refreshAll() {
      await Promise.allSettled([refreshStatus(), refreshLive(), refreshFootballDetails(), refreshNews(), refreshNewsTranslationSettings(), refreshLiveChannels(), refreshLiveChannelMatchOptions(), refreshUsers(), refreshInvitations()]);
    }

    byId("invitationForm").addEventListener("submit", createInvitation);
    byId("liveChannelForm").addEventListener("submit", saveLiveChannel);
    byId("resetLiveChannelForm").addEventListener("click", resetLiveChannelForm);
    byId("liveChannelMatchSearchInput").addEventListener("input", renderLiveChannelMatchPicker);
    byId("liveChannelMatchIdsInput").addEventListener("input", function () {
      syncPrimaryMatchInput();
      renderLiveChannelMatchPicker();
    });
    byId("newsListTranslationSwitch").addEventListener("click", function () {
      updateNewsTranslationSettings({ listTranslationEnabled: !newsTranslationSettings.listTranslationEnabled });
    });
    byId("newsArticleTranslationSwitch").addEventListener("click", function () {
      updateNewsTranslationSettings({ articleTranslationEnabled: !newsTranslationSettings.articleTranslationEnabled });
    });
    refreshAll();
    setInterval(refreshAll, 5000);
  </script>
</body>
</html>`;
}
