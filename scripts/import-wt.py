#!/usr/bin/env python3
"""
把 wt.txt 的文字紀錄轉成 App 的備份 JSON。

來源格式以 - 分隔，但欄位數不固定，因此一律「從右往左剝」：
    類別-片名
    類別-片名-第N集
    類別-片名-第X季
    類別-片名-第X季-第N集
    類別-片名-第N集-（H:MM:SS）
    類別-片名-第X季-（完結）

用法：python3 scripts/import-wt.py wt.txt > backup.json
"""
import json
import re
import sys
import uuid
from datetime import datetime, timezone

# 段落內可能夾雜半形/全形空白（例如「第64   集」），比對前先正規化
EP = re.compile(r'^第\s*(\d+)\s*集?$')
SEASON = re.compile(r'^第\s*([0-9一二三四五六七八九十]+)\s*季$')
PAREN = re.compile(r'^[（(]\s*(.*?)\s*[)）]$')
TIME = re.compile(r'^(?:(\d+)\s*:)?\s*(\d+)\s*:\s*(\d+)$')
# 有些片名把季數直接黏在後面而不加分隔符：「我推的孩子第三季」
TRAILING_SEASON = re.compile(r'^(.*?)第([0-9一二三四五六七八九十]+)季$')

CN = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10}


def cn2int(s: str) -> int:
    if s.isdigit():
        return int(s)
    if s == '十':
        return 10
    if s.startswith('十'):
        return 10 + CN.get(s[1:2], 0)
    if s.endswith('十'):
        return CN.get(s[0], 0) * 10
    if '十' in s:
        a, b = s.split('十', 1)
        return CN.get(a, 0) * 10 + CN.get(b, 0)
    return CN.get(s, 1)


# 類別的顯示樣式，順序依原檔首次出現的先後
CATEGORY_STYLE = {
    '陸劇':   ('🎭', '#a78bfa'),
    '韓劇':   ('🇰🇷', '#ff4fa3'),
    '日本動畫': ('🎌', '#4f9dff'),
    '大陸動漫': ('🐉', '#2dd4a7'),
    '中國動漫': ('🏯', '#ffb020'),
    '漫畫':   ('📖', '#ff8a4f'),
}
FALLBACK_STYLE = ('🎬', '#94a3b8')


def parse_line(line: str):
    """回傳 (紀錄 dict, 警告訊息 list)"""
    warnings = []
    parts = [p.strip() for p in line.split('-')]
    if len(parts) < 2:
        return None, ['沒有分隔符號']

    category = parts[0]
    rest = parts[1:]
    # season 0 = 未設定，與 App 的預設一致；文字裡有寫季數時才會被覆蓋
    season, episode, watch_time, completed = 0, 0, 0, False

    # 1. 最右邊的括號：觀看時間或「完結」
    if rest:
        m = PAREN.match(rest[-1])
        if m:
            inner = m.group(1)
            rest = rest[:-1]
            if inner == '完結':
                completed = True
            else:
                t = TIME.match(inner)
                if t:
                    watch_time = (int(t.group(1) or 0) * 3600
                                  + int(t.group(2)) * 60
                                  + int(t.group(3)))
                else:
                    warnings.append(f'括號內容無法辨識：{inner}')

    # 2. 集數
    if rest:
        m = EP.match(rest[-1])
        if m:
            episode = int(m.group(1))
            rest = rest[:-1]

    # 3. 季數
    if rest:
        m = SEASON.match(rest[-1])
        if m:
            season = cn2int(m.group(1))
            rest = rest[:-1]

    title = '-'.join(p for p in rest if p).strip()

    # 片名開頭誤植了類別名
    if title.startswith(category + '-'):
        title = title[len(category) + 1:]
        warnings.append('片名開頭重複類別名，已移除')

    # 季數黏在片名尾巴而沒有分隔符
    m = TRAILING_SEASON.match(title)
    if m and m.group(1).strip():
        title = m.group(1).strip()
        season = cn2int(m.group(2))
        warnings.append(f'季數黏在片名後，已抽出為第 {season} 季')

    if not title:
        return None, warnings + ['解析後片名為空']

    return {
        'category': category,
        'title': title,
        'season': season,
        'episode': episode,
        'watchTime': watch_time,
        'completed': completed,
    }, warnings


def main(path: str) -> None:
    raw = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    lines = [l.strip() for l in raw.split('\n') if l.strip()]

    now = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    categories, cat_ids, records = [], {}, []
    all_warnings = []

    for lineno, line in enumerate(lines, 1):
        parsed, warnings = parse_line(line)
        for w in warnings:
            all_warnings.append((lineno, line, w))
        if parsed is None:
            continue

        name = parsed['category']
        if name not in cat_ids:
            icon, color = CATEGORY_STYLE.get(name, FALLBACK_STYLE)
            cat_ids[name] = str(uuid.uuid4())
            categories.append({
                'id': cat_ids[name], 'name': name, 'icon': icon, 'color': color,
                'sortOrder': len(categories),
                'createdAt': now, 'updatedAt': now, 'deletedAt': None,
            })

        records.append({
            'id': str(uuid.uuid4()),
            'categoryId': cat_ids[name],
            'title': parsed['title'],
            'season': parsed['season'],
            'episode': parsed['episode'],
            'watchTime': parsed['watchTime'],
            'completed': parsed['completed'],
            'sortOrder': len(records),
            'note': '',
            'createdAt': now, 'updatedAt': now, 'deletedAt': None,
        })

    json.dump({
        'app': 'watch-tracker', 'version': 1, 'exportedAt': now,
        'categories': categories, 'records': records,
    }, sys.stdout, ensure_ascii=False, indent=2)

    print(f'\n解析 {len(lines)} 行 → {len(categories)} 個類別、{len(records)} 筆紀錄',
          file=sys.stderr)
    if all_warnings:
        print(f'{len(all_warnings)} 處已自動修正：', file=sys.stderr)
        for lineno, line, why in all_warnings:
            print(f'  L{lineno} {why}\n        {line[:70]}', file=sys.stderr)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
