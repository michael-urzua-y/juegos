"""Genera el logo de Monay Solutions a partir del logo original de Monay Market.

- Recolorea el colibrí y "Monay" al naranja de la app, conservando el sombreado.
- Reemplaza "MARKET" por "SOLUTIONS" con la misma altura, espaciado y centro.
- Compone el ícono cuadrado de la PWA sobre un fondo oscuro cálido.

Uso (desde la raíz del proyecto): python3 branding/build-logo.py
Requiere Pillow y la fuente DIN Condensed Bold de macOS.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "branding" / "monay-original.png"
FONT = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"

ORANGE = (249, 115, 22)  # orange-500, el color de la app
BG_CENTER = (46, 26, 14)  # brillo cálido detrás del colibrí
BG_EDGE = (12, 10, 9)  # stone-950 (#0c0a09, ICON_BACKGROUND en pwa-assets.config.ts)

# Posición de "MARKET" en el original de 1024 px (medida sobre el canal alfa)
MARKET_BOX = (400, 745, 628, 790)
TEXT_TOP, CAP_HEIGHT, CENTER_X = 751, 33, 514
LETTER_GAP = 24  # separación entre letras, igual que en "MARKET"
WORD = "SOLUTIONS"


def recolor(img: Image.Image) -> Image.Image:
    """Tiñe de naranja usando el brillo original: sombras más oscuras, brillos más claros."""
    out = img.copy()
    px = out.load()
    w, h = out.size
    ref = 241 / 255  # brillo mediano de "Monay" en el original → queda exactamente en ORANGE
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            f = max(r, g, b) / 255 / ref
            if f <= 1:
                # Raíz: suaviza las sombras para que el colibrí se lea del mismo naranja
                # sin perder el detalle de las plumas.
                f = f**0.5
                nr, ng, nb = (c * f for c in ORANGE)
            else:  # brillos: aclarar levemente hacia blanco sin salirse del tono
                t = min(1.0, (f - 1) * 0.6)
                nr, ng, nb = (c + (255 - c) * t for c in ORANGE)
            px[x, y] = (round(nr), round(ng), round(nb), a)
    return out


def draw_word(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    # Tamaño de fuente para que la altura de mayúsculas coincida con "MARKET"
    size = 40
    while True:
        font = ImageFont.truetype(FONT, size)
        top, bottom = font.getbbox("H")[1], font.getbbox("H")[3]
        if bottom - top >= CAP_HEIGHT:
            break
        size += 1
    widths = [font.getbbox(ch)[2] - font.getbbox(ch)[0] for ch in WORD]
    total = sum(widths) + LETTER_GAP * (len(WORD) - 1)
    x = CENTER_X - total / 2
    for ch, w in zip(WORD, widths):
        left, top = font.getbbox(ch)[0], font.getbbox("H")[1]
        draw.text((x - left, TEXT_TOP - top), ch, font=font, fill=(*ORANGE, 255))
        x += w + LETTER_GAP


def background(size: int) -> Image.Image:
    """Degradado radial suave: cálido al centro, casi negro en los bordes."""
    bg = Image.new("RGB", (size, size), BG_EDGE)
    glow = Image.new("L", (size, size), 0)
    ImageDraw.Draw(glow).ellipse((size * 0.18, size * 0.14, size * 0.82, size * 0.78), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    bg.paste(Image.new("RGB", (size, size), BG_CENTER), mask=glow)
    return bg


def main() -> None:
    logo = Image.open(SOURCE).convert("RGBA")
    ImageDraw.Draw(logo).rectangle(MARKET_BOX, fill=(0, 0, 0, 0))  # borra "MARKET"
    logo = recolor(logo)
    draw_word(logo)
    logo = logo.crop(logo.getbbox())
    logo.save(ROOT / "branding" / "monay-solutions-logo.png")

    # Ícono cuadrado: el logo debe caber en la zona segura circular (80 %) de los íconos maskable
    size = 1024
    icon = background(size).convert("RGBA")
    scale = (size * 0.8 * 0.95) / (logo.width**2 + logo.height**2) ** 0.5
    fitted = logo.resize((round(logo.width * scale), round(logo.height * scale)), Image.LANCZOS)
    icon.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    icon.convert("RGB").save(ROOT / "public" / "icon.png")
    print("listo:", fitted.size, "dentro de", size)


if __name__ == "__main__":
    main()
