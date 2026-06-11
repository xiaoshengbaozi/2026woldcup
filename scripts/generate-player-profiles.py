"""
Generate player profile pages for all players in the star folder.
Uses the Neymar profile template.
"""

import json
import sys
import os
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
STAR_FOLDER = Path("C:/Users/caiyu/Desktop/star")
OUTPUT_FOLDER = Path("C:/Users/caiyu/Desktop/star/一球成名")
BREAKTHROUGHS_PATH = ROOT / "outputs" / "fifa-player-breakthroughs-final.json"

# Player info database (for players not in FIFA data)
PLAYER_INFO = {
    "Achraf Hakimi": {"team": "Morocco", "teamCode": "MAR", "position": "DF", "number": 2, "teamCn": "摩洛哥", "positionCn": "后卫"},
    "Alexander Isak": {"team": "Sweden", "teamCode": "SWE", "position": "FW", "number": 9, "teamCn": "瑞典", "positionCn": "前锋"},
    "Alphonso Davies": {"team": "Canada", "teamCode": "CAN", "position": "DF", "number": 19, "teamCn": "加拿大", "positionCn": "后卫"},
    "Arda Güler": {"team": "Türkiye", "teamCode": "TUR", "position": "MF", "number": 10, "teamCn": "土耳其", "positionCn": "中场"},
    "Christian Pulisic": {"team": "USA", "teamCode": "USA", "position": "FW", "number": 10, "teamCn": "美国", "positionCn": "前锋"},
    "Cristiano Ronaldo": {"team": "Portugal", "teamCode": "POR", "position": "FW", "number": 7, "teamCn": "葡萄牙", "positionCn": "前锋"},
    "Dušan Vlahović": {"team": "Serbia", "teamCode": "SRB", "position": "FW", "number": 9, "teamCn": "塞尔维亚", "positionCn": "前锋"},
    "Erling Haaland": {"team": "Norway", "teamCode": "NOR", "position": "FW", "number": 9, "teamCn": "挪威", "positionCn": "前锋"},
    "Federico Valverde": {"team": "Uruguay", "teamCode": "URU", "position": "MF", "number": 15, "teamCn": "乌拉圭", "positionCn": "中场"},
    "Granit Xhaka": {"team": "Switzerland", "teamCode": "SUI", "position": "MF", "number": 10, "teamCn": "瑞士", "positionCn": "中场"},
    "Jamal Musiala": {"team": "Germany", "teamCode": "GER", "position": "MF", "number": 10, "teamCn": "德国", "positionCn": "中场"},
    "Jude Bellingham": {"team": "England", "teamCode": "ENG", "position": "MF", "number": 10, "teamCn": "英格兰", "positionCn": "中场"},
    "Kaoru Mitoma": {"team": "Japan", "teamCode": "JPN", "position": "FW", "number": 10, "teamCn": "日本", "positionCn": "前锋"},
    "Kevin De Bruyne": {"team": "Belgium", "teamCode": "BEL", "position": "MF", "number": 7, "teamCn": "比利时", "positionCn": "中场"},
    "Kylian Mbappé": {"team": "France", "teamCode": "FRA", "position": "FW", "number": 10, "teamCn": "法国", "positionCn": "前锋"},
    "Lamine Yamal": {"team": "Spain", "teamCode": "ESP", "position": "FW", "number": 19, "teamCn": "西班牙", "positionCn": "前锋"},
    "Luis Díaz": {"team": "Colombia", "teamCode": "COL", "position": "FW", "number": 7, "teamCn": "哥伦比亚", "positionCn": "前锋"},
    "Luka Modrić": {"team": "Croatia", "teamCode": "CRO", "position": "MF", "number": 10, "teamCn": "克罗地亚", "positionCn": "中场"},
    "Mohamed Salah": {"team": "Egypt", "teamCode": "EGY", "position": "FW", "number": 10, "teamCn": "埃及", "positionCn": "前锋"},
    "Moisés Caicedo": {"team": "Ecuador", "teamCode": "ECU", "position": "MF", "number": 23, "teamCn": "厄瓜多尔", "positionCn": "中场"},
    "Rasmus Højlund": {"team": "Denmark", "teamCode": "DEN", "position": "FW", "number": 9, "teamCn": "丹麦", "positionCn": "前锋"},
    "Robert Lewandowski": {"team": "Poland", "teamCode": "POL", "position": "FW", "number": 9, "teamCn": "波兰", "positionCn": "前锋"},
    "Sadio Mané": {"team": "Senegal", "teamCode": "SEN", "position": "FW", "number": 10, "teamCn": "塞内加尔", "positionCn": "前锋"},
    "Santiago Giménez": {"team": "Mexico", "teamCode": "MEX", "position": "FW", "number": 9, "teamCn": "墨西哥", "positionCn": "前锋"},
    "Son Heung-min": {"team": "Korea Republic", "teamCode": "KOR", "position": "FW", "number": 7, "teamCn": "韩国", "positionCn": "前锋"},
    "Vinícius Júnior": {"team": "Brazil", "teamCode": "BRA", "position": "FW", "number": 10, "teamCn": "巴西", "positionCn": "前锋"},
    "Virgil van Dijk": {"team": "Netherlands", "teamCode": "NED", "position": "DF", "number": 4, "teamCn": "荷兰", "positionCn": "后卫"},
    "lionel messi": {"team": "Argentina", "teamCode": "ARG", "position": "FW", "number": 10, "teamCn": "阿根廷", "positionCn": "前锋"},
}

