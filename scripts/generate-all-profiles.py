"""
Generate text-only player profile pages for ALL 1248 players.
"""

import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "outputs" / "fifa-player-breakthroughs-final.json"
OUTPUT_FOLDER = Path("C:/Users/caiyu/Desktop/star/一球成名")

# 球队中文名
TEAM_CN = {
    "Algeria": "阿尔及利亚", "Argentina": "阿根廷", "Australia": "澳大利亚",
    "Austria": "奥地利", "Belgium": "比利时", "Bosnia And Herzegovina": "波黑",
    "Brazil": "巴西", "Cabo Verde": "佛得角", "Canada": "加拿大",
    "Colombia": "哥伦比亚", "Congo DR": "刚果民主共和国", "Croatia": "克罗地亚",
    "Curaçao": "库拉索", "Czechia": "捷克", "Côte D'Ivoire": "科特迪瓦",
    "Ecuador": "厄瓜多尔", "Egypt": "埃及", "England": "英格兰",
    "France": "法国", "Germany": "德国", "Ghana": "加纳", "Haiti": "海地",
    "IR Iran": "伊朗", "Iraq": "伊拉克", "Japan": "日本", "Jordan": "约旦",
    "Korea Republic": "韩国", "Mexico": "墨西哥", "Morocco": "摩洛哥",
    "Netherlands": "荷兰", "New Zealand": "新西兰", "Nigeria": "尼日利亚",
    "Norway": "挪威", "Panama": "巴拿马", "Paraguay": "巴拉圭",
    "Portugal": "葡萄牙", "Qatar": "卡塔尔", "Saudi Arabia": "沙特阿拉伯",
    "Scotland": "苏格兰", "Senegal": "塞内加尔", "South Africa": "南非",
    "Spain": "西班牙", "Sweden": "瑞典", "Switzerland": "瑞士",
    "Tunisia": "突尼斯", "Türkiye": "土耳其", "Uruguay": "乌拉圭",
    "USA": "美国", "Uzbekistan": "乌兹别克斯坦",
}

# 位置中文
POSITION_CN = {"FW": "前锋", "MF": "中场", "DF": "后卫", "GK": "门将"}

# 国旗
FLAG = {
    "ALG": "🇩🇿", "ARG": "🇦🇷", "AUS": "🇦🇺", "AUT": "🇦🇹", "BEL": "🇧🇪",
    "BIH": "🇧🇦", "BRA": "🇧🇷", "CPV": "🇨🇻", "CAN": "🇨🇦", "COL": "🇨🇴",
    "COD": "🇨🇩", "CRO": "🇭🇷", "CUW": "🇨🇼", "CZE": "🇨🇿", "CIV": "🇨🇮",
    "ECU": "🇪🇨", "EGY": "🇪🇬", "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "FRA": "🇫🇷", "GER": "🇩🇪",
    "GHA": "🇬🇭", "HAI": "🇭🇹", "IRN": "🇮🇷", "IRQ": "🇮🇶", "JPN": "🇯🇵",
    "JOR": "🇯🇴", "KOR": "🇰🇷", "MEX": "🇲🇽", "MAR": "🇲🇦", "NED": "🇳🇱",
    "NZL": "🇳🇿", "NGA": "🇳🇬", "NOR": "🇳🇴", "PAN": "🇵🇦", "PAR": "🇵🇾",
    "POR": "🇵🇹", "QAT": "🇶🇦", "SAU": "🇸🇦", "SCO": "🇸🇨", "SEN": "🇸🇳",
    "RSA": "🇿🇦", "ESP": "🇪🇸", "SWE": "🇸🇪", "SUI": "🇨🇭", "TUN": "🇹🇳",
    "TUR": "🇹🇷", "URU": "🇺🇾", "USA": "🇺🇸", "UZB": "🇺🇿",
}

# 关键词翻译
KEYWORD_CN = {
    "debut": "首秀", "breakthrough": "突破", "first cap": "首次入选",
    "first goal": "首粒进球", "iconic": "标志性", "legendary": "传奇",
    "memorable": "难忘", "historic": "历史性", "youngest": "最年轻",
    "record": "记录", "milestone": "里程碑", "highlight": "高光时刻",
    "star": "明星", "rising": "崛起", "emerging": "新星",
    "talent": "天赋", "sensation": "轰动", "wonderkid": "天才少年",
}


