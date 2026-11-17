"""Builds the Comic Arena battlefield background (arena.svg, rendered to arena.webp).

A night-time colosseum seen from the edge of the fighting floor: packed stands curving
around the bowl, floodlight towers, an advertising wall, and a lit circular floor whose
middle band (55-85% of the height) is where the fighters' feet land.

    python3 prototypes/arena-scene/tools/build-arena-bg.py   # writes arena.svg
    node prototypes/arena-scene/tools/render-arena-bg.mjs    # writes arena.png, then save it as arena.webp
"""
import math
import random
from pathlib import Path

W, H = 2400, 1000
CX = W / 2
rng = random.Random(7)
out = []
add = out.append

add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
add('''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070f"/><stop offset=".55" stop-color="#0d1630"/><stop offset="1" stop-color="#1b2347"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".18" r=".7"><stop offset="0" stop-color="#5a6fb8" stop-opacity=".45"/><stop offset="1" stop-color="#5a6fb8" stop-opacity="0"/></radialGradient>
<linearGradient id="standShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1f2e"/><stop offset="1" stop-color="#0b0e16"/></linearGradient>
<linearGradient id="adGlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3b3b"/><stop offset=".5" stop-color="#ffb13b"/><stop offset="1" stop-color="#3bb5ff"/></linearGradient>
<radialGradient id="floor" cx=".5" cy=".38" r=".62"><stop offset="0" stop-color="#8a8173"/><stop offset=".4" stop-color="#5f584e"/><stop offset=".78" stop-color="#36322d"/><stop offset="1" stop-color="#1b1916"/></radialGradient>
<radialGradient id="spot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6dc" stop-opacity=".42"/><stop offset=".6" stop-color="#fff2cc" stop-opacity=".12"/><stop offset="1" stop-color="#fff2cc" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf2ff" stop-opacity=".34"/><stop offset="1" stop-color="#eaf2ff" stop-opacity="0"/></linearGradient>
<radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#e8f1ff" stop-opacity=".9"/><stop offset="1" stop-color="#9cc0ff" stop-opacity="0"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<pattern id="tiles" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M0 0H80V80" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/></pattern>
<filter id="crowdBlur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="softer"><feGaussianBlur stdDeviation="18"/></filter>
<clipPath id="floorClip"><ellipse cx="1200" cy="880" rx="1500" ry="470"/></clipPath>
</defs>''')
add(f'<rect width="{W}" height="{H}" fill="url(#sky)"/><rect width="{W}" height="{H}" fill="url(#glow)"/>')

# Distant city skyline beyond the stadium rim.
x = -20
while x < W + 40:
    w = rng.randint(40, 110); h = rng.randint(60, 190)
    add(f'<rect x="{x}" y="{150 - h}" width="{w}" height="{h + 40}" fill="#0a1022"/>')
    for wy in range(150 - h + 10, 170, 16):
        for wx in range(x + 6, x + w - 6, 14):
            if rng.random() < 0.18:
                add(f'<rect x="{wx}" y="{wy}" width="5" height="7" fill="#ffd67a" opacity="{rng.uniform(.25, .7):.2f}"/>')
    x += w + rng.randint(2, 14)

# The bowl: tiers of seats on ellipses centred far below the floor (softly blurred, like depth of field).
add('<g filter="url(#crowdBlur)">')
BOWL_Y = 790
def ring(rx, ry):
    return rx, ry
