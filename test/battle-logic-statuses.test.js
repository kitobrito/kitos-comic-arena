const test = require('node:test');
const assert = require('node:assert/strict');

const {
    applyDamageToUnit,
    applyStatus,
    cleanseHarmfulStatuses,
    computeTargetOptions,
    computeEffectiveEnergyCost,
    doesEffectConditionMatch,
    processTurnStartStatusEffects,
    reduceHulkRageForInactiveTurn,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic.js');
const characters = require('../characters');

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

test('consumeOnPreventedDeath removes Sturdy after surviving lethal damage at 1 HP', () => {
    const unit = {
        alive: true,
        hp: 20,
        maxHp: 20,
        state: {
            statuses: [
                {
                    id: 'onix_sturdy',
                    remainingTurns: 99,
                    metadata: {
                        infiniteDuration: true,
                        minimumHp: 1,
                        consumeOnPreventedDeath: true,
                        ignoreExecutionEffects: true,
                    },
                },
            ],
        },
    };

    const dealt = applyDamageToUnit(unit, 25, {
        sourceUsername: 'enemy',
        targetUsername: 'player',
        skillClasses: ['Physical', 'Melee', 'Instant'],
    });

    assert.equal(dealt, 25);
    assert.equal(unit.hp, 1);
    assert.deepEqual(unit.state.statuses, []);
});

test('unpierceableDamageReductionFlatPerStatusMetadataMaximum caps derived reduction', () => {
    const unit = {
        alive: true,
        hp: 100,
        maxHp: 100,
        state: {
            statuses: [
                {
                    id: 'onix_harden',
                    remainingTurns: 1,
                    metadata: {
                        onixIronTailReduction: 14,
                        unpierceableDamageReductionFlatPerStatusMetadataKey: 'onixIronTailReduction',
                        unpierceableDamageReductionFlatPerStatusMetadataStep: 1,
                        unpierceableDamageReductionFlatPerStatusMetadataAmount: 1,
                        unpierceableDamageReductionFlatPerStatusMetadataMaximum: 10,
                    },
                },
            ],
        },
    };

    const dealt = applyDamageToUnit(unit, 20, {
        sourceUsername: 'enemy',
        targetUsername: 'player',
        skillClasses: ['Physical', 'Melee', 'Instant'],
        ignoreDamageReduction: true,
    });

    assert.equal(dealt, 10);
    assert.equal(unit.hp, 90);
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

test('resolvePendingTurnSkills applies gain_chakra effects without crashing queued turn resolution', () => {
    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        board: {
            ash: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 0,
                    state: {
                        statuses: [],
                        cooldowns: {},
                        snapshots: {},
                    },
                },
            ],
            gary: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 1,
                    state: {
                        statuses: [],
                        cooldowns: {},
                        snapshots: {},
                    },
                },
            ],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': {
                        skillIndex: 0,
                        targetSelection: [],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: {
            turnCounts: {
                ash: 1,
                gary: 1,
            },
        },
    };
    const characters = [
        {
            id: 'test-caster',
            skills: [
                {
                    id: 'test-gain-chakra',
                    classes: ['Energy', 'Instant'],
                    effects: [
                        {
                            type: 'gain_chakra',
                            amount: 1,
                            chakraType: 'genjutsu',
                            scope: 'self',
                        },
                    ],
                },
            ],
        },
        {
            id: 'test-target',
            skills: [],
        },
    ];

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.equal(match.chakraPools.ash.genjutsu, 1);
});

test('Poison Ivy Lashing Thorns deals immediate affliction damage on cast', () => {
    const characters = require('../characters.js');
    const poisonIvyIndex = characters.findIndex((character) => character?.id === 'poison-ivy');
    const ironManIndex = characters.findIndex((character) => character?.id === 'iron-man');
    const captainAmericaIndex = characters.findIndex((character) => character?.id === 'captain-america');

    assert.notEqual(poisonIvyIndex, -1);
    assert.notEqual(ironManIndex, -1);
    assert.notEqual(captainAmericaIndex, -1);

    const match = {
        players: [{ username: 'ivy' }, { username: 'enemy' }],
        board: {
            ivy: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: poisonIvyIndex,
                    state: {
                        statuses: [],
                        cooldowns: {},
                        snapshots: {},
                    },
                },
            ],
            enemy: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: ironManIndex,
                    state: {
                        statuses: [],
                        cooldowns: {},
                        snapshots: {},
                    },
                },
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: captainAmericaIndex,
                    state: {
                        statuses: [],
                        cooldowns: {},
                        snapshots: {},
                    },
                },
            ],
        },
        chakraPools: {
            ivy: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
            enemy: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
        },
        pendingTurns: {
            ivy: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': {
                        skillIndex: 1,
                        targetSelection: [],
                    },
                },
            },
        },
        currentTurn: 'ivy',
        turnCount: 2,
        economy: { turnCounts: { ivy: 1, enemy: 0 } },
    };

    resolvePendingTurnSkills({
        match,
        actingUsername: 'ivy',
        characters,
    });

    assert.equal(match.board.enemy[0].hp, 95);
    assert.equal(match.board.enemy[1].hp, 95);
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

