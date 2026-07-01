const test = require('node:test');
const assert = require('node:assert/strict');

const {
    applyDamageToUnit,
    applyStatus,
    cleanseHarmfulStatuses,
    computeEffectiveEnergyCost,
    doesEffectConditionMatch,
    processTurnStartStatusEffects,
    reduceHulkRageForInactiveTurn,
    tickStatusesForTurnEnd,
} = require('../battleLogic.js');

test('cleanseHarmfulStatuses keeps unremovable harmful statuses', () => {
    const unit = {
        alive: true,
        state: {
            statuses: [
                {
                    id: 'rare_candy_evolution',
                    metadata: {
                        harmful: true,
                        unremovable: true,
                    },
                },
                {
                    id: 'ordinary_debuff',
                    metadata: {
                        harmful: true,
                    },
                },
            ],
        },
    };

    const removed = cleanseHarmfulStatuses(unit, 2);

    assert.equal(removed, 1);
    assert.deepEqual(
        unit.state.statuses.map((status) => status.id),
        ['rare_candy_evolution']
    );
});

test('physicalDamageTakenBonusFlat only affects physical damage', () => {
    const physicalTarget = {
        alive: true,
        hp: 100,
        maxHp: 100,
        state: {
            statuses: [
                {
                    id: 'krabby_leer_mark',
                    remainingTurns: 99,
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        physicalDamageTakenBonusFlat: 5,
                    },
                },
            ],
        },
    };
    const nonPhysicalTarget = structuredClone(physicalTarget);

    const physicalDealt = applyDamageToUnit(physicalTarget, 10, {
        sourceUsername: 'attacker',
        targetUsername: 'defender',
        skillClasses: ['Physical', 'Melee', 'Instant'],
    });
    const mentalDealt = applyDamageToUnit(nonPhysicalTarget, 10, {
        sourceUsername: 'attacker',
        targetUsername: 'defender',
        skillClasses: ['Mental', 'Ranged', 'Instant'],
    });

    assert.equal(physicalDealt, 15);
    assert.equal(physicalTarget.hp, 85);
    assert.equal(mentalDealt, 10);
    assert.equal(nonPhysicalTarget.hp, 90);
});

test('computeEffectiveEnergyCost applies stack-based random reductions for Bulbasaur Solar Beam', () => {
    const actorState = {
        statuses: [
            {
                id: 'bulbasaur_sun_stacks',
                remainingTurns: 99,
                metadata: {
                    bulbasaurSunStacks: 3,
                    randomCostReductionPerStatusMetadata: {
                        skillIds: ['bulbasaur-solar-beam', 'ivysaur-solar-beam'],
                        metadataKey: 'bulbasaurSunStacks',
                        multiplier: 1,
                    },
                },
            },
        ],
    };

    const effectiveCost = computeEffectiveEnergyCost({
        skill: {
            id: 'bulbasaur-solar-beam',
            energy: ['Taijutsu', 'Random', 'Random', 'Random', 'Random', 'Random'],
        },
        actorState,
    });

    assert.deepEqual(effectiveCost, {
        reservedSpecific: {
            taijutsu: 1,
            ninjutsu: 0,
            bloodline: 0,
            genjutsu: 0,
        },
        requiredRandom: 2,
    });
});

test('Pokemon Trainer ball thresholds gain 10 HP against stunned or cooldown-paralyzed targets', () => {
    const condition = {
        scope: 'target',
        targetRelation: 'enemy',
        sourceCurrentHpAtMost: 25,
        sourceCurrentHpAtMostConditionalBonus: {
            value: 10,
            statusIdsAny: ['stunned'],
            statusMetadataAny: ['paralyzeCooldowns'],
        },
    };

    const actorUnit = { hp: 100, alive: true, rosterIndex: 0 };
    const targetUnit = { hp: 35, alive: true, rosterIndex: 1 };
    const actorState = { statuses: [] };

    assert.equal(
        doesEffectConditionMatch({
            condition,
            actorState,
            targetState: { statuses: [] },
            actorUnit,
            targetUnit,
            actorUsername: 'player',
            targetUsername: 'enemy',
        }),
        false
    );

    assert.equal(
        doesEffectConditionMatch({
            condition,
            actorState,
            targetState: {
                statuses: [
                    {
                        id: 'stunned',
                        remainingTurns: 1,
                        metadata: { cannotUseSkills: true },
                    },
                ],
            },
            actorUnit,
            targetUnit,
            actorUsername: 'player',
            targetUsername: 'enemy',
        }),
        true
    );

    assert.equal(
        doesEffectConditionMatch({
            condition,
            actorState,
            targetState: {
                statuses: [
                    {
                        id: 'cooldown_lock',
                        remainingTurns: 1,
                        metadata: { paralyzeCooldowns: true },
                    },
                ],
            },
            actorUnit,
            targetUnit,
            actorUsername: 'player',
            targetUsername: 'enemy',
        }),
        true
    );
});