def sanitize_filename(name):
    """Create safe filename from player name."""
    replacements = {
        ' ': '-', 'é': 'e', 'ó': 'o', 'á': 'a', 'ü': 'u', 'ö': 'o',
        'ø': 'o', 'ñ': 'n', 'ć': 'c', 'ž': 'z', 'š': 's', 'đ': 'd',
        'í': 'i', 'ú': 'u', 'ã': 'a', 'ê': 'e', 'ô': 'o', 'î': 'i',
        'ä': 'a', 'ë': 'e', 'ï': 'i', 'å': 'a', 'É': 'E', 'Ó': 'O',
        'Á': 'A', 'Ü': 'U', 'Ö': 'O', 'Í': 'I', 'Ú': 'U', 'Ñ': 'N',
        '\'': '', '.': '', ',': '', '(': '', ')': '',
    }
    result = name.lower()
    for old, new in replacements.items():
        result = result.replace(old, new)
    return result


def generate_page(player):
    """Generate HTML for a single player."""
    name = player["player"]
    team = player["team"]
    team_code = player["teamCode"]
    position = player["position"]

    team_cn = TEAM_CN.get(team, team)
    pos_cn = POSITION_CN.get(position, position)
    flag = FLAG.get(team_code, "🏳️")

    # Keywords
    keywords = set()
    for bt in player.get("breakthroughs", []):
        for kw in bt.get("keywords", []):
            keywords.add(KEYWORD_CN.get(kw, kw))
    if not keywords:
        keywords = {"世界杯", "2026"}
    keywords_html = "".join([f'<span class="tag">{kw}</span>' for kw in sorted(keywords)])

    # Breakthroughs
    bt_html = ""
    for i, bt in enumerate(player.get("breakthroughs", [])[:5], 1):
        title = bt.get("title", "").split(" – ")[0].strip()
        if len(title) > 50:
            title = title[:50] + "..."
        url = bt.get("url", "")
        kws = ", ".join([KEYWORD_CN.get(k, k) for k in bt.get("keywords", [])])
        bt_html += f'''
        <div class="bt-item">
            <div class="bt-num">{i}</div>
            <div class="bt-content">
                <div class="bt-title">{title}</div>
                <div class="bt-keywords">关键词：{kws}</div>
                <a href="{url}" class="bt-link" target="_blank">查看原文 →</a>
            </div>
        </div>'''

    if not bt_html:
        bt_html = '<div class="no-data">暂无FIFA突破记录</div>'

    # Search queries
    search_html = ""
    for s in player.get("searches", []):
        query = s.get("query", "").replace('"', '')
        count = s.get("resultCount", 0)
        search_html += f'<div class="search-item"><span class="query">{query}</span><span class="count">{count}条结果</span></div>'

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name} - 2026世界杯球员档案</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&family=Oswald:wght@400;600;700&display=swap');
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#0a0a0a;color:#fff;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif}}

