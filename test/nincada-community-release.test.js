const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    buildInitialBoard,
    computeEffectiveEnergyCost,
    configureBattleRuntime,
    resetBattleRuntime,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');
const {
    buildLatestReleasesState,
    newsPost,
    syncPokemonNincadaRelease,
} = require('../sync_pokemon_nincada_release');
const {
    resolveDittoTransformationFacePicture,
} = require('../pokemonDittoTransformationFaces');

const root = path.resolve(__dirname, '..');
const nincadaIndex = characters.findIndex((character) => character?.id === 'nincada');
const bulbasaurIndex = characters.findIndex((character) => character?.id === 'bulbasaur');
const charmanderIndex = characters.findIndex((character) => character?.id === 'charmander');
const trainerIndex = characters.findIndex((character) => character?.id === 'pokemon-trainer');
const dittoIndex = characters.findIndex((character) => character?.id === 'ditto');

const makeMatch = (teams) => {
    const players = Object.entries(teams).map(([username, team]) => ({ username, team }));
    return {
        players,
        board: buildInitialBoard(players, characters),
        chakraPools: Object.fromEntries(
            players.map(({ username }) => [
                username,
                { taijutsu: 20, ninjutsu: 20, genjutsu: 20, bloodline: 20 },
            ])
        ),
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: Object.fromEntries(players.map(({ username }) => [username, 1])) },
    };
};

const useSkill = (
    match,
    username,
    actorSlot,
    skillIndex,
    targetUsername,
    targetSlot
) => {
    match.pendingTurns[username] = {
        queueOrder: [String(actorSlot)],
        queuedByActorSlot: {
            [actorSlot]: {
                skillIndex,
                targetSelection: [{ username: targetUsername, slot: targetSlot }],
            },
        },
    };
    resolvePendingTurnSkills({ match, actingUsername: username, characters });
};

test('Nincada and both battle forms use supplied art, exact costs, types, and 2ndstatus credit', () => {
    const nincada = characters[nincadaIndex];
    assert.ok(nincada);
    assert.deepEqual(nincada.pokemonTypes, ['Bug', 'Ground']);
    assert.match(nincada.description, /designed by 2ndstatus/i);
    assert.deepEqual(
        nincada.skills.map((skill) => skill.energy),
        [['Genjutsu'], ['Taijutsu'], ['Random'], []]
    );
    const ninjask = nincada.battleForms.find((form) => form.id === 'ninjask');
    const shedinja = nincada.battleForms.find((form) => form.id === 'shedinja');
    assert.deepEqual(ninjask.pokemonTypes, ['Bug', 'Flying']);
    assert.deepEqual(shedinja.pokemonTypes, ['Bug', 'Ghost']);
    assert.deepEqual(
        ninjask.skills.map((skill) => skill.energy),
        [
            ['Genjutsu'],
            ['Genjutsu', 'Random'],
            ['Taijutsu', 'Genjutsu'],
            ['Random'],
            [],
        ]
    );
    assert.deepEqual(
        shedinja.skills.map((skill) => skill.energy),
        [
            ['Taijutsu', 'Random'],
            ['Genjutsu'],
            ['Taijutsu', 'Genjutsu', 'Random'],
            ['Random'],
            [],
        ]
    );
    [
        nincada.facePicture,
        ...nincada.skills.map((skill) => skill.skillimage),
        ...nincada.battleForms.flatMap((form) => [
            form.facePicture,
            ...form.skills.map((skill) => skill.skillimage),
        ]),
    ].forEach((asset) => assert.ok(fs.existsSync(path.join(root, asset)), asset));
});

test('Metal Claw tracks all damage dealt and grows when Nincada already has defense', () => {
    const match = makeMatch({ ash: [nincadaIndex], gary: [charmanderIndex] });
    useSkill(match, 'ash', 0, 0, 'gary', 0);
    assert.equal(match.board.gary[0].hp, 90);
    let tracker = match.board.ash[0].state.statuses.find(
        (status) => status.id === 'nincada_evolution_tracker'
    );
    assert.equal(tracker.metadata.nincadaDamageDealt, 10);
    assert.equal(
        match.board.ash[0].state.statuses.find(
            (status) => status.id === 'nincada_metal_claw_defense'
        ).metadata.destructibleDefensePoints,
        15
    );

    useSkill(match, 'ash', 0, 0, 'gary', 0);
    tracker = match.board.ash[0].state.statuses.find(
        (status) => status.id === 'nincada_evolution_tracker'
    );
    assert.equal(match.board.gary[0].hp, 70);
    assert.equal(tracker.metadata.nincadaDamageDealt, 30);
});

