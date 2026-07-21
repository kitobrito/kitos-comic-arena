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

test('all Gen 2 starters are playable with five supplied local images', () => {
    const root = path.resolve(__dirname, '..');
    starterIds.forEach((id) => {
        const character = characters.find((entry) => entry.id === id);
        assert.ok(character, `Missing ${id}`);
        assert.equal(character.arena, 'pokemon');
        assert.equal(character.skills.length, 5);
        [character.facePicture, ...character.skills.map((skill) => skill.skillimage)].forEach((asset) => {
            assert.ok(asset && fs.existsSync(path.join(root, asset)), `Missing ${asset}`);
        });
    });
});

test('the Gen 2 mission locks all three alternatives at 500 points', () => {
    const mission = ensureRequiredMissionCatalogEntries([]).find(
        (entry) => entry.missionId === 'gen2-starter-choice'
    );
    assert.ok(mission);
    assert.deepEqual(mission.reward_character_ids, starterIds);
    assert.equal(resolveMissionUnlockPointCost(mission), 500);
});

test('homepage chooser uses the case, selection scenes, and BIB renders', () => {
    const root = path.resolve(__dirname, '..');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'scripts', 'index.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'styles', 'gen2-starter-choice.css'), 'utf8');
    assert.match(html, /id="gen2-starter-overlay"/);
    assert.match(html, /3ballselection\.png/);
    assert.match(script, /\/api\/profile\/pokemon\/gen2-starter/);
    starterIds.forEach((id) => {
        assert.match(script, new RegExp(`BIB/${id}\\.png`, 'i'));
        assert.match(script, new RegExp(`${id}selection\\.jpg`, 'i'));
    });
    assert.match(css, /\.gen2-ball-button:hover/);
    assert.match(css, /\.gen2-ball-button\.is-pressing/);
    assert.match(css, /gen2-spin-lights/);
    assert.match(css, /gen2-confetti-fall/);
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

test('all Gen 2 evolution face, skill, and selection render assets are wired locally', () => {
    const root = path.resolve(__dirname, '..');
    const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const expectedFaces = [
        'Cyndaquil/quilavafp.png', 'Cyndaquil/typlosionfp.png',
        'Cyndaquil/Chikorita/bayleaffp.png', 'Cyndaquil/Chikorita/meganiumfp.png',
        'Cyndaquil/Totodile/croconawfp.png', 'Cyndaquil/Totodile/feraligatrfp.png',
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
    assert.match(serverSource, /bayleafs5\.png/);
});

test('Totodile Water Gun damages enemies and builds a Water Ring', () => {
    const { match } = makeMatch({
        actorId: 'totodile',
        opponentId: 'pikachu',
        skillId: 'totodile-aerial-water-gun',
        targets: [],
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });
    assert.equal(match.board.Opponent[0].hp, 90);
    const tracker = match.board.Starter[0].state.statuses.find(
        (status) => status.id === 'totodile_water_rings_tracker'
    );
    assert.equal(tracker.metadata.waterRings, 1);
});

test('Chikorita Solar Beam consumes Light Screen stacks for bonus damage', () => {
    const { match } = makeMatch({
        actorId: 'chikorita',
        opponentId: 'pikachu',
        skillId: 'chikorita-chikorita-solar-beam',
        targets: [{ username: 'Opponent', slot: 0 }],
    });
    const tracker = match.board.Starter[0].state.statuses.find(
        (status) => status.id === 'chikorita_sweet_scent_tracker'
    );
    tracker.metadata.solarBeamStacks = 2;
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });
    assert.equal(match.board.Opponent[0].hp, 50);
    assert.equal(tracker.metadata.solarBeamStacks, 0);
    assert.ok(match.board.Opponent[0].state.statuses.some((status) => status.id === 'chikorita_solar_beam_stun'));
});
