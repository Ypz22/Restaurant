#!/usr/bin/env python3
"""Valida los temas de DESIGN.md §3: contraste WCAG >= 4.5 y colores dentro de gamut sRGB.

Uso:
  python3 scripts/check-theme-contrast.py                       # valida el catálogo
  python3 scripts/check-theme-contrast.py 145 0.10 100 0.09 110 0.008
                                          # brand-h brand-c accent-h accent-c neutral-h neutral-c

THEMES y roles() deben coincidir con DESIGN.md §3.2. Si cambias uno, cambia el otro.
"""
import math
import sys

THEMES = {
    "admin":  (250, 0.04, 70, 0.10, 250, 0.006),
    "brasa":  (28, 0.15, 55, 0.11, 60, 0.008),
    "mar":    (240, 0.11, 190, 0.08, 230, 0.008),
    "cafe":   (50, 0.06, 65, 0.11, 70, 0.010),
    "huerta": (145, 0.10, 100, 0.09, 110, 0.008),
}

PAIRS = [
    ("foreground", "background"),
    ("muted-foreground", "background"),
    ("muted-foreground", "muted"),
    ("primary-foreground", "primary"),
    ("primary", "background"),
    ("secondary-foreground", "secondary"),
    ("highlight-foreground", "highlight"),
    ("inverse-foreground", "inverse"),
]


def roles(bh, bc, ah, ac, nh, nc):
    return {
        "background": (0.985, nc, nh),
        "foreground": (0.22, nc * 2, nh),
        "card": (1, 0, 0),
        "muted": (0.955, nc, nh),
        "muted-foreground": (0.50, nc * 2, nh),
        "border": (0.905, nc, nh),
        "primary": (0.50, bc, bh),
        "primary-foreground": (0.99, 0, 0),
        "secondary": (0.945, bc * 0.15, bh),
        "secondary-foreground": (0.40, bc * 0.8, bh),
        "highlight": (0.94, ac * 0.3, ah),
        "highlight-foreground": (0.42, ac * 0.8, ah),
        "inverse": (0.25, nc * 2, nh),
        "inverse-foreground": (0.97, nc, nh),
    }


def oklch_to_linear_srgb(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def in_gamut(rgb):
    return all(-0.001 <= c <= 1.001 for c in rgb)


def to_hex(rgb):
    enc = lambda c: 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
    return "#" + "".join(f"{round(enc(min(1, max(0, c))) * 255):02x}" for c in rgb)


def contrast(x, y):
    lum = lambda rgb: sum(w * min(1, max(0, c)) for w, c in zip((0.2126, 0.7152, 0.0722), rgb))
    a, b = sorted((lum(x), lum(y)), reverse=True)
    return (a + 0.05) / (b + 0.05)


def check(name, params):
    rgb = {k: oklch_to_linear_srgb(*v) for k, v in roles(*params).items()}
    errors = [f"{k} fuera de gamut" for k, v in rgb.items() if not in_gamut(v)]
    for fg, bg in PAIRS:
        ratio = contrast(rgb[fg], rgb[bg])
        if ratio < 4.5:
            errors.append(f"{fg}/{bg} = {ratio:.2f} (< 4.5)")
    print(f"{'OK ' if not errors else 'ERR'} {name}: " + ", ".join(f"{k} {to_hex(v)}" for k, v in rgb.items()))
    for e in errors:
        print(f"    {e}")
    return not errors


if __name__ == "__main__":
    # Autocheck: blanco/negro = 21:1 y un par gris claro sobre blanco debe fallar.
    assert abs(contrast((1, 1, 1), (0, 0, 0)) - 21) < 0.01
    assert contrast(oklch_to_linear_srgb(0.8, 0, 0), (1, 1, 1)) < 4.5

    if len(sys.argv) == 7:
        ok = check("custom", tuple(float(x) for x in sys.argv[1:]))
    else:
        ok = all([check(name, p) for name, p in THEMES.items()])
    sys.exit(0 if ok else 1)