# Country flag colors
FLAG_COLORS = {
    "MAR": ("#c1272d", "#006233"),
    "SWE": ("#006aa7", "#fecc02"),
    "CAN": ("#ff0000", "#ffffff"),
    "TUR": ("#e30a17", "#ffffff"),
    "USA": ("#3c3b6e", "#b22234"),
    "POR": ("#006600", "#ff0000"),
    "SRB": ("#c6363c", "#0c4076"),
    "NOR": ("#ba0c2f", "#00205b"),
    "URU": ("#0038a8", "#fcd116"),
    "SUI": ("#ff0000", "#ffffff"),
    "GER": ("#000000", "#dd0000"),
    "ENG": ("#cf081f", "#ffffff"),
    "JPN": ("#bc002d", "#ffffff"),
    "BEL": ("#000000", "#fae042"),
    "FRA": ("#002395", "#ffffff"),
    "ESP": ("#aa151b", "#f1bf00"),
    "COL": ("#fcd116", "#003893"),
    "CRO": ("#ff0000", "#ffffff"),
    "EGY": ("#ce1126", "#ffffff"),
    "ECU": ("#ffdd00", "#0039a6"),
    "DEN": ("#c8102e", "#ffffff"),
    "POL": ("#dc143c", "#ffffff"),
    "SEN": ("#00853f", "#fdef42"),
    "MEX": ("#006847", "#ce1126"),
    "KOR": ("#003478", "#ffffff"),
    "BRA": ("#009c3b", "#ffdf00"),
    "NED": ("#ff6600", "#ffffff"),
    "ARG": ("#74acdf", "#ffffff"),
}