test('Hidden Power can roll 40 damage and stun Nincada non-Strategic skills', () => {
    configureBattleRuntime({ random: () => 0.999 });
    try {
        const match = makeMatch({ ash: [nincadaIndex], gary: [charmanderIndex] });
        useSkill(match, 'ash', 0, 2, 'gary', 0);
        assert.equal(match.board.gary[0].hp, 60);
        assert.deepEqual(
            match.board.ash[0].state.statuses.find(
                (status) => status.id === 'nincada_hidden_power_recoil_stun'
            )?.metadata?.cannotUseSkillIndices,
            [0, 2]
        );
    } finally {
        resetBattleRuntime();
    }
});

test('Struggle Bug counters a Physical skill and grants Nincada evasion', () => {
    const match = makeMatch({ ash: [nincadaIndex], gary: [charmanderIndex] });
    useSkill(match, 'ash', 0, 1, 'ash', 0);
    useSkill(match, 'gary', 0, 1, 'ash', 0);
    assert.equal(match.board.ash[0].hp, 100);
    assert.ok(match.board.gary[0].hp < 100);
    assert.equal(
        match.board.ash[0].state.statuses.find(
            (status) => status.id === 'nincada_struggle_bug_evasion'
        )?.metadata?.evadeChancePercent,
        25
    );
});

test('Evolve can transform Nincada and revive the lowest fainted ally as 1-HP Shedinja', () => {
    const match = makeMatch({
        ash: [nincadaIndex, bulbasaurIndex, charmanderIndex],
        gary: [charmanderIndex],
    });
    const actor = match.board.ash[0];
    actor.state.statuses.find(
        (status) => status.id === 'nincada_evolution_tracker'
    ).metadata.nincadaDamageDealt = 50;
    match.board.ash[1].alive = false;
    match.board.ash[1].hp = 0;
    match.board.ash[2].alive = false;
    match.board.ash[2].hp = 0;

    useSkill(match, 'ash', 0, 3, 'ash', 0);

    assert.equal(
        actor.state.statuses.find((status) => status.id === 'nincada_ninjask_evolution')
            .metadata.effectiveCharacterId,
        'ninjask'
    );
    assert.ok(
        actor.state.statuses.some((status) => status.id === 'ninjask_speed_boost_controller')
    );
    const shedinja = match.board.ash[1];
    assert.equal(shedinja.alive, true);
    assert.equal(shedinja.hp, 1);
    assert.equal(shedinja.hpCap, 1);
    assert.equal(shedinja.maxHp, 1);
    assert.equal(match.board.ash[2].alive, false);
    assert.equal(
        shedinja.state.statuses.find((status) => status.id === 'nincada_shedinja_evolution')
            .metadata.effectiveCharacterId,
        'shedinja'
    );
    assert.equal(
        shedinja.state.statuses.find((status) => status.id === 'shedinja_wonder_guard')
            .metadata.wonderGuardUsesRemaining,
        3
    );
});

test('Ninjask Double Team swaps Skitter Smack to one Random and Speed Boost stacks', () => {
    const match = makeMatch({ ash: [nincadaIndex], gary: [charmanderIndex] });
    const actor = match.board.ash[0];
    actor.state.statuses.find(
        (status) => status.id === 'nincada_evolution_tracker'
    ).metadata.nincadaDamageDealt = 50;
    useSkill(match, 'ash', 0, 3, 'ash', 0);
    useSkill(match, 'ash', 0, 3, 'ash', 0);
    const nincada = characters[nincadaIndex];
    const skitterSmack = nincada.battleForms.find((form) => form.id === 'ninjask').skills[0];
    assert.deepEqual(computeEffectiveEnergyCost({ skill: skitterSmack, actorState: actor.state }), {
        reservedSpecific: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        requiredRandom: 1,
    });
    tickStatusesForTurnEnd({ match, endingUsername: 'ash' });
    assert.equal(
        actor.state.statuses.find((status) => status.id === 'ninjask_speed_boost_stacks')
            .metadata.ninjaskSpeedBoostStacks,
        1
    );
});