test('Krabby evolution removes the Harden turn tracker once Kingler is reached', () => {
    const match = {
        economy: {
            turnCounts: {
                player: 3,
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
                                id: 'krabby_harden_defense',
                                remainingTurns: 999,
                                sourceSkillId: 'krabby-harden',
                                metadata: {
                                    infiniteDuration: true,
                                    destructibleDefensePoints: 20,
                                    turnStartApplyStatusToOwner: {
                                        statusId: 'krabby_harden_turn_tracker',
                                        duration: 99,
                                        metadata: {
                                            infiniteDuration: true,
                                            krabbyHardenTurns: 0,
                                            stackMetadataKey: 'krabbyHardenTurns',
                                            stackDelta: 1,
                                            stackMax: 3,
                                            applyStatusAtStack: {
                                                metadataKey: 'krabbyHardenTurns',
                                                value: 3,
                                                statusId: 'krabby_kingler_evolution',
                                                duration: 99,
                                                metadata: {
                                                    infiniteDuration: true,
                                                    removeStatusIdsOnApply: ['krabby_harden_turn_tracker'],
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                id: 'krabby_harden_turn_tracker',
                                remainingTurns: 99,
                                sourceSkillId: 'krabby-harden',
                                metadata: {
                                    infiniteDuration: true,
                                    krabbyHardenTurns: 2,
                                    stackMetadataKey: 'krabbyHardenTurns',
                                    stackDelta: 1,
                                    stackMax: 3,
                                    applyStatusAtStack: {
                                        metadataKey: 'krabbyHardenTurns',
                                        value: 3,
                                        statusId: 'krabby_kingler_evolution',
                                        duration: 99,
                                        metadata: {
                                            infiniteDuration: true,
                                            removeStatusIdsOnApply: ['krabby_harden_turn_tracker'],
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };

    processTurnStartStatusEffects({ match, startingUsername: 'player' });

    const statuses = match.board.player[0].state.statuses;
    assert.equal(
        statuses.some((status) => status.id === 'krabby_harden_turn_tracker'),
        false
    );
    assert.equal(
        statuses.some((status) => status.id === 'krabby_kingler_evolution'),
        true
    );
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
                                    stackMax: 6,
                                    turnStartApplyStatusToOwner: {
                                        statusId: 'magikarp_evolution_tracker',
                                        duration: 999,
                                        allowExistingStatusStacking: true,
                                        metadata: {
                                            hidden: true,
                                            infiniteDuration: true,
                                            stackMetadataKey: 'magikarpTurnCount',
                                            stackDelta: 1,
                                            stackMax: 6,
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

test('skipFirstTurnStartTick delays turn-start damage until the following turn cycle', () => {
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
                                id: 'delayed_water_mark',
                                remainingTurns: 2,
                                sourceSkillId: 'squirtle-water-gun',
                                sourceUsername: 'enemy',
                                sourceSlot: 0,
                                metadata: {
                                    harmful: true,
                                    turnStartDamage: 10,
                                    fixedTurnStartDamage: true,
                                    skipFirstTurnStartTick: true,
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
    assert.equal(match.board.player[0].hp, 100);

    match.economy.turnCounts.player = 2;
    processTurnStartStatusEffects({ match, startingUsername: 'player' });
    assert.equal(match.board.player[0].hp, 90);
});

test('Smog deals damage on the source turn end even if the caster is stunned afterward', () => {
    const match = {
        players: [
            { username: 'player' },
            { username: 'enemy' },
        ],
        board: {
            player: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    state: {
                        statuses: [
                            {
                                id: 'stunned',
                                remainingTurns: 1,
                                metadata: {
                                    harmful: true,
                                    cannotUseSkills: true,
                                },
                            },
                        ],
                        snapshots: {},
                    },
                },
            ],
            enemy: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    state: {
                        statuses: [
                            {
                                id: 'koffing_smog_cloud',
                                remainingTurns: 4,
                                sourceSkillId: 'koffing-smog',
                                sourceUsername: 'player',
                                sourceSlot: 0,
                                fresh: true,
                                metadata: {
                                    harmful: true,
                                    allowDuplicateStatusInstances: true,
                                    turnEndDamage: 5,
                                    fixedTurnEndDamage: true,
                                    triggerOnApply: true,
                                    afflictionDamage: true,
                                    ignoreTargetDamageReduction: true,
                                    ignoreTargetDestructibleDefense: true,
                                    turnEndTrigger: 'source_turn',
                                    turnDurationAnchor: 'source_turn',
                                },
                            },
                        ],
                        snapshots: {},
                    },
                },
            ],
        },
    };

    tickStatusesForTurnEnd({ match, endingUsername: 'player' });

    assert.equal(match.board.enemy[0].hp, 95);
    assert.equal(match.board.enemy[0].state.statuses[0].remainingTurns, 3);
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

test('Aerodactyl Tough Head converts self health loss into destructible defense and Rock Slide consumes it for main-target bonus damage', () => {
    const aerodactylIndex = characters.findIndex((character) => character?.id === 'aerodactyl');
    assert.notEqual(aerodactylIndex, -1);

    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        board: {
            ash: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: aerodactylIndex,
                    state: {
                        statuses: [
                            {
                                id: 'aerodactyl_tough_head_passive',
                                remainingTurns: 99,
                                metadata: structuredClone(
                                    characters[aerodactylIndex].startStatuses?.[0]?.metadata || {}
                                ),
                            },
                        ],
                        cooldowns: {},
                        skillUses: {},
                        snapshots: {},
                    },
                },
            ],
            gary: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 0,
                    state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
                },
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 1,
                    state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
                },
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 2,
                    state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
                },
            ],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': {
                        skillIndex: 0,
                        targetSelection: [{ username: 'gary', slot: 2 }],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: {
            turnCounts: { ash: 1, gary: 1 },
        },
    };

    resolvePendingTurnSkills({
        match,
        actingUsername: 'ash',
        characters,
    });

    const aerodactylUnit = match.board.ash[0];
    assert.equal(aerodactylUnit.hp, 90);
    const toughHeadDefense = aerodactylUnit.state.statuses.find(
        (status) => status.id === 'aerodactyl_tough_head_defense'
    );
    assert.ok(toughHeadDefense);
    assert.equal(toughHeadDefense.metadata.destructibleDefensePoints, 10);

    match.pendingTurns.ash = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            '0': {
                skillIndex: 1,
                targetSelection: [{ username: 'gary', slot: 0 }],
            },
        },
    };

    resolvePendingTurnSkills({
        match,
        actingUsername: 'ash',
        characters,
    });

    assert.equal(match.board.gary[0].hp, 80);
    assert.equal(match.board.gary[1].hp, 90);
    assert.equal(match.board.gary[2].hp, 70);
    assert.equal(
        aerodactylUnit.state.statuses.some((status) => status.id === 'aerodactyl_tough_head_defense'),
        false
    );
});

test('Hitmonlee High Jump Kick can miss and deals 30 recoil damage to Hitmonlee', () => {
    const hitmonleeIndex = characters.findIndex((character) => character?.id === 'hitmonlee');
    assert.notEqual(hitmonleeIndex, -1);
    const highJumpKickIndex = characters[hitmonleeIndex].skills.findIndex(
        (skill) => skill?.id === 'hitmonlee-high-jump-kick'
    );
    assert.notEqual(highJumpKickIndex, -1);
    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        board: {
            ash: [{
                alive: true,
                hp: 100,
                maxHp: 100,
                rosterIndex: hitmonleeIndex,
                state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
            }],
            gary: [{
                alive: true,
                hp: 100,
                maxHp: 100,
                rosterIndex: 0,
                state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
            }],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': {
                        skillIndex: highJumpKickIndex,
                        targetSelection: [{ username: 'gary', slot: 0 }],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { ash: 1, gary: 1 } },
    };
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    try {
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    } finally {
        Math.random = originalRandom;
    }
    assert.equal(match.board.gary[0].hp, 100);
    assert.equal(match.board.ash[0].hp, 70);
    assert.equal(
        match.board.ash[0].state.statuses.some(
            (status) => status.id === 'hitmonlee_high_jump_kick_hit_confirmed'
        ),
        false
    );
});

test('Aerodactyl Stone Edge turns Tough Head defense into extra stun chance and crit damage', () => {
    const aerodactylIndex = characters.findIndex((character) => character?.id === 'aerodactyl');
    assert.notEqual(aerodactylIndex, -1);

    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        board: {
            ash: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: aerodactylIndex,
                    state: {
                        statuses: [
                            {
                                id: 'aerodactyl_tough_head_passive',
                                remainingTurns: 99,
                                metadata: structuredClone(
                                    characters[aerodactylIndex].startStatuses?.[0]?.metadata || {}
                                ),
                            },
                            {
                                id: 'aerodactyl_tough_head_defense',
                                remainingTurns: 99,
                                metadata: {
                                    destructibleDefensePoints: 100,
                                },
                            },
                        ],
                        cooldowns: {},
                        skillUses: {},
                        snapshots: {},
                    },
                },
            ],
            gary: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 0,
                    state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
                },
            ],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': {
                        skillIndex: 3,
                        targetSelection: [{ username: 'gary', slot: 0 }],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: {
            turnCounts: { ash: 1, gary: 1 },
        },
    };

    resolvePendingTurnSkills({
        match,
        actingUsername: 'ash',
        characters,
    });

    const aerodactylUnit = match.board.ash[0];
    assert.equal(match.board.gary[0].hp, 60);
    assert.ok(
        match.board.gary[0].state.statuses.some((status) => status.id === 'aerodactyl_stone_edge_stun')
    );
    assert.equal(
        aerodactylUnit.state.statuses.some((status) => status.id === 'aerodactyl_tough_head_defense'),
        false
    );
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

test('Dragon Rage deals damage on the same Gyarados turn it is applied', () => {
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
        statusId: 'gyarados_dragon_rage_burn',
        duration: 3,
        sourceSkillId: 'gyarados-dragon-rage',
        sourceUsername: 'player',
        sourceSlot: 0,
        metadata: {
            harmful: true,
            turnEndDamage: 20,
            turnEndTrigger: 'source_turn',
            turnDurationAnchor: 'source_turn',
            triggerOnApply: true,
            damageType: 'affliction',
            statusIconUrl: 'assets/images/PokemonArena/magikarp/dragonrage.png',
            tooltipText:
                "This character takes 20 affliction damage at the end of Gyarados's turns from Dragon Rage.",
        },
    });

    tickStatusesForTurnEnd({ match, endingUsername: 'player' });

    assert.equal(match.board.enemy[0].hp, 80);
    assert.equal(match.board.enemy[0].state.statuses[0].remainingTurns, 2);
});