# Player career descriptions
PLAYER_CAREER = {
    "Achraf Hakimi": {"caps": 85, "goals": 10, "worldCups": 2, "desc": "摩洛哥国家队核心后卫，2022世界杯帮助球队历史性闯入四强"},
    "Alexander Isak": {"caps": 50, "goals": 15, "worldCups": 1, "desc": "瑞典锋线新星，英超纽卡斯尔联队射手"},
    "Alphonso Davies": {"caps": 45, "goals": 12, "worldCups": 1, "desc": "加拿大飞翼，拜仁慕尼黑左后卫，速度惊人"},
    "Arda Güler": {"caps": 20, "goals": 5, "worldCups": 1, "desc": "土耳其天才少年，皇家马德里中场新星"},
    "Christian Pulisic": {"caps": 70, "goals": 25, "worldCups": 2, "desc": "美国队长，AC米兰边锋，美国足球的旗帜性人物"},
    "Cristiano Ronaldo": {"caps": 210, "goals": 130, "worldCups": 6, "desc": "五届金球奖得主，足球史上最伟大的球员之一"},
    "Dušan Vlahović": {"caps": 30, "goals": 10, "worldCups": 1, "desc": "塞尔维亚锋霸，尤文图斯射手"},
    "Erling Haaland": {"caps": 35, "goals": 30, "worldCups": 0, "desc": "挪威进球机器，曼城前锋，破纪录无数"},
    "Federico Valverde": {"caps": 60, "goals": 8, "worldCups": 2, "desc": "乌拉圭全能中场，皇家马德里核心球员"},
    "Granit Xhaka": {"caps": 120, "goals": 15, "worldCups": 3, "desc": "瑞士队长，勒沃库森中场，经验丰富"},
    "Jamal Musiala": {"caps": 30, "goals": 5, "worldCups": 1, "desc": "德国天才中场，拜仁慕尼黑核心，技术出众"},
    "Jude Bellingham": {"caps": 30, "goals": 5, "worldCups": 1, "desc": "英格兰中场新星，皇家马德里超级签约"},
    "Kaoru Mitoma": {"caps": 25, "goals": 8, "worldCups": 1, "desc": "日本边锋，布莱顿飞翼，盘带技术一流"},
    "Kevin De Bruyne": {"caps": 105, "goals": 28, "worldCups": 3, "desc": "比利时中场大师，曼城传奇，传球视野无与伦比"},
    "Kylian Mbappé": {"caps": 80, "goals": 45, "worldCups": 2, "desc": "法国超级巨星，皇家马德里前锋，速度与技术的完美结合"},
    "Lamine Yamal": {"caps": 15, "goals": 3, "worldCups": 1, "desc": "西班牙天才少年，巴塞罗那边锋，史上最年轻的欧洲杯进球者"},
    "Luis Díaz": {"caps": 55, "goals": 15, "worldCups": 1, "desc": "哥伦比亚飞翼，利物浦边锋，速度与激情的化身"},
    "Luka Modrić": {"caps": 180, "goals": 25, "worldCups": 4, "desc": "克罗地亚传奇中场，皇家马德里核心，2018金球奖得主"},
    "Mohamed Salah": {"caps": 100, "goals": 55, "worldCups": 1, "desc": "埃及法老，利物浦传奇，非洲足球的骄傲"},
    "Moisés Caicedo": {"caps": 40, "goals": 3, "worldCups": 1, "desc": "厄瓜多尔中场铁腰，切尔西核心，拦截能力出众"},
    "Rasmus Højlund": {"caps": 20, "goals": 8, "worldCups": 0, "desc": "丹麦锋线新星，曼联射手，进球效率惊人"},
    "Robert Lewandowski": {"caps": 150, "goals": 82, "worldCups": 2, "desc": "波兰传奇射手，巴塞罗那前锋，进球纪录粉碎机"},
    "Sadio Mané": {"caps": 100, "goals": 40, "worldCups": 2, "desc": "塞内加尔传奇，拜仁慕尼黑边锋，非洲足球先生"},
    "Santiago Giménez": {"caps": 30, "goals": 15, "worldCups": 1, "desc": "墨西哥锋线杀手，费耶诺德射手，进球嗅觉敏锐"},
    "Son Heung-min": {"caps": 120, "goals": 45, "worldCups": 3, "desc": "韩国足球旗帜，热刺传奇，亚洲足球的代表人物"},
    "Vinícius Júnior": {"caps": 35, "goals": 10, "worldCups": 1, "desc": "巴西超级巨星，皇家马德里边锋，速度与技巧的完美结合"},
    "Virgil van Dijk": {"caps": 80, "goals": 8, "worldCups": 2, "desc": "荷兰队长，利物浦后卫，世界最佳中后卫之一"},
    "lionel messi": {"caps": 180, "goals": 108, "worldCups": 5, "desc": "阿根廷传奇，八届金球奖得主，2022世界杯冠军，足球史上最伟大的球员"},
}