.hero{{
  min-height:60vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
  position:relative;text-align:center;padding:4rem 2rem;
}}
.hero::before{{
  content:'';position:absolute;inset:0;
  background:radial-gradient(circle at 30% 70%,rgba(255,215,0,.08) 0%,transparent 50%),
             radial-gradient(circle at 70% 30%,rgba(0,100,0,.1) 0%,transparent 50%);
}}
.hero-content{{position:relative;z-index:1;max-width:800px}}
.flag{{font-size:4rem;margin-bottom:1rem}}
.player-name{{
  font-family:'Oswald',sans-serif;font-size:3.5rem;font-weight:700;
  text-shadow:0 4px 30px rgba(0,0,0,.5);margin-bottom:.5rem;
}}
.player-name .sub{{
  display:block;font-size:1.2rem;font-weight:300;color:#ffd700;
  margin-top:.5rem;font-family:'Noto Sans SC',sans-serif;letter-spacing:.15em;
}}
.meta{{display:flex;justify-content:center;gap:2.5rem;margin-top:2rem;flex-wrap:wrap}}
.meta-item{{text-align:center}}
.meta-label{{font-size:.7rem;letter-spacing:.2em;color:rgba(255,255,255,.5);margin-bottom:.3rem}}
.meta-val{{font-family:'Oswald',sans-serif;font-size:1.3rem;color:#ffd700}}

.section{{padding:4rem 2rem;max-width:1000px;margin:0 auto}}
.section-title{{
  font-size:1.8rem;font-weight:700;margin-bottom:2rem;
  padding-bottom:.5rem;border-bottom:2px solid #ffd700;
  display:inline-block;
}}

.card{{
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
  border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;
}}
.card-title{{color:#ffd700;font-weight:700;margin-bottom:1rem;font-size:1.1rem}}

.tags{{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}}
.tag{{
  background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.3);
  padding:.3rem .8rem;border-radius:20px;font-size:.8rem;color:#ffd700;
}}

.bt-item{{
  display:flex;gap:1rem;padding:1rem 0;
  border-bottom:1px solid rgba(255,255,255,.05);
}}
.bt-item:last-child{{border-bottom:none}}
.bt-num{{
  width:32px;height:32px;border-radius:50%;background:#ffd700;color:#000;
  display:flex;align-items:center;justify-content:center;
  font-family:'Oswald',sans-serif;font-weight:700;flex-shrink:0;
}}
.bt-title{{font-weight:500;margin-bottom:.3rem}}
.bt-keywords{{font-size:.8rem;color:rgba(255,255,255,.5)}}
.bt-link{{font-size:.8rem;color:#4ecdc4;text-decoration:none;margin-top:.3rem;display:inline-block}}
.bt-link:hover{{color:#ffd700}}

.search-item{{
  display:flex;justify-content:space-between;align-items:center;
  padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.05);
  font-size:.85rem;
}}
.query{{color:rgba(255,255,255,.7)}}
.count{{color:#4ecdc4;font-size:.75rem}}

.no-data{{color:rgba(255,255,255,.4);font-style:italic;padding:1rem 0}}

.footer{{padding:2rem;text-align:center;background:#050505;margin-top:2rem}}
.footer-text{{font-size:.75rem;color:rgba(255,255,255,.3)}}
</style>
</head>
<body>

<section class="hero">
<div class="hero-content">
  <div class="flag">{flag}</div>
  <h1 class="player-name">
    {name}
    <span class="sub">{team_cn} · {pos_cn}</span>
  </h1>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">位置</div><div class="meta-val">{pos_cn}</div></div>
    <div class="meta-item"><div class="meta-label">球队</div><div class="meta-val">{team_cn}</div></div>
    <div class="meta-item"><div class="meta-label">代码</div><div class="meta-val">{team_code}</div></div>
    <div class="meta-item"><div class="meta-label">世界杯</div><div class="meta-val">2026</div></div>
  </div>
</div>
</section>

<div class="section">
  <h2 class="section-title">球员档案</h2>
  <div class="card">
    <div class="card-title">👤 基本信息</div>
    <table style="width:100%;font-size:.9rem">
      <tr><td style="color:rgba(255,255,255,.5);width:100px;padding:.4rem 0">姓名</td><td>{name}</td></tr>
      <tr><td style="color:rgba(255,255,255,.5);padding:.4rem 0">国籍</td><td>{team_cn} {flag}</td></tr>
      <tr><td style="color:rgba(255,255,255,.5);padding:.4rem 0">位置</td><td>{pos_cn} ({position})</td></tr>
      <tr><td style="color:rgba(255,255,255,.5);padding:.4rem 0">球队代码</td><td>{team_code}</td></tr>
    </table>
  </div>

  <h2 class="section-title">突破关键词</h2>
  <div class="tags">{keywords_html}</div>
</div>

<div class="section">
  <h2 class="section-title">FIFA突破记录</h2>
  {bt_html}
</div>

<div class="section">
  <h2 class="section-title">FIFA搜索记录</h2>
  <div class="card">
    {search_html if search_html else '<div class="no-data">暂无搜索记录</div>'}
  </div>
</div>

<footer class="footer">
  <div class="footer-text">FIFA World Cup 2026 · 一球成名 · 球员档案</div>
</footer>

</body>
</html>'''
    return html


def main():
    print("正在加载数据...")
    data = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    players = data.get("players", [])
    print(f"共 {len(players)} 名球员")

    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

    print("开始生成页面...")
    for i, player in enumerate(players, 1):
        name = player.get("player", "unknown")
        filename = sanitize_filename(name) + ".html"
        html = generate_page(player)
        (OUTPUT_FOLDER / filename).write_text(html, encoding="utf-8")

        if i % 100 == 0:
            print(f"  已生成 {i}/{len(players)} ...")

    print(f"\n完成！共生成 {len(players)} 个球员档案页面")
    print(f"保存位置: {OUTPUT_FOLDER}")


if __name__ == "__main__":
    main()
