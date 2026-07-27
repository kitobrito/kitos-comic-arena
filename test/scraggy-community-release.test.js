const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    buildInitialBoard,
    reduceHulkRageForInactiveTurn,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');
const {
    ensureRequiredMissionCatalogEntries,
    resolveMissionUnlockPointCost,
} = require('../server');
const { newsPost } = require('../sync_pokemon_ditto_release');

const root = path.resolve(__dirname, '..');
const scraggyIndex = characters.findIndex((character) => character?.id === 'scraggy');
const dittoIndex = characters.findIndex((character) => character?.id === 'ditto');
const trainerIndex = characters.findIndex((character) => character?.id === 'pokemon-trainer');
const koffingIndex = characters.findIndex((character) => character?.id === 'koffing');

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

const queueSkill = (match, username, skillIndex, targetUsername, targetSlot = 0) => {
    match.pendingTurns[username] = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: {
                skillIndex,
                targetSelection: [{ username: targetUsername, slot: targetSlot }],
            },
        },
    };
};

test('Scraggy uses supplied assets, Cheshire credit, correct typing, and no Ya Boi Scrafty', () => {
    const scraggy = characters[scraggyIndex];
    assert.ok(scraggy);
    assert.deepEqual(scraggy.pokemonTypes, ['Dark', 'Fighting']);
    assert.match(scraggy.description, /designed by Cheshire/i);
    assert.equal(scraggy.skills.length, 5);
    assert.equal(scraggy.skills.some((skill) => /ya boi/i.test(skill.name)), false);
    assert.deepEqual(
        scraggy.skills.map((skill) => skill.id),
        [
            'scraggy-headbutt',
            'scraggy-leer',
            'scraggy-hi-jump-kick',
            'scraggy-focus-blast',
            'scraggy-focus-energy',
        ]
    );
    [scraggy.facePicture, ...scraggy.skills.flatMap((skill) => [
        skill.skillimage,
        skill.evolvesTo?.skillimage,
    ])].filter(Boolean).forEach((asset) => {
        assert.ok(fs.existsSync(path.join(root, asset)), asset);
    });
});

test('Scraggy and Scrafty use their corrected costs and Physical class control', () => {
    const scraggy = characters[scraggyIndex];
    const expectedCosts = {
        'scraggy-headbutt': {
            base: ['Taijutsu'],
            evolved: ['Taijutsu', 'Random'],
        },
        'scraggy-leer': {
            base: ['Genjutsu'],
            evolved: ['Random'],
        },
        'scraggy-hi-jump-kick': {
            base: ['Taijutsu', 'Random'],
            evolved: ['Taijutsu', 'Random'],
        },
        'scraggy-focus-blast': {
            base: ['Taijutsu', 'Genjutsu'],
            evolved: ['Taijutsu', 'Genjutsu'],
        },
    };
    Object.entries(expectedCosts).forEach(([skillId, costs]) => {
        const skill = scraggy.skills.find((entry) => entry.id === skillId);
        assert.deepEqual(skill?.energy, costs.base, `${skillId} base cost`);
        assert.deepEqual(skill?.evolvesTo?.energy, costs.evolved, `${skillId} evolved cost`);
    });

    const leer = scraggy.skills.find((skill) => skill.id === 'scraggy-leer');
    const baseClassStun = leer.effects.find(
        (effect) => effect.statusId === 'scraggy_leer_melee_stun'
    );
    const evolvedClassStun = leer.evolvesTo.effects.find(
        (effect) => effect.statusId === 'scraggy_leer_melee_stun'
    );
    assert.deepEqual(baseClassStun.metadata.cannotUseSkillClasses, ['Physical']);
    assert.deepEqual(evolvedClassStun.metadata.cannotUseSkillClasses, ['Physical']);
    assert.match(leer.skilldescription, /Physical skills for 2 turns/i);
    assert.match(leer.evolvesTo.skilldescription, /Physical skills for 2 turns/i);

    const focusBlast = scraggy.skills.find((skill) => skill.id === 'scraggy-focus-blast');
    const evolvedInvulnerability = focusBlast.evolvesTo.effects.find(
        (effect) => effect.statusId === 'scrafty_focus_blast_melee_invulnerability'
    );
    assert.deepEqual(evolvedInvulnerability.metadata.invulnerableToSkillClasses, ['Physical']);
    assert.match(focusBlast.evolvesTo.skilldescription, /invulnerable to Physical skills/i);
});