test('reduceHulkRageForInactiveTurn applies inactive-turn status hooks without crashing', () => {
    const match = {
        economy: {
            turnCounts: {
                player: 4,
            },
        },
        board: {
            player: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    state: {
                        statuses: [
                            {
                                id: 'bulbasaur_sun_tracker',
                                remainingTurns: 99,
                                metadata: {
                                    turnEndApplyStatusToOwnerIfNoManualSkill: {
                                        statusId: 'bulbasaur_sun_stacks',
                                        duration: 99,
                                        metadata: {
                                            infiniteDuration: true,
                                            bulbasaurSunStacks: 1,
                                            stackMetadataKey: 'bulbasaurSunStacks',
                                            stackDelta: 1,
                                            stackMax: 5,
                                            applyStatusAtStack: {
                                                metadataKey: 'bulbasaurSunStacks',
                                                value: 5,
                                                statusId: 'bulbasaur_ivysaur_evolution',
                                                duration: 99,
                                                metadata: {
                                                    infiniteDuration: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                id: 'bulbasaur_sun_stacks',
                                remainingTurns: 99,
                                metadata: {
                                    infiniteDuration: true,
                                    bulbasaurSunStacks: 4,
                                    stackMetadataKey: 'bulbasaurSunStacks',
                                    stackDelta: 1,
                                    stackMax: 5,
                                    applyStatusAtStack: {
                                        metadataKey: 'bulbasaurSunStacks',
                                        value: 5,
                                        statusId: 'bulbasaur_ivysaur_evolution',
                                        duration: 99,
                                        metadata: {
                                            infiniteDuration: true,
                                        },
                                    },
                                },
                            },
                        ],
                        snapshots: {},
                    },
                },
            ],
        },
    };

    reduceHulkRageForInactiveTurn({
        match,
        endingUsername: 'player',
        pendingTurn: { queuedByActorSlot: {} },
    });

    const statuses = match.board.player[0].state.statuses;
    const sunStacks = statuses.find((status) => status.id === 'bulbasaur_sun_stacks');
    const evolution = statuses.find((status) => status.id === 'bulbasaur_ivysaur_evolution');

    assert.equal(sunStacks?.metadata?.bulbasaurSunStacks, 5);
    assert.ok(evolution);
});

test('breaking Rare Candy destructible defense does not remove the evolution status', () => {
    const unit = {
        alive: true,
        hp: 100,
        maxHp: 100,
        state: {
            statuses: [
                {
                    id: 'bulbasaur_ivysaur_evolution',
                    remainingTurns: 999,
                    metadata: {
                        infiniteDuration: true,
                        unremovable: true,
                        facePictureOverride: 'assets/images/PokemonArena/Bulbasaur/ivysaurfp.jpg',
                        skillReplacements: {
                            'bulbasaur-leech-seed': 'ivysaur-leech-seed',
                        },
                        tooltipText: 'Bulbasaur has evolved into Ivysaur from Rare Candy.',
                    },
                },
                {
                    id: 'bulbasaur_ivysaur_rare_candy_defense',
                    remainingTurns: 999,
                    metadata: {
                        infiniteDuration: true,
                        unremovable: true,
                        destructibleDefensePoints: 25,
                        tooltipTextTemplate:
                            'This character has {destructibleDefensePoints} destructible defense from Rare Candy.',
                    },
                },
            ],
            snapshots: {},
        },
    };

    const dealt = applyDamageToUnit(unit, 25, {});

    assert.equal(dealt, 0);
    assert.ok(unit.state.statuses.find((status) => status.id === 'bulbasaur_ivysaur_evolution'));
    assert.equal(
        unit.state.statuses.find((status) => status.id === 'bulbasaur_ivysaur_rare_candy_defense'),
        undefined
    );
});

test('Magikarp evolution tracker gains a turn stack at turn start', () => {
    const match = {
        economy: {
            turnCounts: {
                player: 1,
            },
        },
        board: {
            player: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    state: {
                        statuses: [
                            {
                                id: 'magikarp_evolution_tracker',
                                remainingTurns: 999,
                                metadata: {
                                    hidden: true,
                                    infiniteDuration: true,
                                    magikarpTurnCount: 0,
                                    stackMetadataKey: 'magikarpTurnCount',
                                    stackMax: 7,
                                    turnStartApplyStatusToOwner: {
                                        statusId: 'magikarp_evolution_tracker',
                                        duration: 999,
                                        allowExistingStatusStacking: true,
                                        metadata: {
                                            hidden: true,
                                            infiniteDuration: true,
                                            stackMetadataKey: 'magikarpTurnCount',
                                            stackDelta: 1,
                                            stackMax: 7,
                                        },
                                    },
                                },
                            },
                        ],
                        snapshots: {},
                    },
                },
            ],
        },
    };

    processTurnStartStatusEffects({ match, startingUsername: 'player' });

    const tracker = match.board.player[0].state.statuses.find(
        (status) => status.id === 'magikarp_evolution_tracker'
    );
    assert.equal(tracker?.metadata?.magikarpTurnCount, 1);
});

test('affliction damage ignores destructible defense', () => {
    const unit = {
        alive: true,
        hp: 100,
        maxHp: 100,
        state: {
            statuses: [
                {
                    id: 'shield',
                    remainingTurns: 2,
                    metadata: {
                        destructibleDefensePoints: 25,
                    },
                },
            ],
            snapshots: {},
        },
    };

    const dealt = applyDamageToUnit(unit, 20, {
        sourceUsername: 'attacker',
        targetUsername: 'defender',
        afflictionDamage: true,
        skillClasses: ['Affliction', 'Ranged', 'Instant'],
    });

    assert.equal(dealt, 20);
    assert.equal(unit.hp, 80);
    assert.equal(unit.state.statuses[0].metadata.destructibleDefensePoints, 25);
});

test('turn-end damage statuses trigger on their first eligible turn-end', () => {
    const match = {
        board: {
            player: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    state: { statuses: [], snapshots: {} },
                },
            ],
            enemy: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    state: { statuses: [], snapshots: {} },
                },
            ],
        },
        players: [
            { username: 'player' },
            { username: 'enemy' },
        ],
        pendingActions: [],
        pendingTurns: [],
        pendingQueuedEffects: [],
        economy: {
            turnCounts: {
                player: 1,
                enemy: 1,
            },
        },
    };

    applyStatus({
        targetState: match.board.enemy[0].state,
        statusId: 'koffing_smog_cloud',
        duration: 4,
        sourceSkillId: 'koffing-smog',
        sourceUsername: 'player',
        sourceSlot: 0,
        metadata: {
            harmful: true,
            allowDuplicateStatusInstances: true,
            turnEndDamage: 5,
            afflictionDamage: true,
            ignoreTargetDamageReduction: true,
            ignoreTargetDestructibleDefense: true,
            turnDurationAnchor: 'source_turn',
            tooltipText: 'This character takes 5 affliction damage each turn from Smog.',
        },
    });

    tickStatusesForTurnEnd({ match, endingUsername: 'enemy' });

    assert.equal(match.board.enemy[0].hp, 95);
});

