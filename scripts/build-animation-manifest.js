'use strict';

// Builds assets/data/animation-manifest.json from the raw asset packs under
// assets/images/PokemonArena/animations/. Only the curated set of effects listed in
// ANIMATION_REQUESTS below is indexed — the packs contain ~62,000 files across effects
// this game never uses, so we deliberately do not walk/index the whole tree.
//
// Indexes the individual frame PNGs (frame0000.png, frame0001.png, ...) directly rather
// than each variant's pre-baked spritesheet.png/spritesheet.txt: those aren't generated
// for every color/size variant (several are empty placeholders even though the loose
// frame PNGs exist), and a couple that do exist pack frames into a multi-row grid rather
// than a single strip. Per-frame files are present for every variant and let the player
// simply swap `background-image` on an interval — no spritesheet-geometry assumptions.
//
// The raw packs are ~62,000 files / 274MB and are NOT committed to git (see .gitignore) —
// keep them locally so this script can run, but only the frames it actually copies into
// CURATED_ROOT below (a couple hundred small files) ship with the game.
//
// Run with: node scripts/build-animation-manifest.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ANIMATIONS_ROOT = path.join(ROOT, 'assets', 'images', 'PokemonArena', 'animations');
const CURATED_ROOT = path.join(ROOT, 'assets', 'images', 'PokemonArena', 'animations-used');
// Overridable so a drift-check test can regenerate into a scratch file instead of the
// real committed one — writing the real file in place races other tests that read it
// concurrently when the suite runs in parallel.
const OUTPUT_PATH = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(ROOT, 'assets', 'data', 'animation-manifest.json');

const PACKS = {
    gigapack: 'Super Pixel Effects Gigapack',
    fantasyFx3: 'Super Pixel Fantasy FX Pack 3',
};

// Flat 15fps per each pack's own readme.txt — not encoded per-frame anywhere in the pack.
const PACK_FPS = {
    gigapack: 15,
    fantasyFx3: 15,
};

// key -> where to find it: { pack, category (Gigapack only), effect, color, size }
// Every entry here was verified to exist on disk before being added — the build script
// throws instead of silently skipping a missing one, so a bad entry is caught immediately.
const ANIMATION_REQUESTS = {
    // Pokemon types (used for skill-cast effects, keyed by the skill's move type)
    normal: { pack: 'gigapack', category: 'Impacts', effect: 'directional_impact_001', color: 'white', size: 'large' },
    fire: { pack: 'gigapack', category: 'Fire', effect: 'directional_fire_burst_001', color: 'red', size: 'large' },
    water: { pack: 'gigapack', category: 'Magic Bursts', effect: 'round_bubble_burst_001', color: 'blue', size: 'large' },
    electric: { pack: 'gigapack', category: 'Lightning', effect: 'lightning_strike_001', color: 'yellow', size: 'large' },
    grass: { pack: 'gigapack', category: 'Splatters', effect: 'directional_splatter_001', color: 'green', size: 'large' },
    ice: { pack: 'gigapack', category: 'Fantasy Spells', effect: 'spell_ice_001', color: 'blue', size: 'large' },
    fighting: { pack: 'gigapack', category: 'Impacts', effect: 'directional_impact_001', color: 'orange', size: 'large' },
    poison: { pack: 'gigapack', category: 'Fantasy Spells', effect: 'spell_poison_001', color: 'violet', size: 'large' },
    ground: { pack: 'gigapack', category: 'Smoke Bursts', effect: 'symmetrical_smoke_burst_001', color: 'brown', size: 'large' },
    flying: { pack: 'gigapack', category: 'Smoke Bursts', effect: 'symmetrical_smoke_burst_001', color: 'white', size: 'large' },
    psychic: { pack: 'gigapack', category: 'Sci-fi', effect: 'scifi_warp_001', color: 'violet', size: 'large' },
    bug: { pack: 'gigapack', category: 'Splatters', effect: 'burst_splatter_001', color: 'green', size: 'large' },
    rock: { pack: 'gigapack', category: 'Impacts', effect: 'symmetrical_impact_001', color: 'orange', size: 'large' },
    ghost: { pack: 'gigapack', category: 'Fantasy Spells', effect: 'spell_death_001', color: 'violet', size: 'large' },
    dragon: { pack: 'gigapack', category: 'Explosions', effect: 'epic_explosion_001', color: 'violet', size: 'large' },
    dark: { pack: 'gigapack', category: 'Smoke Bursts', effect: 'symmetrical_smoke_burst_001', color: 'black', size: 'large' },
    steel: { pack: 'gigapack', category: 'Sci-fi', effect: 'scifi_muzzle_flash_001', color: 'blue', size: 'large' },
    fairy: { pack: 'gigapack', category: 'Magic Bursts', effect: 'round_sparkle_burst_001', color: 'rainbow', size: 'large' },

    // Generic roles, independent of move type
    faint: { pack: 'gigapack', category: 'Splatters', effect: 'burst_splatter_001', color: 'black', size: 'large' },
    genericHit: { pack: 'gigapack', category: 'Impacts', effect: 'directional_impact_001', color: 'white', size: 'large' },
    buffApply: { pack: 'fantasyFx3', effect: 'fanfx3_attack_up', color: 'yellow', size: 'large' },
    debuffApply: { pack: 'fantasyFx3', effect: 'fanfx3_pain', color: 'red', size: 'large' },
};

const buildEntry = (key, request) => {
    const packDirName = PACKS[request.pack];
    if (!packDirName) throw new Error(`${key}: unknown pack "${request.pack}"`);
    const variantName = `${request.effect}_${request.size}_${request.color}`;
    // Gigapack nests PNG/<category>/<effect>/<variant>/; Fantasy FX Pack 3 is flat: PNG/<variant>/.
    const pathSegments = request.category ? [request.category, request.effect, variantName] : [variantName];
    const framesDir = path.join(ANIMATIONS_ROOT, packDirName, 'PNG', ...pathSegments);
    if (!fs.existsSync(framesDir)) throw new Error(`${key}: missing ${framesDir}`);

    const frameFiles = fs
        .readdirSync(framesDir)
        .filter((name) => /^frame\d+\.png$/.test(name))
        .sort();
    if (!frameFiles.length) throw new Error(`${key}: no frame*.png files in ${framesDir}`);

    // Copy just this variant's frames into the small, git-tracked curated directory —
    // the client (and this repo) only ever reads from here, never from the raw packs.
    const curatedDir = path.join(CURATED_ROOT, key);
    fs.mkdirSync(curatedDir, { recursive: true });
    frameFiles.forEach((frameFile) => {
        fs.copyFileSync(path.join(framesDir, frameFile), path.join(curatedDir, frameFile));
    });
    const relativeFramesDir = path.relative(ROOT, curatedDir).split(path.sep).join('/');

    return {
        pack: packDirName,
        framesDir: relativeFramesDir,
        frames: frameFiles,
        frameCount: frameFiles.length,
        fps: PACK_FPS[request.pack],
    };
};

const main = () => {
    const manifest = {};
    const errors = [];
    Object.entries(ANIMATION_REQUESTS).forEach(([key, request]) => {
        try {
            manifest[key] = buildEntry(key, request);
        } catch (error) {
            errors.push(error.message);
        }
    });
    if (errors.length) {
        console.error('Failed to build the following manifest entries:');
        errors.forEach((message) => console.error(`  - ${message}`));
        process.exitCode = 1;
        return;
    }
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote ${Object.keys(manifest).length} animation entries to ${path.relative(ROOT, OUTPUT_PATH)}`);
};

main();