# Player breakthrough keywords
PLAYER_KEYWORDS = {
    "Achraf Hakimi": ["首秀", "世界杯", "历史性"],
    "Alexander Isak": ["新星", "崛起", "天赋"],
    "Alphonso Davies": ["首秀", "突破", "记录"],
    "Arda Güler": ["天才少年", "新星", "崛起"],
    "Christian Pulisic": ["首秀", "明星", "突破"],
    "Cristiano Ronaldo": ["传奇", "记录", "历史性"],
    "Dušan Vlahović": ["新星", "崛起", "天赋"],
    "Erling Haaland": ["记录", "突破", "天才少年"],
    "Federico Valverde": ["首秀", "世界杯", "突破"],
    "Granit Xhaka": ["首秀", "世界杯", "里程碑"],
    "Jamal Musiala": ["天才少年", "新星", "突破"],
    "Jude Bellingham": ["天才少年", "崛起", "明星"],
    "Kaoru Mitoma": ["新星", "突破", "高光时刻"],
    "Kevin De Bruyne": ["明星", "世界杯", "高光时刻"],
    "Kylian Mbappé": ["天才少年", "记录", "历史性"],
    "Lamine Yamal": ["天才少年", "记录", "最年轻"],
    "Luis Díaz": ["新星", "突破", "高光时刻"],
    "Luka Modrić": ["传奇", "金球奖", "历史性"],
    "Mohamed Salah": ["明星", "记录", "传奇"],
    "Moisés Caicedo": ["新星", "突破", "世界杯"],
    "Rasmus Højlund": ["新星", "崛起", "天赋"],
    "Robert Lewandowski": ["传奇", "记录", "历史性"],
    "Sadio Mané": ["明星", "世界杯", "传奇"],
    "Santiago Giménez": ["新星", "崛起", "世界杯"],
    "Son Heung-min": ["明星", "世界杯", "亚洲之光"],
    "Vinícius Júnior": ["天才少年", "崛起", "明星"],
    "Virgil van Dijk": ["明星", "世界杯", "传奇"],
    "lionel messi": ["传奇", "历史性", "世界杯冠军"],
}


def get_image_path(player_name):
    """Get the image path for a player."""
    for ext in ['.png', '.jpg']:
        path = STAR_FOLDER / f"{player_name}{ext}"
        if path.exists():
            return f"../{player_name}{ext}"
    return ""


def generate_flag_html(team_code):
    """Generate flag SVG or emoji based on team code."""
    flag_map = {
        "MAR": "🇲🇦", "SWE": "🇸🇪", "CAN": "🇨🇦", "TUR": "🇹🇷", "USA": "🇺🇸",
        "POR": "🇵🇹", "SRB": "🇷🇸", "NOR": "🇳🇴", "URU": "🇺🇾", "SUI": "🇨🇭",
        "GER": "🇩🇪", "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "JPN": "🇯🇵", "BEL": "🇧🇪", "FRA": "🇫🇷",
        "ESP": "🇪🇸", "COL": "🇨🇴", "CRO": "🇭🇷", "EGY": "🇪🇬", "ECU": "🇪🇨",
        "DEN": "🇩🇰", "POL": "🇵🇱", "SEN": "🇸🇳", "MEX": "🇲🇽", "KOR": "🇰🇷",
        "BRA": "🇧🇷", "NED": "🇳🇱", "ARG": "🇦🇷",
    }
    return flag_map.get(team_code, "🏳️")