test('Hi Jump Kick miss leaves the enemy unharmed, damages Scraggy, and emits MISS metadata', () => {
    const match = makeMatch({ ash: [scraggyIndex], gary: [koffingIndex] });
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    try {
        queueSkill(match, 'ash', 2, 'gary');
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    } finally {
        Math.random = originalRandom;
    }
    assert.equal(match.board.gary[0].hp, 100);
    assert.equal(match.board.ash[0].hp, 75);
    assert.ok(match.board.gary[0].state.statuses.some(
        (status) => status.id === 'skill_missed_notification'
            && status.metadata.missedSkillName === 'Hi Jump Kick'
    ));
    assert.equal(
        match.board.ash[0].state.statuses.find(
            (status) => status.id === 'scraggy_focus_energy_tracker'
        )?.metadata?.scraggyFocusEnergyStacks,
        0
    );
});

test('a landed Hi Jump Kick grants one Focus Energy stack and damages the enemy', () => {
    const match = makeMatch({ ash: [scraggyIndex], gary: [koffingIndex] });
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
        queueSkill(match, 'ash', 2, 'gary');
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    } finally {
        Math.random = originalRandom;
    }
    assert.equal(match.board.gary[0].hp, 70);
    assert.equal(match.board.ash[0].hp, 100);
    assert.equal(
        match.board.ash[0].state.statuses.find(
            (status) => status.id === 'scraggy_focus_energy_tracker'
        )?.metadata?.scraggyFocusEnergyStacks,
        1
    );
});

test('Hi Jump Kick cannot miss any stunned target', () => {
    for (const { evolved, expectedEnemyHp } of [
        { evolved: false, expectedEnemyHp: 70 },
        { evolved: true, expectedEnemyHp: 60 },
    ]) {
        const match = makeMatch({ ash: [scraggyIndex], gary: [koffingIndex] });
        if (evolved) {
            match.board.ash[0].state.statuses.push({
                id: 'scraggy_scrafty_evolution',
                remainingTurns: 999,
                metadata: { infiniteDuration: true, useEvolvedSkills: true },
            });
        }
        match.board.gary[0].state.statuses.push({
            id: 'test_stun',
            remainingTurns: 1,
            metadata: {
                harmful: true,
                stunLikeEffect: true,
                cannotUseSkills: true,
            },
        });
        const originalRandom = Math.random;
        Math.random = () => 0.99;
        try {
            queueSkill(match, 'ash', 2, 'gary');
            resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
        } finally {
            Math.random = originalRandom;
        }
        assert.equal(match.board.gary[0].hp, expectedEnemyHp);
        assert.equal(match.board.ash[0].hp, 100);
        assert.equal(
            match.board.gary[0].state.statuses.some(
                (status) => status.id === 'skill_missed_notification'
            ),
            false
        );
    }
});

test('three inactive turns evolve Scraggy and a copied Ditto into Scrafty skills', () => {
    for (const setup of [
        { teams: { ash: [scraggyIndex], gary: [koffingIndex] }, rosterIndex: scraggyIndex },
        { teams: { ash: [dittoIndex], gary: [scraggyIndex] }, rosterIndex: dittoIndex },
    ]) {
        const match = makeMatch(setup.teams);
        const unit = match.board.ash[0];
        for (let turn = 1; turn <= 3; turn += 1) {
            match.economy.turnCounts.ash = turn;
            reduceHulkRageForInactiveTurn({
                match,
                endingUsername: 'ash',
                pendingTurn: {},
            });
        }
        const evolution = unit.state.statuses.find(
            (status) => status.id === 'scraggy_scrafty_evolution'
        );
        assert.equal(evolution?.metadata?.useEvolvedSkills, true);
        assert.equal(
            resolveEffectiveSkill({
                characters,
                rosterIndex: setup.rosterIndex,
                skillIndex: 0,
                actorState: unit.state,
            })?.id,
            'scrafty-headbutt'
        );
    }
});