test('Magnemite Thunder Wave expires after one affected enemy turn', () => {
    const magnemiteIndex = characters.findIndex((character) => character?.id === 'magnemite');
    const thunderWaveIndex = characters[magnemiteIndex].skills.findIndex(
        (skill) => skill?.id === 'magnemite-thunder-wave'
    );
    assert.notEqual(magnemiteIndex, -1);
    assert.notEqual(thunderWaveIndex, -1);

    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        board: {
            ash: [{
                alive: true,
                hp: 100,
                maxHp: 100,
                rosterIndex: magnemiteIndex,
                state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
            }],
            gary: [{
                alive: true,
                hp: 100,
                maxHp: 100,
                rosterIndex: 0,
                state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
            }],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': {
                        skillIndex: thunderWaveIndex,
                        targetSelection: [{ username: 'gary', slot: 0 }],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { ash: 1, gary: 1 } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    const getThunderWaveStun = () => match.board.gary[0].state.statuses.find(
        (status) => status.id === 'magnemite_thunder_wave_stun'
    );
    assert.equal(getThunderWaveStun()?.metadata?.turnDurationAnchor, 'source_turn');

    tickStatusesForTurnEnd({ match, endingUsername: 'ash' });
    tickStatusesForTurnEnd({ match, endingUsername: 'gary' });
    assert.ok(getThunderWaveStun(), 'Thunder Wave should cover the first enemy turn');

    tickStatusesForTurnEnd({ match, endingUsername: 'ash' });
    assert.equal(getThunderWaveStun(), undefined);
});

test('Koffing Poison Gas can proc from its random-only damage hook', () => {
    const koffingIndex = characters.findIndex((character) => character?.id === 'koffing');
    const selfDestructIndex = characters[koffingIndex].skills.findIndex(
        (skill) => skill?.id === 'koffing-self-destruct'
    );
    assert.notEqual(koffingIndex, -1);
    assert.notEqual(selfDestructIndex, -1);

    const poisonGas = characters[koffingIndex].startStatuses.find(
        (status) => status?.statusId === 'koffing_poison_gas_base'
    );
    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        board: {
            ash: [{
                alive: true,
                hp: 100,
                maxHp: 100,
                rosterIndex: koffingIndex,
                state: {
                    statuses: [{
                        id: poisonGas.statusId,
                        remainingTurns: poisonGas.duration,
                        sourceSkillId: poisonGas.sourceSkillId,
                        metadata: structuredClone(poisonGas.metadata),
                    }],
                    cooldowns: {},
                    skillUses: {},
                    snapshots: {},
                },
            }],
            gary: [{
                alive: true,
                hp: 100,
                maxHp: 100,
                rosterIndex: 0,
                state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
            }],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': {
                        skillIndex: selfDestructIndex,
                        targetSelection: [{ username: 'gary', slot: 0 }],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { ash: 1, gary: 1 } },
    };

    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    } finally {
        Math.random = originalRandom;
    }

    assert.equal(match.board.gary[0].hp, 80);
    assert.ok(
        match.board.gary[0].state.statuses.some(
            (status) => status.id === 'koffing_poison_gas_harmful_blind'
        )
    );
});