tiers = [(2050, 860), (1880, 760), (1730, 670), (1600, 590), (1490, 520)]  # outer (top) -> inner (bottom)
colours = ['#c74b4b', '#4b7fc7', '#d9b24c', '#e6e6e6', '#5fb36a', '#8a5fc7', '#e07b39', '#3c3f4a', '#2c2f38', '#9aa3b5']
for i, (rx, ry) in enumerate(tiers):
    inner = tiers[i + 1] if i + 1 < len(tiers) else (1400, 470)
    shade = 0.22 + i * 0.07
    # Seating band (upper half of the ring).
    add(f'<path d="M{CX - rx} {BOWL_Y} A{rx} {ry} 0 0 1 {CX + rx} {BOWL_Y} L{CX + inner[0]} {BOWL_Y} A{inner[0]} {inner[1]} 0 0 0 {CX - inner[0]} {BOWL_Y} Z" fill="#141826" opacity="1"/>')
    # Crowd: heads and shoulders packed along the band, smaller higher up (farther away).
    size = 5 + i * 1.6
    rows = 4
    for r in range(rows):
        t = (r + 0.5) / rows
        crx = rx - (rx - inner[0]) * t; cry = ry - (ry - inner[1]) * t
        step = size * 1.9
        n = int(math.pi * crx / step)
        for k in range(n):
            a = math.pi + math.pi * (k + rng.random() * 0.6) / n
            px = CX + crx * math.cos(a); py = BOWL_Y + cry * math.sin(a)
            if py > 520 or py < 30:
                continue
            c = rng.choice(colours)
            s = size * rng.uniform(.85, 1.15)
            lit = 0.55 + 0.45 * (1 - abs(math.cos(a)))  # brighter towards the middle, under the lights
            add(f'<ellipse cx="{px:.0f}" cy="{py + s * .9:.0f}" rx="{s * 1.05:.1f}" ry="{s * .8:.1f}" fill="{c}" opacity="{.55 * lit:.2f}"/>')
            add(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="{s * .55:.1f}" fill="#d9b59a" opacity="{.5 * lit:.2f}"/>')
    # Railing between tiers.
    add(f'<path d="M{CX - inner[0]} {BOWL_Y} A{inner[0]} {inner[1]} 0 0 1 {CX + inner[0]} {BOWL_Y}" fill="none" stroke="#6d7790" stroke-opacity=".55" stroke-width="{2 + i * .6:.1f}"/>')
    add(f'<path d="M{CX - rx} {BOWL_Y} A{rx} {ry} 0 0 1 {CX + rx} {BOWL_Y} L{CX + inner[0]} {BOWL_Y} A{inner[0]} {inner[1]} 0 0 0 {CX - inner[0]} {BOWL_Y} Z" fill="#000" opacity="{max(0, .5 - shade):.2f}"/>')

# Camera flashes in the crowd.
for _ in range(70):
    a = math.pi + math.pi * rng.random(); rx, ry = rng.uniform(1500, 2000), rng.uniform(520, 840)
    px, py = CX + rx * math.cos(a), BOWL_Y + ry * math.sin(a)
    if 60 < py < 600:
        add(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="{rng.uniform(2, 4):.1f}" fill="#fff" opacity="{rng.uniform(.5, .95):.2f}"/>')

add('</g>')
add(f'<rect width="{W}" height="560" fill="#060812" opacity=".28"/>')
# Big screens hanging over the stands.
for sx in (CX - 760, CX + 520):
    add(f'<rect x="{sx}" y="70" width="240" height="120" rx="8" fill="#0b0f1c" stroke="#3a4766" stroke-width="4"/>')
    add(f'<rect x="{sx + 10}" y="80" width="220" height="100" rx="4" fill="#16244a"/>')
    add(f'<text x="{sx + 120}" y="122" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="30" fill="#ffd25a">COMIC</text>')
    add(f'<text x="{sx + 120}" y="160" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="30" fill="#ff5a4a">ARENA</text>')

# Floodlight towers and their beams onto the floor.
for lx, ly, tx in ((300, 60, 980), (2100, 60, 1420), (760, 30, 1120), (1640, 30, 1280)):
    add(f'<polygon points="{lx - 26},{ly} {lx + 26},{ly} {tx + 300},{780} {tx - 300},{780}" fill="url(#beam)" opacity=".55"/>')
for lx, ly in ((300, 60), (2100, 60), (760, 30), (1640, 30)):
    add(f'<rect x="{lx - 6}" y="{ly}" width="12" height="{260 - ly}" fill="#0a0d16"/>')
    add(f'<rect x="{lx - 46}" y="{ly - 18}" width="92" height="36" rx="5" fill="#1c2233" stroke="#4b5672" stroke-width="2"/>')
    for k in range(4):
        add(f'<circle cx="{lx - 33 + k * 22}" cy="{ly}" r="8" fill="#fffbe9"/>')
    add(f'<circle cx="{lx}" cy="{ly}" r="110" fill="url(#lamp)" opacity=".7"/>')

# Perimeter wall: it stands on the back edge of the floor and wraps around it.
FX, FY, FRX, FRY = 1200, 880, 1500, 470
def edge(x, lift=0):
    t = max(-1, min(1, (x - FX) / FRX))
    return FY - FRY * math.sqrt(1 - t * t) - lift
def band(lo, hi, step=40):
    xs = list(range(-60, W + 61, step))
    top = ' '.join(f'{x},{edge(x, hi):.1f}' for x in xs)
    bottom = ' '.join(f'{x},{edge(x, lo):.1f}' for x in reversed(xs))
    return f'{top} {bottom}'
add(f'<polygon points="{band(0, 95)}" fill="url(#wall)"/>')
add(f'<polygon points="{band(60, 78)}" fill="url(#adGlow)" opacity=".9"/>')
add(f'<polygon points="{band(60, 78)}" fill="url(#adGlow)" opacity=".55" filter="url(#soft)"/>')
add(f'<polygon points="{band(92, 97)}" fill="#7f8aa6" opacity=".6"/>')
for i, word in enumerate(['POW!', 'HERO LEAGUE', 'BAM!', 'COMIC ARENA', 'ZAP!', 'VILLAIN CUP', 'KAPOW!']):
    px = 160 + (W - 320) * (i + 0.5) / 7
    add(f'<text x="{px:.0f}" y="{edge(px, 22):.0f}" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="30" letter-spacing="3" fill="#f4f0e2" opacity=".8">{word}</text>')

# Fighting floor: a lit circular platform in perspective.
add('<ellipse cx="1200" cy="880" rx="1500" ry="470" fill="url(#floor)"/>')
add('<g clip-path="url(#floorClip)">')
# Tiles foreshortened by a vertical squash.
add('<g transform="translate(1200 880) scale(1 .31) translate(-1200 -880)"><rect x="-400" y="-500" width="3200" height="2800" fill="url(#tiles)"/></g>')
for k in range(24):
    a = k * math.pi / 12
    add(f'<line x1="1200" y1="880" x2="{1200 + 1600 * math.cos(a):.0f}" y2="{880 + 1600 * .313 * math.sin(a):.0f}" stroke="#000" stroke-opacity=".16" stroke-width="3"/>')
for r, op in ((1250, .5), (980, .35), (620, .55), (300, .45)):
    add(f'<ellipse cx="1200" cy="880" rx="{r}" ry="{r * .313:.0f}" fill="none" stroke="#c9b27a" stroke-opacity="{op}" stroke-width="5"/>')
# Centre emblem: a star inside a ring.
pts = []
for k in range(10):
    a = -math.pi / 2 + k * math.pi / 5
    rr = 230 if k % 2 == 0 else 95
    pts.append(f'{1200 + rr * math.cos(a):.0f},{880 + rr * .313 * math.sin(a):.0f}')
add(f'<polygon points="{" ".join(pts)}" fill="#c9b27a" opacity=".28"/>')
# Scuffs and scorch marks from earlier fights.
for _ in range(26):
    sx, sy = rng.uniform(150, 2250), rng.uniform(520, 1000)
    add(f'<ellipse cx="{sx:.0f}" cy="{sy:.0f}" rx="{rng.uniform(20, 70):.0f}" ry="{rng.uniform(3, 9):.0f}" fill="#000" opacity="{rng.uniform(.04, .1):.2f}"/>')
for _ in range(3):
    sx, sy = rng.uniform(400, 2000), rng.uniform(640, 960)
    add(f'<ellipse cx="{sx:.0f}" cy="{sy:.0f}" rx="{rng.uniform(60, 110):.0f}" ry="{rng.uniform(12, 22):.0f}" fill="#000" opacity=".14" filter="url(#soft)"/>')
# Pools of light where the beams land.
add('<ellipse cx="1200" cy="760" rx="1200" ry="300" fill="url(#spot)"/>')
for tx in (760, 1640):
    add(f'<ellipse cx="{tx}" cy="700" rx="440" ry="130" fill="url(#spot)" opacity=".8"/>')
add('</g>')
# Floor rim: a stepped stone edge catching the light.
add('<ellipse cx="1200" cy="880" rx="1500" ry="470" fill="none" stroke="#8d7a52" stroke-opacity=".6" stroke-width="8"/>')
add('<ellipse cx="1200" cy="880" rx="1515" ry="478" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="10"/>')
# Haze and vignette.
add('<rect y="260" width="2400" height="220" fill="#9db3e6" opacity=".05" filter="url(#softer)"/>')
add(f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>')
add('</svg>')

target = Path(__file__).resolve().parent.parent / 'arena.svg'
target.write_text('\n'.join(out))
print(f'wrote {target} ({target.stat().st_size // 1024} KB)')