test('Wonder Guard ignores one eligible enemy skill and consumes only one of three uses', () => {
    const match = makeMatch({
        ash: [nincadaIndex, bulbasaurIndex],
        gary: [charmanderIndex],
    });
    const actor = match.board.ash[0];
    actor.state.statuses.find(
        (status) => status.id === 'nincada_evolution_tracker'
    ).metadata.nincadaDamageDealt = 50;
    match.board.ash[1].alive = false;
    match.board.ash[1].hp = 0;
    useSkill(match, 'ash', 0, 3, 'ash', 0);

    useSkill(match, 'gary', 0, 0, 'ash', 1);
    const shedinja = match.board.ash[1];
    assert.equal(shedinja.hp, 1);
    assert.equal(
        shedinja.state.statuses.find((status) => status.id === 'shedinja_wonder_guard')
            .metadata.wonderGuardUsesRemaining,
        2
    );
});

test('Shedinja Hex stacks Special vulnerability and Solar Beam charges only while unused', () => {
    const hexMatch = makeMatch({
        ash: [nincadaIndex, bulbasaurIndex],
        gary: [charmanderIndex],
    });
    hexMatch.board.ash[0].hp = 49;
    hexMatch.board.ash[0].state.statuses.find(
        (status) => status.id === 'nincada_evolution_tracker'
    ).metadata.nincadaDamageDealt = 50;
    hexMatch.board.ash[1].alive = false;
    hexMatch.board.ash[1].hp = 0;
    useSkill(hexMatch, 'ash', 0, 3, 'ash', 0);
    useSkill(hexMatch, 'ash', 1, 3, 'gary', 0);
    useSkill(hexMatch, 'ash', 1, 3, 'gary', 0);
    assert.equal(hexMatch.board.gary[0].hp, 85);

    const solarMatch = makeMatch({
        ash: [nincadaIndex, bulbasaurIndex],
        gary: [charmanderIndex],
    });
    solarMatch.board.ash[0].hp = 49;
    solarMatch.board.ash[0].state.statuses.find(
        (status) => status.id === 'nincada_evolution_tracker'
    ).metadata.nincadaDamageDealt = 50;
    solarMatch.board.ash[1].alive = false;
    solarMatch.board.ash[1].hp = 0;
    useSkill(solarMatch, 'ash', 0, 3, 'ash', 0);
    tickStatusesForTurnEnd({ match: solarMatch, endingUsername: 'ash' });
    assert.equal(
        solarMatch.board.ash[1].state.statuses.find(
            (status) => status.id === 'shedinja_solar_beam_charge'
        )?.metadata?.shedinjaSolarBeamBonus,
        5
    );
    useSkill(solarMatch, 'ash', 1, 2, 'gary', 0);
    assert.equal(solarMatch.board.gary[0].hp, 65);
    assert.equal(
        solarMatch.board.ash[1].state.statuses.some(
            (status) => status.id === 'shedinja_solar_beam_charge'
        ),
        false
    );
    tickStatusesForTurnEnd({ match: solarMatch, endingUsername: 'ash' });
    assert.equal(
        solarMatch.board.ash[1].state.statuses.some(
            (status) => status.id === 'shedinja_solar_beam_charge'
        ),
        false
    );
});