test('Pokemon Trainer Rare Candy can immediately evolve an allied Scraggy', () => {
    const rareCandyIndex = characters[trainerIndex].skills.findIndex(
        (skill) => skill.id === 'pokemon-trainer-rare-candy'
    );
    const match = makeMatch({ ash: [trainerIndex, scraggyIndex], gary: [koffingIndex] });
    queueSkill(match, 'ash', rareCandyIndex, 'ash', 1);
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    const scraggy = match.board.ash[1];
    assert.ok(scraggy.state.statuses.some(
        (status) => status.id === 'scraggy_scrafty_evolution'
            && status.metadata.useEvolvedSkills
    ));
    assert.ok(scraggy.state.statuses.some(
        (status) => status.id === 'scraggy_scrafty_rare_candy_defense'
            && status.metadata.destructibleDefensePoints === 25
    ));
});

test('Koffing Poison Gas is owner-only and Smog triggers on immediate and later packets', () => {
    const koffing = characters[koffingIndex];
    const passive = koffing.startStatuses.find(
        (status) => status.statusId === 'koffing_poison_gas_base'
    );
    assert.equal(passive.metadata.onTeamMemberSuccessfulDamageOwnerOnly, true);

    const match = makeMatch({ ash: [koffingIndex], gary: [scraggyIndex] });
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
        queueSkill(match, 'ash', 0, 'gary');
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
        assert.equal(match.board.gary[0].hp, 95);
        assert.ok(match.board.gary[0].state.statuses.some(
            (status) => status.id === 'koffing_poison_gas_harmful_blind'
        ));
        match.board.gary[0].state.statuses = match.board.gary[0].state.statuses.filter(
            (status) => status.id !== 'koffing_poison_gas_harmful_blind'
        );
        tickStatusesForTurnEnd({ match, endingUsername: 'ash' });
        tickStatusesForTurnEnd({ match, endingUsername: 'ash' });
    } finally {
        Math.random = originalRandom;
    }
    assert.equal(match.board.gary[0].hp, 90);
    assert.ok(match.board.gary[0].state.statuses.some(
        (status) => status.id === 'koffing_poison_gas_harmful_blind'
    ));
});

test('Scraggy release assets remain branded while the new UI hides its selection logo', () => {
    const mission = ensureRequiredMissionCatalogEntries([]).find(
        (entry) => entry.reward_character === 'scraggy'
    );
    assert.ok(mission);
    assert.equal(mission.missionId, 'scraggy-focus-energy-trial');
    assert.equal(resolveMissionUnlockPointCost(mission), 300);
    assert.deepEqual(
        mission.goals.map((goal) => [goal.type, goal.character_ids, goal.wins]),
        [
            ['win_matches_same_team', ['hitmonlee', 'koffing'], 8],
            ['win_streak_same_team', ['hitmonlee', 'koffing'], 4],
        ]
    );
    [
        mission.image,
        'assets/images/selection-featured/PokemonArena/BIB/scraggy.png.webp',
        'assets/images/selection-featured/PokemonArena/BIB/scrafty.png.webp',
        'assets/images/PokemonArena/pokemonarenalogo.png',
    ].forEach((asset) => assert.ok(fs.existsSync(path.join(root, asset)), asset));

    const newsText = newsPost.paragraphs.join(' ');
    assert.match(newsText, /Poison Gas now triggers only when Koffing or Weezing itself deals damage/i);
    assert.match(newsText, /one more community character release tomorrow/i);
    assert.match(newsText, /battle animations/i);

    const selection = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    const experimentalSelectionCss = fs.readFileSync(
        path.join(root, 'styles', 'selection-experimental.css'),
        'utf8'
    );
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
    const navigation = fs.readFileSync(path.join(root, 'scripts', 'arena-navigation.js'), 'utf8');
    assert.match(selection, /pokemon-arena-selection-logo/);
    assert.match(selection, /pokemon-selection-logo-hide-v1/);
    assert.match(
        experimentalSelectionCss,
        /html\.selection-experimental \.pokemon-arena-selection-logo\s*\{\s*display:\s*none;?\s*\}/
    );
    assert.match(selection, /scraggy-renders-v1/);
    assert.match(ingame, /pokemon-arena-battle-intro-logo/);
    assert.match(ingame, /scraggy-miss-v1/);
    assert.match(navigation, /PokemonArena\/pokemonarenalogo\.png/);
});