def generate_player_page(player_name, info, career, keywords, image_path):
    """Generate HTML for a single player."""
    flag = generate_flag_html(info["teamCode"])

    keywords_html = "".join([f'<span class="keyword-tag">{kw}</span>' for kw in keywords])

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{player_name} - 2026 FIFA世界杯球员档案</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&family=Oswald:wght@300;400;500;600;700&display=swap');

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ background: #0a0a0a; color: #ffffff; font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; overflow-x: hidden; }}

        .hero {{
            position: relative; min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            display: flex; align-items: center; justify-content: center; overflow: hidden;
        }}
        .hero::before {{
            content: ''; position: absolute; inset: 0;
            background: radial-gradient(circle at 20% 80%, rgba(255,215,0,0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(0,100,0,0.15) 0%, transparent 50%);
            z-index: 1;
        }}
        .hero-content {{ position: relative; z-index: 2; text-align: center; max-width: 1200px; padding: 0 2rem; }}
        .player-number {{
            font-family: 'Oswald', sans-serif; font-size: 15rem; font-weight: 700; line-height: 1;
            background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1;
        }}
        .player-image {{
            width: 200px; height: 200px; border-radius: 50%; margin: 0 auto 2rem;
            border: 4px solid #ffd700; overflow: hidden; background: #1a1a2e;
        }}
        .player-image img {{ width: 100%; height: 100%; object-fit: cover; }}
        .flag {{ font-size: 3rem; margin-bottom: 1rem; }}
        .player-name {{
            font-family: 'Oswald', sans-serif; font-size: 4rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;
            text-shadow: 0 4px 30px rgba(0,0,0,0.5);
        }}
        .player-name span {{
            display: block; font-size: 1.5rem; font-weight: 300; letter-spacing: 0.2em;
            color: #ffd700; margin-top: 0.5rem; font-family: 'Noto Sans SC', sans-serif;
        }}
        .player-meta {{ display: flex; justify-content: center; gap: 3rem; margin-top: 2rem; flex-wrap: wrap; }}
        .meta-item {{ text-align: center; }}
        .meta-label {{ font-size: 0.75rem; letter-spacing: 0.2em; color: rgba(255,255,255,0.5); margin-bottom: 0.5rem; }}
        .meta-value {{ font-family: 'Oswald', sans-serif; font-size: 1.5rem; font-weight: 500; color: #ffd700; }}

        .section {{ padding: 6rem 2rem; }}
        .section-title {{ font-family: 'Noto Sans SC', sans-serif; font-size: 2.5rem; font-weight: 700; text-align: center; margin-bottom: 4rem; }}
        .section-title::after {{ content: ''; display: block; width: 60px; height: 3px; background: #ffd700; margin: 1rem auto 0; }}

        .stats-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; max-width: 1000px; margin: 0 auto; }}
        .stat-card {{
            background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 2rem; text-align: center;
            transition: all 0.3s ease;
        }}
        .stat-card:hover {{ transform: translateY(-5px); border-color: #ffd700; box-shadow: 0 10px 40px rgba(255,215,0,0.1); }}
        .stat-value {{ font-family: 'Oswald', sans-serif; font-size: 3rem; font-weight: 700; color: #ffd700; line-height: 1; }}
        .stat-label {{ font-size: 0.9rem; color: rgba(255,255,255,0.6); margin-top: 0.75rem; }}

        .info-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 3rem; max-width: 1200px; margin: 0 auto; }}
        .info-card {{
            background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2.5rem;
        }}
        .info-card-title {{ font-family: 'Noto Sans SC', sans-serif; font-size: 1.4rem; font-weight: 700; color: #ffd700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }}
        .info-card-title .icon {{ font-size: 1.8rem; }}
        .info-list {{ list-style: none; }}
        .info-list li {{ padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }}
        .info-list li:last-child {{ border-bottom: none; }}
        .info-list .label {{ color: rgba(255,255,255,0.6); font-size: 0.9rem; }}
        .info-list .value {{ font-weight: 500; color: #ffffff; }}
        .info-list .value.highlight {{ color: #ffd700; }}

        .keyword-tags {{ display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 2rem; }}
        .keyword-tag {{ background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; color: #ffd700; }}

        .career-desc {{ max-width: 800px; margin: 0 auto; text-align: center; font-size: 1.1rem; line-height: 2; color: rgba(255,255,255,0.8); }}

        .footer {{ padding: 3rem 2rem; background: #050505; text-align: center; }}
        .footer-logo {{ font-family: 'Oswald', sans-serif; font-size: 1.5rem; font-weight: 700; color: #ffd700; margin-bottom: 1rem; }}
        .footer-text {{ font-size: 0.8rem; color: rgba(255,255,255,0.4); }}

        @media (max-width: 768px) {{
            .player-name {{ font-size: 2.5rem; }}
            .player-number {{ font-size: 8rem; }}
            .stats-grid {{ grid-template-columns: repeat(2, 1fr); }}
            .info-grid {{ grid-template-columns: 1fr; }}
            .player-meta {{ gap: 1.5rem; }}
        }}
    </style>
</head>
<body>
    <section class="hero">
        <div class="player-number">{info["number"]}</div>
        <div class="hero-content">
            <div class="flag">{flag}</div>
            <div class="player-image">
                <img src="{image_path}" alt="{player_name}">
            </div>
            <h1 class="player-name">
                {player_name.upper()}
                <span>{info["teamCn"]} · {info["positionCn"]}</span>
            </h1>
            <div class="player-meta">
                <div class="meta-item">
                    <div class="meta-label">位置</div>
                    <div class="meta-value">{info["positionCn"]}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">球队</div>
                    <div class="meta-value">{info["teamCn"]}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">球衣号码</div>
                    <div class="meta-value">{info["number"]}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">世界杯</div>
                    <div class="meta-value">2026</div>
                </div>
            </div>
        </div>
    </section>

    <section class="section" style="background: linear-gradient(180deg, #0a0a0a 0%, #111 100%);">
        <h2 class="section-title">职业生涯数据</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{career["caps"]}</div>
                <div class="stat-label">国家队出场</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{career["goals"]}</div>
                <div class="stat-label">国家队进球</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{career["worldCups"]}</div>
                <div class="stat-label">世界杯参赛</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">2026</div>
                <div class="stat-label">入选世界杯阵容</div>
            </div>
        </div>
    </section>

    <section class="section">
        <h2 class="section-title">球员简介</h2>
        <p class="career-desc">{career["desc"]}</p>
        <div class="keyword-tags">
            {keywords_html}
        </div>
    </section>

    <section class="section" style="background: linear-gradient(180deg, #111 0%, #0a0a0a 100%);">
        <h2 class="section-title">球员档案</h2>
        <div class="info-grid">
            <div class="info-card">
                <h3 class="info-card-title"><span class="icon">👤</span> 基本信息</h3>
                <ul class="info-list">
                    <li><span class="label">姓名</span><span class="value">{player_name}</span></li>
                    <li><span class="label">国籍</span><span class="value highlight">{info["teamCn"]} {flag}</span></li>
                    <li><span class="label">位置</span><span class="value">{info["positionCn"]} ({info["position"]})</span></li>
                    <li><span class="label">球衣号码</span><span class="value highlight">{info["number"]}</span></li>
                </ul>
            </div>
            <div class="info-card">
                <h3 class="info-card-title"><span class="icon">📊</span> 国家队数据</h3>
                <ul class="info-list">
                    <li><span class="label">出场次数</span><span class="value highlight">{career["caps"]} 场</span></li>
                    <li><span class="label">进球数</span><span class="value highlight">{career["goals"]} 球</span></li>
                    <li><span class="label">世界杯参赛</span><span class="value">{career["worldCups"]} 届</span></li>
                    <li><span class="label">2026世界杯</span><span class="value highlight">入选大名单</span></li>
                </ul>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="footer-logo">FIFA WORLD CUP 2026</div>
        <p class="footer-text">一球成名 · 2026世界杯球星档案</p>
    </footer>
</body>
</html>'''
    return html


def main():
    print("开始生成球员档案页面...")
    print(f"输出目录: {OUTPUT_FOLDER}")
    print()

    # Ensure output folder exists
    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

    # Load breakthroughs data
    breakthroughs = {}
    if BREAKTHROUGHS_PATH.exists():
        data = json.loads(BREAKTHROUGHS_PATH.read_text(encoding="utf-8"))
        for p in data.get("players", []):
            name = p.get("player", "").lower()
            breakthroughs[name] = p

    # Generate pages for each player
    generated = 0
    for player_name in sorted(PLAYER_INFO.keys()):
        info = PLAYER_INFO[player_name]
        career = PLAYER_CAREER.get(player_name, {"caps": 0, "goals": 0, "worldCups": 0, "desc": "2026世界杯参赛球员"})
        keywords = PLAYER_KEYWORDS.get(player_name, ["世界杯", "2026"])
        image_path = get_image_path(player_name)

        # Generate HTML
        html = generate_player_page(player_name, info, career, keywords, image_path)

        # Save file
        filename = f"{player_name.lower().replace(' ', '-').replace('é', 'e').replace('ó', 'o').replace('á', 'a').replace('ü', 'u').replace('ö', 'o').replace('ø', 'o').replace('ñ', 'n').replace('ć', 'c').replace('ž', 'z').replace('š', 's').replace('đ', 'd')}.html"
        output_path = OUTPUT_FOLDER / filename
        output_path.write_text(html, encoding="utf-8")

        generated += 1
        print(f"  [{generated}/28] 已生成: {player_name} -> {filename}")

    print()
    print(f"完成！共生成 {generated} 个球员档案页面")
    print(f"保存位置: {OUTPUT_FOLDER}")


if __name__ == "__main__":
    main()
