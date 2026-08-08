const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    applyStatus,
    buildInitialBoard,
    configureBattleRuntime,
    resetBattleRuntime,
    resolvePendingTurnSkills,
} = require('../battleLogic');
const {
    buildArenaSkinsResponse,
    getPokemonPrimeapeMissionEntry,
    getPokemonPrimeapeSkinCatalogEntry,
    isMissionActiveAt,
    setPrimeapeReleaseWindow,
} = require('../server');
const {
    EVENT_DURATION_MS,
    newsPost,
    syncPokemonPrimeapeRelease,
} = require('../sync_pokemon_primeape_release');

const root = path.resolve(__dirname, '..');
const primeape = characters.find((character) => character?.id === 'primeape');
const primeapeIndex = characters.indexOf(primeape);
const charmanderIndex = characters.findIndex((character) => character?.id === 'charmander');

const makeMatch = (opponentIndex = charmanderIndex, roster = characters) => {
    const players = [
        { username: 'ash', team: [primeapeIndex] },
        { username: 'gary', team: [opponentIndex] },
    ];
    return {
        players,
        board: buildInitialBoard(players, roster),
        chakraPools: {
            ash: { taijutsu: 20, ninjutsu: 20, genjutsu: 20, bloodline: 20 },
            gary: { taijutsu: 20, ninjutsu: 20, genjutsu: 20, bloodline: 20 },
        },
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { ash: 1, gary: 1 } },
    };
};

const useSkill = ({ match, username = 'ash', skillIndex, targetUsername = 'gary', roster = characters }) => {
    match.pendingTurns[username] = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: {
                skillIndex,
                targetSelection: [{ username: targetUsername, slot: 0 }],
            },
        },
    };
    resolvePendingTurnSkills({ match, actingUsername: username, characters: roster });
};

test('Primeape uses the supplied art, exact costs, cooldowns, and Pokemon typing', () => {
    assert.ok(primeape);
    assert.deepEqual(primeape.pokemonTypes, ['Fighting']);
    assert.deepEqual(
        primeape.skills.map((skill) => skill.energy),
        [['Genjutsu'], ['Genjutsu'], ['Random'], ['Genjutsu', 'Random'], []]
    );
    assert.deepEqual(primeape.skills.map((skill) => skill.cooldown), [0, 2, 1, 1, 0]);
    [
        primeape.facePicture,
        ...primeape.skills.map((skill) => skill.skillimage),
        ...Object.values(getPokemonPrimeapeSkinCatalogEntry().skillImageOverridesBySkillId),
        getPokemonPrimeapeSkinCatalogEntry().previewFacePicture,
        'assets/images/PokemonArena/BIB/primeape.jpg',
        'assets/images/PokemonArena/BIB/annihilape.jpg',
        'assets/images/selection-featured/PokemonArena/BIB/primeape.jpg.webp',
        'assets/images/selection-featured/PokemonArena/BIB/annihilape.jpg.webp',
    ].forEach((asset) => assert.ok(fs.existsSync(path.join(root, asset)), asset));
});

test('Rock Smash destroys both defenses and powers the next Rage Fist', () => {
    const match = makeMatch();
    const actor = match.board.ash[0];
    const target = match.board.gary[0];
    applyStatus({
        targetState: actor.state,
        targetUnit: actor,
        statusId: 'test-primeape-barrier',
        duration: 3,
        sourceSkillId: 'test',
        metadata: { harmful: false, barrierPoints: 20 },
    });
    applyStatus({
        targetState: target.state,
        targetUnit: target,
        statusId: 'test-target-shield',
        duration: 3,
        sourceSkillId: 'test',
        metadata: { harmful: false, destructibleDefensePoints: 25 },
    });

    useSkill({ match, skillIndex: 0 });
    assert.equal(target.hp, 80);
    assert.equal(actor.state.statuses.some((status) => status.id === 'test-primeape-barrier'), false);
    assert.equal(target.state.statuses.some((status) => status.id === 'test-target-shield'), false);
    assert.ok(actor.state.statuses.some((status) => status.id === 'primeape_rock_smash_rage_fist_bonus'));

    useSkill({ match, skillIndex: 2 });
    assert.equal(target.hp, 55);
});

