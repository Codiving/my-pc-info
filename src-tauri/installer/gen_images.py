#!/usr/bin/env python3
"""NSIS 설치 마법사용 브랜드 이미지(BMP) 생성 스크립트.

산출물:
  - sidebar.bmp (164x314) : Welcome / Finish / Uninstall 페이지 좌측 패널
  - header.bmp  (150x57)  : 나머지 페이지 상단 우측 로고

BMP는 NSIS 호환을 위해 24bit(BMP3, RGB)로 저장한다.
Python + Pillow만 사용하며 Mac/CI 어디서든 재실행 가능.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ICON = HERE.parent / "icons" / "256x256.png"
KR_FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

# 브랜드 컬러 (딥 인디고 -> 블루 그라디언트)
TOP = (30, 27, 75)      # #1e1b4b
BOTTOM = (37, 99, 235)  # #2563eb
ACCENT = (96, 165, 250)  # #60a5fa


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        c = lerp(top, bottom, t)
        for x in range(w):
            px[x, y] = c
    return img


def load_font(size):
    try:
        return ImageFont.truetype(KR_FONT, size)
    except Exception:
        return ImageFont.load_default()


def load_icon(size):
    ic = Image.open(ICON).convert("RGBA")
    return ic.resize((size, size), Image.LANCZOS)


def draw_text_center(draw, cx, y, text, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text((cx - w / 2, y), text, font=font, fill=fill)


def make_sidebar():
    W, H = 164, 314
    img = vertical_gradient(W, H, TOP, BOTTOM).convert("RGBA")
    draw = ImageDraw.Draw(img)

    # 은은한 대각 하이라이트
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-60, -80, 150, 130], fill=(255, 255, 255, 22))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # 아이콘 (중앙 상단)
    isize = 84
    icon = load_icon(isize)
    ix = (W - isize) // 2
    iy = 74
    # 아이콘 뒤 라운드 카드
    card_pad = 14
    card = [ix - card_pad, iy - card_pad, ix + isize + card_pad, iy + isize + card_pad]
    draw.rounded_rectangle(card, radius=22, fill=(255, 255, 255, 28))
    img.paste(icon, (ix, iy), icon)
    draw = ImageDraw.Draw(img)

    # 앱 이름
    title_font = load_font(22)
    draw_text_center(draw, W / 2, iy + isize + 26, "내 PC 한눈에", title_font, (255, 255, 255, 255))

    # 서브 카피
    sub_font = load_font(12)
    draw_text_center(draw, W / 2, iy + isize + 56, "PC 사양 한눈에 보기", sub_font, (191, 219, 254, 255))

    # 하단 액센트 라인
    draw.rectangle([0, H - 4, W, H], fill=ACCENT + (255,))

    img.convert("RGB").save(HERE / "sidebar.bmp", "BMP")
    print("wrote sidebar.bmp", (W, H))


def make_header():
    W, H = 150, 57
    # 헤더는 NSIS 기본 흰색 바에 얹히므로 흰 배경 + 우측 로고
    img = Image.new("RGB", (W, H), (255, 255, 255))
    isize = 40
    icon = load_icon(isize)
    x = W - isize - 8
    y = (H - isize) // 2
    img.paste(icon.convert("RGB"), (x, y), icon)
    img.save(HERE / "header.bmp", "BMP")
    print("wrote header.bmp", (W, H))


if __name__ == "__main__":
    make_sidebar()
    make_header()
