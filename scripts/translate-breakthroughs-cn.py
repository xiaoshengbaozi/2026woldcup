"""
Translate FIFA player breakthroughs JSON to Chinese.
"""

import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "outputs" / "fifa-player-breakthroughs-final.json"
OUTPUT_PATH = ROOT / "outputs" / "fifa-player-breakthroughs-cn.json"

# 球队名称翻译
TEAM_CN = {
    "Algeria": "阿尔及利亚",
    "Argentina": "阿根廷",
    "Australia": "澳大利亚",
    "Austria": "奥地利",
    "Belgium": "比利时",
    "Bosnia And Herzegovina": "波黑",
    "Brazil": "巴西",
    "Cabo Verde": "佛得角",
    "Canada": "加拿大",
    "Colombia": "哥伦比亚",
    "Congo DR": "刚果民主共和国",
    "Croatia": "克罗地亚",
    "Curaçao": "库拉索",
    "Czechia": "捷克",
    "Côte D'Ivoire": "科特迪瓦",
    "Ecuador": "厄瓜多尔",
    "Egypt": "埃及",
    "England": "英格兰",
    "France": "法国",
    "Germany": "德国",
    "Ghana": "加纳",
    "Haiti": "海地",
    "IR Iran": "伊朗",
    "Iraq": "伊拉克",
    "Japan": "日本",
    "Jordan": "约旦",
    "Korea Republic": "韩国",
    "Mexico": "墨西哥",
    "Morocco": "摩洛哥",
    "Netherlands": "荷兰",
    "New Zealand": "新西兰",
    "Nigeria": "尼日利亚",
    "Norway": "挪威",
    "Panama": "巴拿马",
    "Paraguay": "巴拉圭",
    "Portugal": "葡萄牙",
    "Qatar": "卡塔尔",
    "Saudi Arabia": "沙特阿拉伯",
    "Scotland": "苏格兰",
    "Senegal": "塞内加尔",
    "South Africa": "南非",
    "Spain": "西班牙",
    "Sweden": "瑞典",
    "Switzerland": "瑞士",
    "Tunisia": "突尼斯",
    "Türkiye": "土耳其",
    "Uruguay": "乌拉圭",
    "USA": "美国",
    "Uzbekistan": "乌兹别克斯坦",
}

# 位置翻译
POSITION_CN = {
    "FW": "前锋",
    "MF": "中场",
    "DF": "后卫",
    "GK": "门将",
}

# 关键词翻译
KEYWORD_CN = {
    "debut": "首秀",
    "breakthrough": "突破",
    "first cap": "首次入选",
    "first goal": "首粒进球",
    "iconic": "标志性",
    "legendary": "传奇",
    "memorable": "难忘",
    "historic": "历史性",
    "youngest": "最年轻",
    "record": "记录",
    "milestone": "里程碑",
    "highlight": "高光时刻",
    "star": "明星",
    "rising": "崛起",
    "emerging": "新星",
    "talent": "天赋",
    "sensation": "轰动",
    "wonderkid": "天才少年",
}

# 搜索查询翻译
def translate_query(query):
    translations = {
        "international debut": "国际首秀",
        "qualifiers match report": "预选赛战报",
        "World Cup breakthrough": "世界杯突破",
        "FIFA World Cup": "FIFA世界杯",
    }
    result = query
    for en, cn in translations.items():
        result = result.replace(en, cn)
    return result


def translate_player(player):
    """Translate a single player entry."""
    translated = {
        "球员": player.get("player", ""),
        "球队": TEAM_CN.get(player.get("team", ""), player.get("team", "")),
        "球队代码": player.get("teamCode", ""),
        "位置": POSITION_CN.get(player.get("position", ""), player.get("position", "")),
        "搜索记录": [],
        "突破记录": [],
    }

    # 翻译搜索记录
    for search in player.get("searches", []):
        translated["搜索记录"].append({
            "查询": translate_query(search.get("query", "")),
            "结果数量": search.get("resultCount", 0),
        })

    # 翻译突破记录
    for bt in player.get("breakthroughs", []):
        translated_bt = {
            "链接": bt.get("url", ""),
            "标题": bt.get("title", ""),
            "内容长度": bt.get("contentLength", 0),
            "包含突破信息": bt.get("hasBreakthrough", False),
            "关键词": [KEYWORD_CN.get(kw, kw) for kw in bt.get("keywords", [])],
            "相关句子": bt.get("sentences", []),
        }
        translated["突破记录"].append(translated_bt)

    return translated


def main():
    print("正在读取数据...")
    data = json.loads(INPUT_PATH.read_text(encoding="utf-8"))

    print(f"共 {data['playerCount']} 名球员，开始翻译...")

    translated_data = {
        "数据来源": "FIFA官网 (fifa.com)",
        "搜索类型": "球员突破表现",
        "生成时间": data.get("generatedAt", ""),
        "筛选条件": {
            "球队": data.get("filters", {}).get("team"),
            "位置": data.get("filters", {}).get("position"),
            "数量限制": data.get("filters", {}).get("limit"),
        },
        "球员总数": data.get("playerCount", 0),
        "球员列表": [],
    }

    for i, player in enumerate(data.get("players", []), 1):
        if i % 100 == 0:
            print(f"  已翻译 {i}/{data['playerCount']} 名球员...")
        translated_data["球员列表"].append(translate_player(player))

    print(f"翻译完成，正在保存...")
    OUTPUT_PATH.write_text(
        json.dumps(translated_data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

    print(f"已保存到: {OUTPUT_PATH}")
    print(f"文件大小: {OUTPUT_PATH.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
