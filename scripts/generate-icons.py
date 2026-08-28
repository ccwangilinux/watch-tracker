#!/usr/bin/env python3
"""
由母圖產生 PWA 所需的全部 App Icon。

母圖放在 docs/（不進版控，因為設計稿含個人資訊），
所以這支腳本在別台機器上需要先取得母圖才能執行。

用法：python3 scripts/generate-icons.py <母圖路徑>
"""
import os
import sys
from PIL import Image

OUT = 'public/icons'
SIZES = [1024, 512, 192, 180, 152, 144, 120, 96, 76, 72, 60, 57, 48]

# 圖案佔畫面的比例。
#   0.76 — iOS 會套自己的圓角遮罩，吃掉約 10% 邊緣，留這個比例圖案不會被切
#   0.58 — Android maskable 的安全區只有中心 80%，要再縮一些
RATIO_ANY = 0.76
RATIO_MASKABLE = 0.58


def main(src: str) -> None:
    im = Image.open(src).convert('RGB')
    w, h = im.size
    bg = im.getpixel((w // 2, round(h * 0.10) + 40))

    # 只保留霓虹線條本身：母圖自帶 squircle 圓角，若整張沿用，
    # iOS 再套一次圓角會變成雙重圓角。以亮度門檻找出圖案範圍後重新合成。
    gray = im.convert('L')
    px = gray.load()
    points = [
        (x, y)
        for y in range(0, h, 2)
        for x in range(0, w, 2)
        if px[x, y] > 90
    ]
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]

    cx, cy = (min(xs) + max(xs)) // 2, (min(ys) + max(ys)) // 2
    half = max(max(xs) - min(xs), max(ys) - min(ys)) // 2 + 8
    art = im.crop((max(0, cx - half), max(0, cy - half), min(w, cx + half), min(h, cy + half)))

    os.makedirs(OUT, exist_ok=True)

    def render(size: int, ratio: float, path: str) -> None:
        # 一律用不透明背景：iOS 會把有透明區域的 icon 填成白底
        canvas = Image.new('RGB', (size, size), bg)
        inner = round(size * ratio)
        offset = (size - inner) // 2
        canvas.paste(art.resize((inner, inner), Image.LANCZOS), (offset, offset))
        canvas.save(path, optimize=True)

    for size in SIZES:
        render(size, RATIO_ANY, f'{OUT}/icon-{size}.png')
    for size in (192, 512):
        render(size, RATIO_MASKABLE, f'{OUT}/maskable-{size}.png')
    render(32, 0.86, f'{OUT}/favicon-32.png')

    print(f'已輸出 {len(SIZES) + 3} 個檔案至 {OUT}/')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
