const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const {
    computeEffectiveEnergyCost,
    computeTargetOptions,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
} = require('../battleLogic');

const emptyPool = () => ({ taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 });
const emptyState = () => ({ statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} });

const meowthIndex = characters.findIndex((character) => character?.id === 'meowth');
const meowth = characters[meowthIndex];

const buildMatch = () => ({
    players: [{ username: 'ash' }, { username: 'gary' }],
    board: {
        ash: [
            {
                alive: true,
                hp: 60,
                maxHp: 100,
                rosterIndex: meowthIndex,
                state: {
                    ...emptyState(),
                    statuses: (meowth?.startStatuses || []).map((status) => ({
                        id: status.statusId,
                        remainingTurns: status.duration,
                        sourceSkillId: status.sourceSkillId,
                        sourceUsername: 'ash',
                        sourceSlot: 0,
                        metadata: structuredClone(status.metadata || {}),
                    })),
                },
            },
        ],
        gary: [
            {
                alive: true,
                hp: 200,
                maxHp: 200,
                rosterIndex: 0,
                state: emptyState(),
            },
        ],
    },
    chakraPools: { ash: emptyPool(), gary: emptyPool() },
    pendingTurns: {},
    pendingActions: [],
    pendingQueuedEffects: [],
    economy: { turnCounts: { ash: 1, gary: 1 } },
});

const queueMeowthSkill = (match, skillIndex) => {
    match.pendingTurns.ash = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            '0': {
                skillIndex,
                targetSelection: [{ username: 'gary', slot: 0 }],
            },
        },
    };
};

test('Meowth is in the local roster and all Meowth/Persian art exists', () => {
    assert.notEqual(meowthIndex, -1);
    assert.equal(meowth.arena, 'pokemon');
    assert.deepEqual(
        meowth.skills.slice(0, 4).map((skill) => skill.name),
        ['Pay Day', 'Fury Swipes', 'Fake Out', 'Night Slash']
    );

    const artPaths = new Set([
        meowth.facePicture,
        ...meowth.skills.map((skill) => skill.skillimage).filter(Boolean),
    ]);
    artPaths.forEach((artPath) => {
        assert.ok(fs.existsSync(path.resolve(__dirname, '..', artPath)), `Missing ${artPath}`);
    });
});

test('Pay Day stores the stolen color as the next Night Slash cost', () => {
    const match = buildMatch();
    match.chakraPools.ash.taijutsu = 1;
    match.chakraPools.gary.genjutsu = 1;
    queueMeowthSkill(match, 0);

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.equal(match.chakraPools.gary.genjutsu, 0);
    assert.equal(match.chakraPools.ash.genjutsu, 1);
    const nightSlash = meowth.skills.find((skill) => skill.id === 'meowth-night-slash');
    assert.deepEqual(computeEffectiveEnergyCost({ skill: nightSlash, actorState: match.board.ash[0].state }), {
        reservedSpecific: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 1 },
        requiredRandom: 0,
    });
});

test('three successful Fury Swipes extensions evolve Meowth and improve its skills', () => {
    const match = buildMatch();
    match.board.gary[0].state.statuses = [
        {
            id: 'meowth_fury_swipes_physical',
            remainingTurns: 3,
            sourceUsername: 'ash',
            sourceSlot: 0,
            metadata: { harmful: true },
        },
        {
            id: 'meowth_fury_swipes_affliction',
            remainingTurns: 3,
            sourceUsername: 'ash',
            sourceSlot: 0,
            metadata: { harmful: true, afflictionDamage: true },
        },
    ];

    for (let use = 0; use < 3; use += 1) {
        match.chakraPools.ash.taijutsu = 1;
        match.board.ash[0].state.cooldowns = {};
        queueMeowthSkill(match, 3);
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    }

    const actor = match.board.ash[0];
    assert.ok(actor.state.statuses.some((status) => status.id === 'meowth_persian_evolution'));
    assert.equal(actor.hp, 75);
    assert.equal(
        resolveEffectiveSkill({ characters, rosterIndex: meowthIndex, skillIndex: 3, actorState: actor.state }).id,
        'persian-night-slash'
    );
    assert.equal(match.board.gary[0].state.statuses[0].remainingTurns, 6);
    assert.equal(match.board.gary[0].state.statuses[1].remainingTurns, 6);
});

test('Fake Out target history follows Meowth into Persian and only blocks that Meowth', () => {
    const match = buildMatch();
    match.board.gary[0].state.statuses.push({
        id: 'meowth_fake_out_target_history',
        remainingTurns: 99,
        sourceUsername: 'ash',
        sourceSlot: 0,
        metadata: { infiniteDuration: true },
    });

    const options = computeTargetOptions({
        match,
        actingUsername: 'ash',
        actorSlot: 0,
        skillIndex: 2,
        characters,
    });

    assert.equal(options.targets.length, 0);
});

test('Persian Night Slash keeps its Random cost when Pay Day changes its colored cost', () => {
    const persianNightSlash = meowth.skills.find((skill) => skill.id === 'persian-night-slash');
    const actorState = {
        statuses: [
            {
                id: 'persian_pay_day_night_slash_cost',
                remainingTurns: 99,
                metadata: {
                    skillCostOverridesBySkillId: {
                        'persian-night-slash': { energy: ['Bloodline', 'Random'] },
                    },
                },
            },
        ],
    };

    assert.deepEqual(computeEffectiveEnergyCost({ skill: persianNightSlash, actorState }), {
        reservedSpecific: { taijutsu: 0, ninjutsu: 0, bloodline: 1, genjutsu: 0 },
        requiredRandom: 1,
    });
});
