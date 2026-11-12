#!/usr/bin/env python3
"""Build the battle effects catalogue: assets/data/battle-fx-manifest.json.

Every effect the battle screen can play becomes ONE sprite-sheet image plus its frame rectangles,
so the client loads a single image per effect and steps through it (no per-frame downloads).

Sources (all committed to the repo):
  1. assets/Animations/spritesheet/<Category>/<effect>/<effect>_large_<colour>/spritesheet.png
     with its spritesheet.txt atlas (unTied Games "Super Pixel Effects Gigapack", free version):
     77 effects, referenced in place.
  2. assets/images/PokemonArena/animations-used/<key>/frameNNNN.png: the 22 colour-specific
     effects curated from the full Gigapack and Fantasy FX 3 for the Pokemon types. Their loose
     frames are packed here into one strip each: assets/images/battle-fx/<key>.png.

Keys: pack effects use "<category-slug>/<effect>" (e.g. "impacts/directional_impact_001"),
curated effects use "type/<key>" (e.g. "type/fire", "type/faint").

  python3 scripts/build-battle-fx.py            # writes the manifest (and strips)
  python3 scripts/build-battle-fx.py --check    # exit 1 if the committed manifest is stale
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(ROOT, 'assets', 'Animations', 'spritesheet')
CURATED = os.path.join(ROOT, 'assets', 'images', 'PokemonArena', 'animations-used')
STRIPS = os.path.join(ROOT, 'assets', 'images', 'battle-fx')
OUT = os.path.join(ROOT, 'assets', 'data', 'battle-fx-manifest.json')
FPS = 15  # both packs' readme: 15 fps (66.7 ms per frame)

rel = lambda p: os.path.relpath(p, ROOT).replace(os.sep, '/')
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def pack_effects():
    effects = {}
    for category in sorted(os.listdir(PACK)):
        cdir = os.path.join(PACK, category)
        if not os.path.isdir(cdir):
            continue
        for effect in sorted(os.listdir(cdir)):
            edir = os.path.join(cdir, effect)
            variants = sorted(v for v in os.listdir(edir) if re.match(re.escape(effect) + r'_large_\w+$', v))
            if not variants:
                raise SystemExit(f'{category}/{effect}: no large variant')
            vdir = os.path.join(edir, variants[0])
            sheet = os.path.join(vdir, 'spritesheet.png')
            atlas = os.path.join(vdir, 'spritesheet.txt')
            frames = []
            for line in open(atlas).read().strip().splitlines():
                name, rect = line.split('=')
                x, y, w, h = (int(n) for n in rect.split())
                frames.append([x, y, w, h])
            if not frames:
                raise SystemExit(f'{atlas}: empty atlas')
            sw, sh = Image.open(sheet).size
            for x, y, w, h in frames:
                if x + w > sw or y + h > sh:
                    raise SystemExit(f'{atlas}: frame outside the sheet')
            effects[f'{slug(category)}/{effect}'] = {
                'src': rel(sheet), 'sheet': [sw, sh], 'frames': frames, 'fps': FPS,
                'category': category, 'colour': variants[0].rsplit('_', 1)[1],
            }
    return effects


def curated_effects(write):
    effects = {}
    os.makedirs(STRIPS, exist_ok=True)
    for key in sorted(os.listdir(CURATED)):
        kdir = os.path.join(CURATED, key)
        names = sorted(n for n in os.listdir(kdir) if re.match(r'frame\d+\.png$', n))
        if not names:
            raise SystemExit(f'{kdir}: no frames')
        ims = [Image.open(os.path.join(kdir, n)).convert('RGBA') for n in names]
        w = max(i.width for i in ims)
        h = max(i.height for i in ims)
        out = os.path.join(STRIPS, f'{key}.png')
        if write:
            strip = Image.new('RGBA', (w * len(ims), h), (0, 0, 0, 0))
            for n, im in enumerate(ims):
                strip.paste(im, (n * w + (w - im.width) // 2, (h - im.height) // 2))
            strip.save(out, optimize=True)
        effects[f'type/{key}'] = {
            'src': rel(out), 'sheet': [w * len(ims), h], 'frames': [[n * w, 0, w, h] for n in range(len(ims))], 'fps': FPS,
            'category': 'Pokemon type', 'colour': key,
        }
    return effects


def main():
    check = '--check' in sys.argv
    effects = {**pack_effects(), **curated_effects(write=not check)}
    manifest = {
        'version': 1,
        'fps': FPS,
        'credit': 'Super Pixel Effects Gigapack and Super Pixel Fantasy FX Pack 3 by unTied Games',
        'effects': effects,
    }
    text = json.dumps(manifest, indent=1, sort_keys=True) + '\n'
    if check:
        same = os.path.exists(OUT) and open(OUT).read() == text
        print('battle-fx-manifest.json is up to date' if same else 'battle-fx-manifest.json is STALE: run scripts/build-battle-fx.py')
        sys.exit(0 if same else 1)
    with open(OUT, 'w') as f:
        f.write(text)
    print(f'wrote {len(effects)} effects to {rel(OUT)}')


if __name__ == '__main__':
    main()
