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
    assert.match(serverSource, /'cyndaquil-aerial-flamethrower': 'assets\/images\/PokemonArena\/Cyndaquil\/quilavas3\.png'/);
    assert.match(serverSource, /'cyndaquil-cynda-smokescreen': 'assets\/images\/PokemonArena\/Cyndaquil\/quilavas2\.png'/);
    assert.match(serverSource, /'cyndaquil-aerial-flamethrower': 'assets\/images\/PokemonArena\/Cyndaquil\/typhlosions3\.png'/);
    assert.match(serverSource, /'cyndaquil-cynda-smokescreen': 'assets\/images\/PokemonArena\/Cyndaquil\/typhlosions2\.png'/);
});

test('Totodile Water Gun damages enemies and builds a Water Ring', () => {
    const { match } = makeMatch({
        actorId: 'totodile',
        opponentId: 'pikachu',
        skillId: 'totodile-aerial-water-gun',
        targets: [],
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });
    assert.equal(match.board.Opponent[0].hp, 85);
    const tracker = match.board.Starter[0].state.statuses.find(
        (status) => status.id === 'totodile_water_rings_tracker'
    );
    assert.equal(tracker.metadata.waterRings, 1);
    const waterGun = characters.find((entry) => entry.id === 'totodile').skills.find(
        (skill) => skill.id === 'totodile-aerial-water-gun'
    );
    assert.equal(waterGun.cooldown, 1);
});

test('Chikorita Light Screen grants 25 destructible defense', () => {
    const { match } = makeMatch({
        actorId: 'chikorita',
        opponentId: 'pikachu',
        skillId: 'chikorita-light-screen',
        targets: [{ username: 'Starter', slot: 0 }],
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });
    const lightScreen = match.board.Starter[0].state.statuses.find(
        (status) => status.id === 'chikorita_light_screen'
    );
    assert.equal(lightScreen?.metadata?.destructibleDefensePoints, 25);
});

test('Chikorita Light Screen weakens the active Physical, Special, or Affliction class by 5', () => {
    const { match } = makeMatch({
        actorId: 'chikorita',
        opponentId: 'pikachu',
        skillId: 'chikorita-light-screen',
        targets: [{ username: 'Starter', slot: 0 }],
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });

    const tracker = match.board.Starter[0].state.statuses.find(
        (status) => status.id === 'chikorita_sweet_scent_tracker'
    );
    tracker.metadata.sweetScentClassIndex = 1;
    match.pendingTurns.Opponent = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: {
                skillIndex: characters.find((entry) => entry.id === 'pikachu').skills.findIndex(
                    (skill) => skill.id === 'pikachu-thundershock'
                ),
                targetSelection: [{ username: 'Starter', slot: 0 }],
            },
        },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Opponent', characters });
    const debuff = match.board.Opponent[0].state.statuses.find(
        (status) => status.id.startsWith('chikorita_light_screen_debuff_')
    );
    assert.deepEqual(debuff?.metadata?.damageDebuffBySkillClass, { special: 5 });
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
    assert.equal(match.board.Opponent[0].hp, 55);
    assert.equal(tracker.metadata.solarBeamStacks, 0);
    assert.ok(match.board.Opponent[0].state.statuses.some((status) => status.id === 'chikorita_solar_beam_stun'));
});

test('Totodile Superpower empowers Aqua Tail by 10 then applies a permanent 5 damage penalty', () => {
    const setup = makeMatch({
        actorId: 'totodile',
        opponentId: 'pikachu',
        skillId: 'totodile-superpower',
        targets: [{ username: 'Starter', slot: 0 }],
    });
    const { match, actorIndex } = setup;
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });
    const aquaTailIndex = characters[actorIndex].skills.findIndex((skill) => skill.id === 'totodile-aqua-tail');
    match.pendingTurns.Starter = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: { skillIndex: aquaTailIndex, targetSelection: [{ username: 'Opponent', slot: 0 }] },
        },
    };
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });
    assert.equal(match.board.Opponent[0].hp, 45);
    const tracker = match.board.Starter[0].state.statuses.find(
        (status) => status.id === 'totodile_water_rings_tracker'
    );
    assert.equal(tracker.metadata.aquaTailEmpowered, false);
    assert.equal(tracker.metadata.aquaTailPermanentPenalty, 5);
});

test('Gen 2 starter descriptions and the manual use the current combat terminology', () => {
    const cyndaquil = characters.find((entry) => entry.id === 'cyndaquil');
    const totodile = characters.find((entry) => entry.id === 'totodile');
    const flamethrower = cyndaquil.skills.find((skill) => skill.id === 'cyndaquil-aerial-flamethrower');
    const warmingUp = cyndaquil.skills.find((skill) => skill.id === 'cyndaquil-warming-up');
    const scaryFace = totodile.skills.find((skill) => skill.id === 'totodile-scary-face');
    const manual = fs.readFileSync(path.join(__dirname, '..', 'manual.html'), 'utf8');
    assert.deepEqual(flamethrower.energy, ['Bloodline']);
    assert.match(warmingUp.skilldescription, /deals 0 affliction damage to them/i);
    assert.match(scaryFace.skilldescription, /Guard Breaks one enemy/);
    assert.match(manual, /<strong>Guard Break<\/strong><span>Prevents a character from reducing damage or becoming invulnerable\.<\/span>/);
});

test('Cyndaquil Aerial Tackle cancels channeled skills sourced by its target', () => {
    const { match } = makeMatch({
        actorId: 'cyndaquil',
        opponentId: 'pikachu',
        skillId: 'cyndaquil-aerial-tackle',
        targets: [{ username: 'Opponent', slot: 0 }],
    });
    match.board.Starter[0].state.statuses.push({
        id: 'opponent_channel',
        sourceUsername: 'Opponent',
        sourceSlot: 0,
        remainingTurns: 3,
        metadata: { harmful: true, ongoingClass: 'channeled' },
    });
    resolvePendingTurnSkills({ match, actingUsername: 'Starter', characters });
    assert.ok(!match.board.Starter[0].state.statuses.some((status) => status.id === 'opponent_channel'));
});