test('Splash can advance Magikarp into Gyarados immediately at 7 stacks', () => {
    const state = {
        statuses: [
            {
                id: 'magikarp_evolution_tracker',
                remainingTurns: 999,
                metadata: {
                    hidden: true,
                    infiniteDuration: true,
                    magikarpTurnCount: 6,
                    stackMetadataKey: 'magikarpTurnCount',
                    stackMax: 7,
                },
            },
        ],
        snapshots: {},
    };

    applyStatus({
        targetState: state,
        statusId: 'magikarp_evolution_tracker',
        duration: 999,
        sourceSkillId: 'magikarp-splash',
        sourceUsername: 'player',
        sourceSlot: 0,
        metadata: {
            hidden: true,
            infiniteDuration: true,
            stackMetadataKey: 'magikarpTurnCount',
            stackDelta: 1,
            stackMax: 7,
            applyStatusAtStack: {
                metadataKey: 'magikarpTurnCount',
                value: 7,
                statusId: 'magikarp_gyarados_evolution',
                duration: 999,
                metadata: {
                    infiniteDuration: true,
                    tooltipText: "Magikarp has evolved into Gyarados. Gyarados' skills are completely new.",
                },
            },
        },
        fresh: false,
    });

    const tracker = state.statuses.find((status) => status.id === 'magikarp_evolution_tracker');
    const evolution = state.statuses.find((status) => status.id === 'magikarp_gyarados_evolution');

    assert.equal(tracker?.metadata?.magikarpTurnCount, 7);
    assert.ok(evolution);
});