test('Splash can advance Magikarp into Gyarados immediately at 6 stacks', () => {
    const state = {
        statuses: [
            {
                id: 'magikarp_evolution_tracker',
                remainingTurns: 999,
                metadata: {
                    hidden: true,
                    infiniteDuration: true,
                    magikarpTurnCount: 5,
                    stackMetadataKey: 'magikarpTurnCount',
                    stackMax: 6,
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
            stackMax: 6,
            applyStatusAtStack: {
                metadataKey: 'magikarpTurnCount',
                value: 6,
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

    assert.equal(tracker?.metadata?.magikarpTurnCount, 6);
    assert.ok(evolution);
});

test('Struggle ignores passive skills when checking if all other skills are on cooldown', () => {
    const characters = [
        {
            characterId: 'magikarp',
            skills: [
                {
                    id: 'magikarp-tackle',
                    name: 'Tackle',
                    target: 'single-enemy',
                    energy: ['Random'],
                    cooldown: 3,
                    classes: ['Physical', 'Melee', 'Instant'],
                },
                {
                    id: 'magikarp-splash',
                    name: 'Splash',
                    target: 'self',
                    energy: [],
                    cooldown: 3,
                    classes: ['Physical', 'Instant'],
                },
                {
                    id: 'magikarp-flail',
                    name: 'Flail',
                    target: 'single-enemy',
                    energy: ['Random', 'Random'],
                    cooldown: 3,
                    classes: ['Physical', 'Melee', 'Instant'],
                },
                {
                    id: 'magikarp-struggle',
                    name: 'Struggle',
                    target: 'single-enemy',
                    energy: ['Random'],
                    cooldown: 0,
                    actorCondition: {
                        allOtherSkillsOnCooldown: true,
                    },
                    classes: ['Physical', 'Melee', 'Instant'],
                },
                {
                    id: 'magikarp-passive-evolution-gyarados',
                    name: 'Evolution - Gyarados',
                    target: '',
                    energy: [],
                    cooldown: 0,
                    classes: ['Passive', 'Instant'],
                },
            ],
        },
    ];

    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        board: {
            ash: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 0,
                    state: {
                        statuses: [],
                        cooldowns: {
                            'magikarp-tackle': 1,
                            'magikarp-splash': 1,
                            'magikarp-flail': 1,
                            'magikarp-struggle': 0,
                        },
                        skillUses: {},
                        snapshots: {},
                    },
                },
            ],
            gary: [
                {
                    alive: true,
                    hp: 100,
                    maxHp: 100,
                    rosterIndex: 0,
                    state: {
                        statuses: [],
                        cooldowns: {},
                        skillUses: {},
                        snapshots: {},
                    },
                },
            ],
        },
    };

    const options = computeTargetOptions({
        match,
        actingUsername: 'ash',
        actorSlot: 0,
        skillIndex: 3,
        characters,
    });

    assert.equal(options.targetType, 'single-enemy');
    assert.equal(options.mode, 'single');
    assert.equal(options.targets.length, 1);
});