test('Knock Off purges helpful effects, blocks Shield, and exposes its target', () => {
    const match = makeMatch();
    const target = match.board.gary[0];
    applyStatus({
        targetState: target.state,
        targetUnit: target,
        statusId: 'test-helpful-buff',
        duration: 3,
        sourceSkillId: 'test',
        metadata: { harmful: false, damageBonusFlat: 5 },
    });

    useSkill({ match, skillIndex: 1 });
    assert.equal(target.hp, 85);
    assert.equal(target.state.statuses.some((status) => status.id === 'test-helpful-buff'), false);
    assert.ok(target.state.statuses.some((status) => status.id === 'primeape_knock_off_shield_block'));
    assert.ok(target.state.statuses.some((status) => status.id === 'primeape_knock_off_exposure'));
    assert.equal(applyStatus({
        targetState: target.state,
        targetUnit: target,
        statusId: 'test-blocked-shield',
        duration: 2,
        sourceSkillId: 'test',
        metadata: { harmful: false, destructibleDefensePoints: 20 },
    }), false);

    useSkill({ match, skillIndex: 0 });
    assert.equal(target.hp, 55);
});

test('Rage Fist scales from missing HP and Close Combat uses its low-HP bonus and drawback', () => {
    const rageMatch = makeMatch();
    rageMatch.board.ash[0].hp = 55;
    useSkill({ match: rageMatch, skillIndex: 2 });
    assert.equal(rageMatch.board.gary[0].hp, 70);

    const closeMatch = makeMatch();
    closeMatch.board.ash[0].hp = 49;
    applyStatus({
        targetState: closeMatch.board.gary[0].state,
        targetUnit: closeMatch.board.gary[0],
        statusId: 'test-full-reduction',
        duration: 3,
        sourceSkillId: 'test',
        metadata: { harmful: false, damageReductionPercent: 100 },
    });
    useSkill({ match: closeMatch, skillIndex: 3 });
    assert.equal(closeMatch.board.gary[0].hp, 55);
    assert.ok(closeMatch.board.ash[0].state.statuses.some(
        (status) => status.id === 'primeape_close_combat_exposure'
    ));
});

test('Anger Point triggers from a Super Effective or Critical Hit and makes Rage Fist Piercing', () => {
    const makeAttacker = (id, classes, metadata = {}) => ({
        id,
        characterId: id,
        name: id,
        arena: 'pokemon',
        universe: 'pokemon',
        pokemonTypes: [classes[0]],
        skills: [{
            id: `${id}-attack`,
            name: 'Trigger Attack',
            energy: [],
            cooldown: 0,
            target: 'single-enemy',
            classes: [...classes, 'Instant'],
            effects: [{ type: 'damage', amount: 10, scope: 'target', metadata }],
        }],
    });

    for (const attacker of [
        makeAttacker('test-flying-attacker', ['Flying', 'Special']),
        makeAttacker('test-critical-attacker', ['Water', 'Physical'], { criticalHit: true }),
    ]) {
        const roster = [...characters, attacker];
        const opponentIndex = roster.length - 1;
        const match = makeMatch(opponentIndex, roster);
        useSkill({ match, username: 'gary', skillIndex: 0, targetUsername: 'ash', roster });
        assert.ok(match.board.ash[0].state.statuses.some(
            (status) => status.id === 'primeape_anger_point_active'
        ));
        applyStatus({
            targetState: match.board.gary[0].state,
            targetUnit: match.board.gary[0],
            statusId: 'test-full-reduction',
            duration: 3,
            sourceSkillId: 'test',
            metadata: { harmful: false, damageReductionPercent: 100 },
        });
        useSkill({ match, skillIndex: 2, roster });
        assert.equal(
            match.board.gary[0].hp,
            attacker.id === 'test-flying-attacker' ? 60 : 65
        );
    }
});