test('Rare Candy evolves native Nincada and a Ditto-copied Nincada into Ninjask', () => {
    const nativeMatch = makeMatch({
        ash: [trainerIndex, nincadaIndex],
        gary: [charmanderIndex],
    });
    useSkill(nativeMatch, 'ash', 0, 3, 'ash', 1);
    const nativeNincada = nativeMatch.board.ash[1];
    assert.equal(
        nativeNincada.state.statuses.find(
            (status) => status.id === 'nincada_ninjask_evolution'
        )?.metadata?.effectiveCharacterId,
        'ninjask'
    );
    assert.equal(
        nativeNincada.state.statuses.find(
            (status) => status.id === 'nincada_ninjask_rare_candy_defense'
        )?.metadata?.destructibleDefensePoints,
        25
    );

    const dittoMatch = makeMatch({
        ash: [trainerIndex, dittoIndex],
        gary: [charmanderIndex, nincadaIndex],
    });
    assert.equal(
        dittoMatch.board.ash[1].state.statuses.find(
            (status) => status.id === 'ditto_transformation'
        )?.metadata?.effectiveCharacterId,
        'nincada'
    );
    useSkill(dittoMatch, 'ash', 0, 3, 'ash', 1);
    const ditto = dittoMatch.board.ash[1];
    const evolution = ditto.state.statuses.find(
        (status) => status.id === 'nincada_ninjask_evolution'
    );
    assert.equal(evolution?.metadata?.effectiveCharacterId, 'ninjask');
    assert.equal(
        evolution?.metadata?.facePictureOverride,
        'assets/images/PokemonArena/Ditto/transformationfps/optimized/ninjask.webp'
    );
    assert.ok(
        ditto.state.statuses.some(
            (status) =>
                status.id === 'ditto_transformation' &&
                status.metadata.overrideAllSkillsToAllRandom
        )
    );
});

test('Ditto has dedicated supplied portraits for Nincada, Ninjask, and Shedinja', () => {
    for (const characterId of ['nincada', 'ninjask', 'shedinja']) {
        const face = resolveDittoTransformationFacePicture({ characterId });
        assert.equal(
            face,
            `assets/images/PokemonArena/Ditto/transformationfps/optimized/${characterId}.webp`
        );
        assert.ok(fs.existsSync(path.join(root, face)), face);
    }
});

test('Nincada release news is idempotent, credits 2ndstatus, and preserves Comic releases', async () => {
    assert.match(newsPost.paragraphs.join(' '), /design by 2ndstatus/i);
    assert.match(newsPost.title, /Nincada.*Ninjask.*Shedinja/i);
    assert.match(newsPost.paragraphs.join(' '), /Rare Candy.*Ditto/i);
    assert.ok(newsPost.changes.some((change) => change.skillId === 'shedinja-wonder-guard'));

    const documents = new Map();
    const getFilterKey = (filter) => {
        if (filter?.key) return filter.key;
        const clauses = Array.isArray(filter?.$or) ? filter.$or : [];
        return clauses.find((clause) => clause?.releaseVersion)?.releaseVersion
            || clauses.find((clause) => clause?.title)?.title;
    };
    const db = {
        collection(name) {
            return {
                async findOne(filter) {
                    return documents.get(`${name}:${getFilterKey(filter)}`) || null;
                },
                async updateOne(filter, update) {
                    const key = `${name}:${getFilterKey(filter)}`;
                    documents.set(key, {
                        ...(documents.get(key) || {}),
                        ...(update.$setOnInsert || {}),
                        ...(update.$set || {}),
                    });
                },
            };
        },
    };
    documents.set('app_state:latest_character_releases', {
        key: 'latest_character_releases',
        releasesByArena: {
            comic: [{ characterId: 'the-hulk' }],
            pokemon: [{ characterId: 'ditto' }],
        },
    });
    assert.deepEqual(await syncPokemonNincadaRelease(db), {
        migrated: true,
        newsSynced: true,
    });
    assert.deepEqual(await syncPokemonNincadaRelease(db), {
        migrated: false,
        newsSynced: true,
    });
    assert.deepEqual(
        buildLatestReleasesState(documents.get('app_state:latest_character_releases'))
            .releasesByArena.comic,
        [{ characterId: 'the-hulk' }]
    );
    assert.deepEqual(
        documents.get('app_state:latest_character_releases').releasesByArena.pokemon,
        [
            { characterId: 'nincada' },
            { characterId: 'dragapult' },
            { characterId: 'scraggy' },
        ]
    );
});
