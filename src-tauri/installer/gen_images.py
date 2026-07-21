#!/usr/bin/env python3
"""NSIS 설치 마법사용 브랜드 이미지(BMP) 생성 스크립트.

산출물:
  - sidebar.bmp (328x628) : Welcome / Finish / Uninstall 페이지 좌측 패널
  - header.bmp  (150x57)  : 나머지 페이지 상단 좌측 로고

디자인 원칙:
  - 그라디언트/글로우 없이 단색(플랫) 배경만 사용해 깔끔하고, 고DPI에서
    확대되어도 얼룩이 생기지 않게 한다.
  - 사이드바는 NSIS가 기본적으로 stretch 하므로 표준(164x314)의 2배 해상도로
    렌더링해 Windows 고DPI 화면에서도 선명하게 보이도록 한다.
  - 헤더 이미지는 MUI 기본값상 좌측에 놓이므로 로고를 캔버스 왼쪽에 정렬한다.

BMP는 NSIS 호환을 위해 24bit(BMP3, RGB)로 저장한다.
Python + Pillow만 사용하며 Mac/CI 어디서든 재실행 가능.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ICON = HERE.parent / "icons" / "256x256.png"
KR_FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

# 브랜드 컬러 (단색) — 앱 본체(src/index.css)의 다크 테마 토큰과 일치시킨다.
BG = (11, 18, 32)        # #0B1220  앱 --color-base (딥네이비, 플랫)
CARD = (255, 255, 255)   # 아이콘 뒤 흰 타일 카드
TITLE = (231, 237, 245)  # #E7EDF5  앱 --color-fg
SUB = (194, 204, 218)    # #C2CCDA  앱 --color-sub

# 렌더 슈퍼샘플 배율 (텍스트/모서리 안티에일리어싱용)
SS = 2


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
    # 표준 164x314의 2배 → 고DPI에서도 선명
    W, H = 328, 628
    w, h = W * SS, H * SS
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    # 아이콘 + 흰 라운드 카드 (중앙 상단)
    isize = 150 * SS
    card_pad = 26 * SS
    cx = w // 2
    iy = 150 * SS
    ix = cx - isize // 2
    card = [ix - card_pad, iy - card_pad, ix + isize + card_pad, iy + isize + card_pad]
    draw.rounded_rectangle(card, radius=40 * SS, fill=CARD)
    icon = load_icon(isize)
    img.paste(icon, (ix, iy), icon)

    # 앱 이름 + 서브 카피
    title_font = load_font(46 * SS)
    sub_font = load_font(24 * SS)
    ty = iy + isize + card_pad + 44 * SS
    draw_text_center(draw, cx, ty, "내 PC 한눈에", title_font, TITLE)
    draw_text_center(draw, cx, ty + 66 * SS, "PC 사양 한눈에 보기", sub_font, SUB)

    img = img.resize((W, H), Image.LANCZOS)
    img.save(HERE / "sidebar.bmp", "BMP")
    print("wrote sidebar.bmp", (W, H))


def make_header():
    # 헤더 이미지는 늘어나지 않으므로 표준 150x57 유지
    W, H = 150, 57
    w, h = W * SS, H * SS
    img = Image.new("RGB", (w, h), (255, 255, 255))

    # 로고를 왼쪽 정렬
    isize = 40 * SS
    x = 8 * SS
    y = (h - isize) // 2
    icon = load_icon(isize)
    img.paste(icon, (x, y), icon)

    img = img.resize((W, H), Image.LANCZOS)
    img.save(HERE / "header.bmp", "BMP")
    print("wrote header.bmp", (W, H))


if __name__ == "__main__":
    make_sidebar()
    make_header()