test('an existing roster critical strike activates Anger Point', () => {
    configureBattleRuntime({ random: () => 0 });
    try {
        const match = makeMatch(charmanderIndex);
        useSkill({ match, username: 'gary', skillIndex: 1, targetUsername: 'ash' });
        assert.ok(match.board.ash[0].state.statuses.some(
            (status) => status.id === 'primeape_anger_point_active'
        ));
    } finally {
        resetBattleRuntime();
    }
});

test('the Annihilape mission lasts exactly seven days, then its skin costs 750 points', () => {
    const startsAt = new Date('2026-08-08T00:00:00.000Z');
    const endsAt = new Date(startsAt.getTime() + EVENT_DURATION_MS);
    setPrimeapeReleaseWindow({ startsAt, endsAt });
    const mission = getPokemonPrimeapeMissionEntry();
    assert.equal(new Date(mission.ends_at) - new Date(mission.starts_at), EVENT_DURATION_MS);
    assert.deepEqual(mission.goals, [{
        type: 'win_matches',
        character_id: 'primeape',
        character_name: 'Primeape',
        wins: 20,
    }]);
    assert.equal(isMissionActiveAt(mission, startsAt), true);
    assert.equal(isMissionActiveAt(mission, new Date(endsAt.getTime() - 1)), true);
    assert.equal(isMissionActiveAt(mission, endsAt), false);
    assert.equal(getPokemonPrimeapeSkinCatalogEntry().unlockPointCost, 750);

    const now = Date.now();
    setPrimeapeReleaseWindow({ startsAt: new Date(now - 1000), endsAt: new Date(now + 60_000) });
    let skin = buildArenaSkinsResponse({ arena: 'pokemon', profile: {} }).skins.find(
        (entry) => entry.skinId === 'primeape-annihilape-evolution'
    );
    assert.equal(skin.purchaseAvailable, false);
    setPrimeapeReleaseWindow({ startsAt: new Date(now - 120_000), endsAt: new Date(now - 60_000) });
    skin = buildArenaSkinsResponse({ arena: 'pokemon', profile: {} }).skins.find(
        (entry) => entry.skinId === 'primeape-annihilape-evolution'
    );
    assert.equal(skin.purchaseAvailable, true);
    assert.equal(skin.unlockPointCost, 750);
});

test('release synchronization preserves the original event window across restarts', async () => {
    const documents = new Map();
    const keyFor = (name, filter) => {
        if (filter?.key) return `${name}:key:${filter.key}`;
        const releaseFilter = filter?.$or?.find((entry) => entry.releaseVersion || entry.title) || {};
        return `${name}:news:${releaseFilter.releaseVersion || releaseFilter.title || filter?.title}`;
    };
    const db = {
        collection(name) {
            return {
                async findOne(filter) {
                    return documents.get(keyFor(name, filter)) || null;
                },
                async updateOne(filter, update) {
                    const key = keyFor(name, filter);
                    documents.set(key, {
                        ...(documents.get(key) || {}),
                        ...(update.$setOnInsert || {}),
                        ...(update.$set || {}),
                    });
                },
            };
        },
    };
    const firstNow = new Date('2026-08-08T12:00:00.000Z');
    const first = await syncPokemonPrimeapeRelease(db, { now: firstNow });
    const second = await syncPokemonPrimeapeRelease(db, {
        now: new Date(firstNow.getTime() + 24 * 60 * 60 * 1000),
    });
    assert.equal(first.migrated, true);
    assert.equal(second.migrated, false);
    assert.equal(first.eventWindow.startsAt.toISOString(), second.eventWindow.startsAt.toISOString());
    assert.equal(first.eventWindow.endsAt.toISOString(), second.eventWindow.endsAt.toISOString());
    assert.equal(first.eventWindow.endsAt - first.eventWindow.startsAt, EVENT_DURATION_MS);
    const announcement = newsPost.paragraphs.join(' ');
    assert.match(announcement, /sorry.*unavailable.*past week/i);
    assert.match(announcement, /win 20.*Primeape/i);
    assert.match(announcement, /750 unlock points/i);
});
