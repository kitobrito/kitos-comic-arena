// The battle animation system: scripts/battle-fx.js, its effect catalogue
// (assets/data/battle-fx-manifest.json, scripts/build-battle-fx.py) and the per-character
// profiles (assets/data/battle-fx-characters.json, scripts/build-battle-fx-characters.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const manifest = JSON.parse(read('assets', 'data', 'battle-fx-manifest.json'));
const profiles = JSON.parse(read('assets', 'data', 'battle-fx-characters.json'));
const engine = read('scripts', 'battle-fx.js');
const script = read('scripts', 'script.js');
const characters = require('../characters.js');

const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
// The death recipes the engine defines (DEATHS = { name(...) / 'name'(...) }).
const DEATHS = new Set([...engine.slice(engine.indexOf('const DEATHS = {'), engine.indexOf('const vineSvg'))
    .matchAll(/^ {8}(?:async )?'?([a-z-]+)'?\s*\(/gm)].map((m) => m[1]));

test('the effect catalogue has every Pokemon type, the generic roles and the pack effects; every sheet and frame exists', () => {
    for (const key of [...TYPES, 'faint', 'genericHit', 'buffApply', 'debuffApply']) assert.ok(manifest.effects[`type/${key}`], `missing type/${key}`);
    assert.ok(Object.keys(manifest.effects).length >= 100);
    for (const [key, e] of Object.entries(manifest.effects)) {
        assert.ok(fs.existsSync(path.join(root, ...e.src.split('/'))), `${key}: missing sheet ${e.src}`);
        assert.ok(e.frames.length > 0 && e.fps > 0, `${key}: no frames`);
        for (const [x, y, w, h] of e.frames) assert.ok(x + w <= e.sheet[0] && y + h <= e.sheet[1], `${key}: frame outside its sheet`);
    }
});

test('both catalogues are in sync with their sources (no drift)', () => {
    execFileSync('python3', [path.join(root, 'scripts', 'build-battle-fx.py'), '--check'], { cwd: root });
    execFileSync(process.execPath, [path.join(root, 'scripts', 'build-battle-fx-characters.js'), '--check'], { cwd: root });
});

test('every character, battle form and skill has an animation profile, and every effect and kill it names is real', () => {
    const everyone = characters.flatMap((c) => [c, ...(c.battleForms || [])]);
    for (const ch of everyone) {
        const id = String(ch.characterId || ch.id).toLowerCase();
        const p = profiles.characters[id];
        assert.ok(p, `${id}: no animation profile`);
        assert.ok(DEATHS.has(p.kill), `${id}: unknown kill ${p.kill}`);
        for (const key of [p.entry, p.victory, p.defeat]) assert.ok(manifest.effects[key], `${id}: unknown effect ${key}`);
        for (const skill of ch.skills || []) {
            const s = p.skills[skill.id];
            assert.ok(s, `${id}/${skill.id}: no skill profile`);
            assert.ok(['melee', 'projectile', 'area', 'support', 'self', 'passive'].includes(s.delivery), `${skill.id}: delivery ${s.delivery}`);
            for (const key of [s.windup, s.travel, s.impact].filter(Boolean)) assert.ok(manifest.effects[key], `${skill.id}: unknown effect ${key}`);
            // A skill that can't finish anyone off (passives, buffs) has no kill; the killer's own applies.
            assert.ok(s.kill === null || DEATHS.has(s.kill), `${skill.id}: unknown kill ${s.kill}`);
        }
    }
});

test('signature kills: lightsabers in the wielder\'s colours, Lucille for Negan, Pokemon kills by move type', () => {
    assert.deepEqual(profiles.characters['general-grievous'].sabers, ['green', 'blue', 'violet', 'yellow']);
    assert.deepEqual(profiles.characters['grand-master-yoda'].sabers, ['green']);
    assert.deepEqual(profiles.characters['darth-vader'].sabers, ['red']);
    assert.equal(profiles.characters.negan.kill, 'lucille');
    assert.equal(profiles.characters['billy-butcher'].laser, 'yellow');
    assert.equal(profiles.characters.homelander.laser, 'red');
    assert.equal(profiles.characters.superman.laser, 'red');
    const pokemonKill = (type) => Object.values(profiles.characters).filter((c) => c.arena === 'pokemon')
        .flatMap((c) => Object.values(c.skills)).find((s) => s.element === type)?.kill;
    assert.equal(pokemonKill('fire'), 'burn');
    assert.equal(pokemonKill('grass'), 'vines');
    assert.equal(pokemonKill('electric'), 'electrocute');
    assert.equal(pokemonKill('water'), 'wave');
    assert.equal(pokemonKill('dragon'), 'dragon-claw');
    assert.equal(pokemonKill('rock'), 'crush');
    assert.equal(pokemonKill('ground'), 'fissure');
    for (const recipe of ['shatter', 'saber', 'lucille', 'burn', 'vines', 'electrocute', 'wave', 'dragon-claw', 'crush', 'fissure']) assert.ok(DEATHS.has(recipe), recipe);
    // Every death animation has its own stamp.
    const stamps = engine.slice(engine.indexOf('const STAMPS = {'), engine.indexOf('const vineSvg'));
    for (const recipe of DEATHS) assert.match(stamps, new RegExp(`(^|[\\s,{])'?${recipe}'?: ["']`), `no stamp for ${recipe}`);
    assert.match(stamps, /lucille: "LUCILLE'D"/);
    assert.match(stamps, /laser: 'LASERED'/);
});

test('the engine runs one requestAnimationFrame loop, time-based frames, pooled sprites and a bounded sheet cache', () => {
    assert.match(engine, /requestAnimationFrame\(loop\)/);
    assert.doesNotMatch(engine, /setInterval\(/);
    assert.match(engine, /Math\.floor\(\(elapsed \* effect\.fps\) \/ 1000\)/);
    assert.match(engine, /translate3d\(/);
    assert.match(engine, /const MAX_SPRITES = \d+/);
    assert.match(engine, /if \(sheets\.size > MAX_SHEETS\)/);
    assert.match(engine, /img\.decode/);
    assert.match(engine, /prefers-reduced-motion: reduce/);
    // The card state machine: defeat is terminal, every state lists where it may go.
    assert.match(engine, /defeat: \[\],/);
    assert.match(engine, /idle: \['entry', 'windup', 'recoil', 'victory', 'defeat'\]/);
});

test('the game drives the engine for casts, hits, statuses, deaths, match start and match end in both arenas', () => {
    assert.match(script, /window\.BattleFX\.cast\(\{/);
    assert.match(script, /skipTravel: skillHasCustomCastFx\(\{ id: event\.sourceSkillId \}\)/);
    assert.match(script, /window\.BattleFX\?\.recoil\(card, delta/);
    assert.match(script, /window\.BattleFX\?\.status\(card, Boolean\(status\?\.metadata\?\.harmful\)\)/);
    assert.match(script, /window\.BattleFX\?\.death\(card, \{ killerId, skillId/);
    assert.match(script, /window\.BattleFX\.enter\(\[\.\.\.playerCards, \.\.\.enemyCards\]\)/);
    assert.match(script, /window\.BattleFX\.victory\(didWin \? playerCards : enemyCards\)/);
    assert.match(script, /deaths: \(\) => Boolean\(uiSettings\.deathAnimations\)/);
    assert.doesNotMatch(script, /playPokemonSprite|cycleSpriteFrames|getSpecialDeathAnimationType|animation-manifest\.json/);
    // The server tells the client which skill landed the kill, so the death matches the move.
    assert.match(read('battleLogic.js'), /targetState\.killedBySkillId = /);
    assert.match(read('server.js'), /state\.killedBySkillId = unit\.state\.killedBySkillId/);
});

test('laser-eyed heroes fire from their measured eyes, which glow in their laser colour first', () => {
    const eyes = engine.slice(engine.indexOf('const EYES = {'), engine.indexOf('const LASER_HEX'));
    for (const id of ['homelander', 'superman', 'billy-butcher']) {
        const face = characters.find((c) => c.characterId === id).facePicture;
        const file = face.slice(face.lastIndexOf('/') + 1);
        assert.match(eyes, new RegExp(`'${file.replace('.', '\\.')}': \\[\\[0\\.\\d+, 0\\.\\d+\\], \\[0\\.\\d+, 0\\.\\d+\\]\\]`), `${id}: no eye positions for ${file}`);
        assert.ok(fs.existsSync(path.join(root, face.replace(/^\//, ''))), `${id}: portrait missing`);
    }
    assert.match(engine, /const glows = glowEyes\(eyes, hex/);
    assert.match(script, /window\.BattleFX\.eyeLasers\(\{ actor: actorCard, targets: \[targetCard\], colour, empowered \}\)/);
    assert.match(script, /killerCard \}\);/);
    assert.match(engine, /burn: 'TOASTY'/);
});

test('the hand-drawn art pieces all exist and each is used by a death animation', () => {
    const files = engine.match(/const ART_FILES = \[([^\]]+)\]/)[1].match(/'([a-z-]+)'/g).map((x) => x.slice(1, -1));
    assert.ok(files.length >= 14);
    for (const name of files) {
        assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'battle-fx', 'art', `${name}.webp`)), `missing art ${name}`);
        const uses = engine.split(`'${name}'`).length - 1 + (name.startsWith('saber-') && name !== 'saber-hilt' ? 1 : 0);
        assert.ok(uses >= 2, `${name} is never used`);
    }
});

test('the battle page loads the engine before the game script, with its styles', () => {
    // The server only serves listed files from /scripts/: the engine must be on the list, its build scripts must not.
    const server = read('server.js');
    assert.match(server, /'\/scripts\/battle-fx\.js',/);
    assert.doesNotMatch(server, /'\/scripts\/build-battle-fx/);
    const ingame = read('ingame.html');
    assert.ok(ingame.indexOf('scripts/battle-fx.js') > 0 && ingame.indexOf('scripts/battle-fx.js') < ingame.indexOf('scripts/script.js?'));
    assert.match(ingame, /styles\/battle-fx\.css/);
    assert.match(ingame, /styles\/status-fx\.css/);
    const css = read('styles', 'battle-fx.css');
    assert.match(css, /body\.ui-disable-skill-cast-animations \.bfx-sprite/);
    assert.match(css, /body\.skill-effects-muted \.bfx-sprite/);
});

test('ingame.html has the weather banner markup and manual.html credits the asset packs', () => {
    const ingame = read('ingame.html');
    assert.match(ingame, /id="weather-banner"/);
    assert.match(ingame, /id="weather-banner-name"/);
    assert.match(ingame, /id="weather-banner-rounds"/);
    assert.match(read('manual.html'), /Will Tice \/ unTied Games/);
    assert.match(script, /const renderWeatherBanner = /);
    assert.match(read('styles', 'style.css'), /\.weather-banner\s*\{/);
});
