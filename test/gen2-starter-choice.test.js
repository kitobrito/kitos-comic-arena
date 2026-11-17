const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const { buildInitialBoard, resolvePendingTurnSkills } = require('../battleLogic');
const { ensureRequiredMissionCatalogEntries, resolveMissionUnlockPointCost } = require('../server');

const starterIds = ['cyndaquil', 'chikorita', 'totodile'];

const makeMatch = ({ actorId, opponentId, skillId, targets }) => {
    const actorIndex = characters.findIndex((entry) => entry.id === actorId);
    const opponentIndex = characters.findIndex((entry) => entry.id === opponentId);
    const skillIndex = characters[actorIndex].skills.findIndex((entry) => entry.id === skillId);
    const players = [
        { username: 'Starter', team: [actorIndex] },
        { username: 'Opponent', team: [opponentIndex] },
    ];
    return {
        actorIndex,
        skillIndex,
        match: {
            players,
            board: buildInitialBoard(players, characters),
            chakraPools: {
                Starter: { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 },
                Opponent: { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 },
            },
            pendingTurns: {
                Starter: {
                    queueOrder: ['0'],
                    queuedByActorSlot: {
                        0: { skillIndex, targetSelection: targets },
                    },
                },
            },
            pendingActions: [],
            pendingQueuedEffects: [],
            economy: { turnCounts: { Starter: 1, Opponent: 1 } },
        },
    };
};

test('the Gen 2 mission locks all three alternatives at 500 points', () => {
    const mission = ensureRequiredMissionCatalogEntries([]).find(
        (entry) => entry.missionId === 'gen2-starter-choice'
    );
    assert.ok(mission);
    assert.deepEqual(mission.reward_character_ids, starterIds);
    assert.equal(resolveMissionUnlockPointCost(mission), 500);
});

test('both homepages provide the same accessible partner chooser and local artwork', () => {
    const root = path.resolve(__dirname, '..');
    for (const file of ['index.html', 'pokemon-home.html']) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        assert.match(html, /id="gen2-starter-overlay"/);
        assert.match(html, /aria-modal="true"/);
        assert.match(html, /styles\/gen2-starter-choice\.css/);
        starterIds.forEach((id) => {
            assert.match(html, new RegExp(`data-starter-id="${id}"`));
            assert.ok(fs.existsSync(path.join(root, 'assets/images/PokemonArena/BIB', id + '.png')));
        });
        assert.doesNotMatch(html, /3ballselection\.png/);
    }
    const css = fs.readFileSync(path.join(root, 'styles/gen2-starter-choice.css'), 'utf8');
    assert.match(css, /prefers-reduced-motion/);
});

test('each Gen 2 starter has gated 16-win and 36-win ranked evolution missions', () => {
    const missions = ensureRequiredMissionCatalogEntries([]);
    const expected = {
        cyndaquil: ['quilava', 'typhlosion'],
        chikorita: ['bayleaf', 'meganium'],
        totodile: ['croconaw', 'feraligatr'],
    };
    Object.entries(expected).forEach(([starterId, forms]) => {
        const second = missions.find((mission) => mission.missionId === `${starterId}-evolve-${forms[0]}`);
        const final = missions.find((mission) => mission.missionId === `${starterId}-evolve-${forms[1]}`);
        assert.ok(second, `Missing ${forms[0]} mission`);
        assert.ok(final, `Missing ${forms[1]} mission`);
        assert.equal(second.starter_character_id, starterId);
        assert.equal(second.goals[0].type, 'win_ladder_matches');
        assert.equal(second.goals[0].character_id, starterId);
        assert.equal(second.goals[0].wins, 16);
        assert.equal(final.prerequisite_mission_id, second.missionId);
        assert.equal(final.goals[0].character_id, starterId);
        assert.equal(final.goals[0].wins, 36);
        assert.match(second.reward_skin_id, /evolution$/);
        assert.match(final.reward_skin_id, /evolution$/);
    });
});

test('Gen 2 evolution missions show zeroed ranked progress before the first win', () => {
    const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'script.js'), 'utf8');
    assert.match(script, /goalType === 'win_ladder_matches'/);
    assert.match(script, /`\$\{Math\.min\(count, target\)\}\/\$\{target\} ranked wins`/);
});

test('all Gen 2 evolution face, skill, and selection render assets are wired locally', () => {
    const root = path.resolve(__dirname, '..');
    const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const expectedFaces = [
        'Cyndaquil/Quilava/quilavafp.png', 'Cyndaquil/typhlosion/typlosionfp.png',
        'Cyndaquil/Chikorita/bayleaf/bayleaffp.png', 'Cyndaquil/Chikorita/meganium/meganiumfp.png',
        'Cyndaquil/Totodile/Croconaw/croconawfp.png', 'Cyndaquil/Totodile/feraligatyr/feraligatrfp.png',
    ];
    expectedFaces.forEach((relativePath) => {
        const asset = path.join(root, 'assets', 'images', 'PokemonArena', ...relativePath.split('/'));
        assert.ok(fs.existsSync(asset), `Missing ${relativePath}`);
        assert.match(serverSource, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
    ['quilava.png.webp', 'typhlosion.png.webp', 'bayleaf.png.webp', 'meganium.png.webp', 'croconaw.webp.webp', 'ferliagatr.png.webp'].forEach((filename) => {
        assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'selection-featured', 'PokemonArena', 'BIB', filename)));
        assert.match(selectionSource, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
    // Each evolution's four unreplaced base skills get a cosmetic recolor via
    // skillImageOverridesBySkillId; the fully-replaced slot (e.g. cyndaquil-aerial-tackle
    // -> cyndaquil-quilava-flame-wheel) intentionally has no entry here since that skill
    // already carries its own dedicated evolved-form image.
    assert.match(serverSource, /Chikorita\/bayleaf\/passive\.png/);
    assert.match(serverSource, /'cyndaquil-aerial-flamethrower': 'assets\/images\/PokemonArena\/Cyndaquil\/Quilava\/flamethrower\.png'/);
    assert.match(serverSource, /'cyndaquil-cynda-smokescreen': 'assets\/images\/PokemonArena\/Cyndaquil\/Quilava\/smokescreen\.png'/);
    assert.match(serverSource, /'cyndaquil-aerial-flamethrower': 'assets\/images\/PokemonArena\/Cyndaquil\/typhlosion\/flamethrower\.png'/);
    assert.match(serverSource, /'cyndaquil-cynda-smokescreen': 'assets\/images\/PokemonArena\/Cyndaquil\/typhlosion\/smokescreen\.png'/);
});

