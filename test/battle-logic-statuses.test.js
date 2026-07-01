const test = require('node:test');
const assert = require('node:assert/strict');

const {
    applyDamageToUnit,
    cleanseHarmfulStatuses,
    computeEffectiveEnergyCost,
    reduceHulkRageForInactiveTurn,
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
