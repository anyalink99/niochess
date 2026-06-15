"""Render niochess PWA icons and OG image from the favicon motif (Pillow only)."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (26, 31, 41, 255)        # #1a1f29
LINE = (58, 67, 80, 255)      # #3a4350
AMBER = (255, 204, 77)        # #ffcc4d
HILITE = (255, 243, 207)      # #fff3cf


def amber(a=255):
    return AMBER + (a,)


def draw_motif(img, k):
    """Draw the flying-piece motif scaled by k (units are the 64px viewBox)."""
    def sc(v):
        return int(v * k)

    s = img.size[0]

    # motion trail (translucent, round caps)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    w = sc(7)
    dl.line([sc(18), sc(44), sc(42), sc(20)], fill=amber(int(0.22 * 255)), width=w)
    r = w // 2
    for cx, cy in ((sc(18), sc(44)), (sc(42), sc(20))):
        dl.ellipse([cx - r, cy - r, cx + r, cy + r], fill=amber(int(0.22 * 255)))
    img.alpha_composite(layer)

    # target ring
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    cx, cy, rr = sc(44), sc(18), sc(8.5)
    dl.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=amber(int(0.55 * 255)), width=sc(3))
    img.alpha_composite(layer)

    # piece (solid) + highlight
    d = ImageDraw.Draw(img)
    cx, cy, rr = sc(24), sc(40), sc(12)
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=amber(255))
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    hx, hy, hr = sc(20.5), sc(36.5), sc(3.5)
    dl.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=HILITE + (int(0.85 * 255),))
    img.alpha_composite(layer)


def make_icon(master=1024, rounded=True, opaque=False):
    img = Image.new("RGBA", (master, master), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = master / 64
    rad = int(14 * k) if rounded else 0
    if rounded and not opaque:
        d.rounded_rectangle([0, 0, master - 1, master - 1], radius=rad, fill=BG)
        d.rounded_rectangle([int(1.5 * k), int(1.5 * k), master - int(1.5 * k), master - int(1.5 * k)],
                            radius=int(12.5 * k), outline=LINE, width=max(1, int(k)))
    else:
        d.rectangle([0, 0, master, master], fill=BG)
    draw_motif(img, k)
    return img


def save_resized(master_img, size, name):
    master_img.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, name))


def make_og():
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)
    # soft accent glow top-right
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W - 520, -260, W + 180, 360], fill=(255, 204, 77, 26))
    img.alpha_composite(glow)

    # motif tile on the left
    tile = make_icon(master=720, rounded=True).resize((360, 360), Image.LANCZOS)
    img.alpha_composite(tile, (110, (H - 360) // 2))

    def font(path, sz):
        try:
            return ImageFont.truetype(path, sz)
        except Exception:
            return ImageFont.load_default()

    serif = r"C:\Windows\Fonts\georgiab.ttf"
    sans = r"C:\Windows\Fonts\arial.ttf"
    tx = 540
    f_title = font(serif, 132)
    d.text((tx, 232), "nio", font=f_title, fill=(232, 237, 244))
    w_nio = d.textlength("nio", font=f_title)
    d.text((tx + w_nio, 232), "chess", font=f_title, fill=AMBER)
    d.text((tx + 4, 392), "Real-time chess. No turns.", font=font(sans, 40), fill=(139, 151, 168))

    img.convert("RGB").save(os.path.join(ROOT, "og-image.png"))


def main():
    master = make_icon(1024, rounded=True)
    save_resized(master, 512, "icon-512.png")
    save_resized(master, 192, "icon-192.png")
    # opaque full-bleed square (iOS apple-touch + Android maskable safe-zone)
    full = make_icon(1024, rounded=False, opaque=True)
    save_resized(full, 180, "apple-touch-icon.png")
    save_resized(full, 512, "icon-maskable-512.png")
    make_og()
    print("icons + og-image written")


if __name__ == "__main__":
    main()
