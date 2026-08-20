const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'assets', 'data', 'animation-manifest.json');

const EXPECTED_KEYS = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
    'faint', 'genericHit', 'buffApply', 'debuffApply',
];

test('animation manifest exists and defines every Pokemon type plus the generic roles', () => {
    assert.ok(fs.existsSync(manifestPath), 'Run `node scripts/build-animation-manifest.js` to generate it');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    EXPECTED_KEYS.forEach((key) => {
        assert.ok(manifest[key], `Missing manifest entry: ${key}`);
    });
    assert.equal(Object.keys(manifest).length, EXPECTED_KEYS.length);
});

test('every manifest entry points at real frame files with a valid frame count and fps', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    Object.entries(manifest).forEach(([key, entry]) => {
        assert.ok(entry.framesDir, `${key}: missing framesDir`);
        assert.ok(Array.isArray(entry.frames) && entry.frames.length > 0, `${key}: no frames listed`);
        assert.equal(entry.frameCount, entry.frames.length, `${key}: frameCount does not match frames.length`);
        assert.ok(Number(entry.fps) > 0, `${key}: invalid fps`);
        const framesDirAbs = path.join(root, ...entry.framesDir.split('/'));
        assert.ok(fs.existsSync(framesDirAbs), `${key}: framesDir does not exist: ${entry.framesDir}`);
        entry.frames.forEach((frameFile) => {
            const framePath = path.join(framesDirAbs, frameFile);
            assert.ok(fs.existsSync(framePath), `${key}: missing frame file ${entry.framesDir}/${frameFile}`);
        });
    });
});

test('rebuilding the manifest from source assets produces the exact checked-in file (no drift)', () => {
    const { execFileSync } = require('node:child_process');
    const os = require('node:os');
    const scratchPath = path.join(os.tmpdir(), `animation-manifest-drift-check-${process.pid}.json`);
    try {
        execFileSync(
            process.execPath,
            [path.join(root, 'scripts', 'build-animation-manifest.js'), scratchPath],
            { cwd: root }
        );
        const before = fs.readFileSync(manifestPath, 'utf8');
        const rebuilt = fs.readFileSync(scratchPath, 'utf8');
        assert.equal(rebuilt, before, 'animation-manifest.json is stale — regenerate and commit it');
    } finally {
        fs.rmSync(scratchPath, { force: true });
    }
});

test('client loads the manifest, maps skill move type to an animation key, and plays bursts on cast and faint', () => {
    const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    assert.match(script, /ANIMATION_MANIFEST_URL = 'assets\/data\/animation-manifest\.json'/);
    assert.match(script, /const getAnimationKeyForSkill = /);
    assert.match(script, /const playPokemonSpriteBurst = /);
    assert.match(script, /const playPokemonSpriteProjectile = /);
    assert.match(
        script,
        /playPokemonSpriteProjectile\(\{\s*fromX: initialSourceX,\s*fromY: initialSourceY,\s*toX: targetPoint\.x,\s*toY: targetPoint\.y,\s*key: animationKey,\s*\}\)/
    );
    assert.match(script, /key: 'faint'/);
    assert.match(script, /const renderWeatherBanner = /);
});

test('ingame.html has the weather banner markup and manual.html credits the asset packs', () => {
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
    assert.match(ingame, /id="weather-banner"/);
    assert.match(ingame, /id="weather-banner-name"/);
    assert.match(ingame, /id="weather-banner-rounds"/);
    const manual = fs.readFileSync(path.join(root, 'manual.html'), 'utf8');
    assert.match(manual, /Will Tice \/ unTied Games/);
});

test('style.css defines the sprite-burst and weather-banner rules and mutes them with existing FX toggles', () => {
    const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    assert.match(styles, /\.pokemon-sprite-burst\s*\{/);
    assert.match(styles, /\.weather-banner\s*\{/);
    assert.match(styles, /body\.ui-disable-skill-cast-animations \.pokemon-sprite-burst/);
    assert.match(styles, /body\.skill-effects-muted \.pokemon-sprite-burst/);
});
