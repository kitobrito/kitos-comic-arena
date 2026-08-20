const test = require('node:test');
const assert = require('node:assert/strict');

const { resolvePendingTurnSkills } = require('../battleLogic.js');
const characters = require('../characters.js');

const articunoIndex = characters.findIndex((character) => character?.id === 'articuno');
const moltresIndex = characters.findIndex((character) => character?.id === 'moltres');
const zapdosIndex = characters.findIndex((character) => character?.id === 'zapdos');
const dummyEnemyIndex = characters.findIndex((character) => character?.id === 'iron-man');

const makeUnit = (rosterIndex, overrides = {}) => ({
    alive: true,
    hp: 100,
    maxHp: 100,
    rosterIndex,
    state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
    ...overrides,
});

const makeMatch = ({ casterUnit, enemyUnits = [makeUnit(dummyEnemyIndex)], skillIndex, targetSelection = [] }) => ({
    players: [{ username: 'ash' }, { username: 'gary' }],
    turnNumber: 0,
    weather: null,
    board: { ash: [casterUnit], gary: enemyUnits },
    chakraPools: {
        ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
    },
    pendingTurns: {
        ash: {
            queueOrder: ['0'],
            queuedByActorSlot: { '0': { skillIndex, targetSelection } },
        },
    },
    pendingActions: [],
    pendingQueuedEffects: [],
    economy: { turnCounts: { ash: 1, gary: 1 } },
});

const findSkillIndex = (characterIndex, skillId) =>
    characters[characterIndex].skills.findIndex((skill) => skill?.id === skillId);

test('Articuno Blizzard deals 10 damage, paralyzes cooldowns, and summons Snowstorm', () => {
    const casterUnit = makeUnit(articunoIndex);
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const skillIndex = findSkillIndex(articunoIndex, 'articuno-blizzard');
    const match = makeMatch({ casterUnit, enemyUnits: [enemyUnit], skillIndex, targetSelection: [] });

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.equal(enemyUnit.hp, 90);
    assert.ok(enemyUnit.state.statuses.some((status) => status.id === 'articuno_blizzard'));
    assert.ok(match.weather);
    assert.equal(match.weather.key, 'snowstorm');
    assert.equal(match.weather.roundsRemaining, 4);
    assert.equal(match.weather.blockRefreshIfActive, true);
    assert.equal(match.weather.excludeSkillId, 'articuno-blizzard');
    assert.equal(match.weather.damageTypeModifiers.Ice, 5);
    assert.equal(match.weather.damageTypeModifiers.Fire, -5);
    assert.deepEqual(match.weather.transformMoveType, { Water: 'Ice' });
});

test('Articuno Ice Beam stun is guaranteed during an active Snowstorm even on an unlucky roll', () => {
    const casterUnit = makeUnit(articunoIndex);
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const skillIndex = findSkillIndex(articunoIndex, 'articuno-ice-beam');
    const match = makeMatch({
        casterUnit,
        enemyUnits: [enemyUnit],
        skillIndex,
        targetSelection: [{ username: 'gary', slot: 0 }],
    });
    match.weather = {
        key: 'snowstorm',
        name: 'Snowstorm',
        roundsRemaining: 4,
        totalRounds: 4,
        sourcePlayer: 'ash',
        sourceSlot: 0,
    };

    const originalRandom = Math.random;
    Math.random = () => 0.99; // would normally fail a 50% roll
    try {
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    } finally {
        Math.random = originalRandom;
    }

    assert.equal(enemyUnit.hp, 85);
    assert.ok(
        enemyUnit.state.statuses.some((status) => status.id === 'articuno_ice_beam_stun'),
        'stun should be certain during Snowstorm regardless of the roll'
    );
});

test('Articuno Sheer Cold escalates and keeps its Ice Beam stun weather-certain while Snowstorm is up', () => {
    const casterUnit = makeUnit(articunoIndex, {
        state: {
            statuses: [
                {
                    id: 'articuno_sheer_cold_tracker',
                    sourceSkillId: 'articuno-sheer-cold',
                    remainingTurns: 999,
                    duration: 999,
                    metadata: { infiniteDuration: true, unremovable: true, bonusDamage: 5 },
                },
            ],
            cooldowns: {},
            skillUses: {},
            snapshots: {},
        },
    });
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const skillIndex = findSkillIndex(articunoIndex, 'articuno-sheer-cold');
    const match = makeMatch({ casterUnit, enemyUnits: [enemyUnit], skillIndex, targetSelection: [] });
    // Simulates a recast after Blizzard already summoned Snowstorm: the stun-chance check inside
    // the articuno_sheer_cold branch runs before its own set-weather call (matching the
    // prototype's authored effect order), so weather-certainty only kicks in when Snowstorm was
    // already active going into this cast.
    match.weather = {
        key: 'snowstorm',
        name: 'Snowstorm',
        roundsRemaining: 3,
        totalRounds: 4,
        sourcePlayer: 'ash',
        sourceSlot: 0,
        excludeSkillId: 'articuno-blizzard',
        damageTypeModifiers: { Ice: 5, Fire: -5 },
    };

    const originalRandom = Math.random;
    Math.random = () => 0.99;
    try {
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    } finally {
        Math.random = originalRandom;
    }

    assert.equal(
        enemyUnit.hp,
        60,
        '30 base + 5 existing tracker bonus + 5 Ice weather bonus ' +
            '(excludeSkillId is articuno-blizzard, not articuno-sheer-cold, so Sheer Cold is not exempt)'
    );
    const tracker = casterUnit.state.statuses.find((status) => status.id === 'articuno_sheer_cold_tracker');
    assert.equal(tracker.metadata.bonusDamage, 10, 'bonus should escalate by 5 again');
    assert.ok(enemyUnit.state.statuses.some((status) => status.id === 'articuno_ice_beam_stun'));
    assert.ok(match.weather);
    assert.equal(match.weather.key, 'snowstorm');
});

test('Moltres Wildfire summons weather and grants bonus Heat from its own cast', () => {
    const casterUnit = makeUnit(moltresIndex, {
        state: {
            statuses: [
                {
                    id: 'moltres_heat',
                    sourceSkillId: 'moltres-overheat',
                    remainingTurns: 999,
                    duration: 999,
                    metadata: { infiniteDuration: true, unremovable: true, heat: 0, overheatPenalty: 0, overheatUses: 0 },
                },
            ],
            cooldowns: {},
            skillUses: {},
            snapshots: {},
        },
    });
    const skillIndex = findSkillIndex(moltresIndex, 'moltres-sunny-day');
    const match = makeMatch({ casterUnit, skillIndex, targetSelection: [] });

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.ok(match.weather);
    assert.equal(match.weather.key, 'wildfire');
    assert.equal(match.weather.damageTypeModifiers.Fire, 5);
    assert.equal(match.weather.damageTypeModifiers.Water, -5);
    assert.equal(match.weather.costTypeModifiers.Grass, -1);
    assert.equal(match.weather.costTypeModifiers.Electric, 1);
    const heat = casterUnit.state.statuses.find((status) => status.id === 'moltres_heat');
    assert.equal(heat.metadata.heat, 2, '1 base Heat + 1 weather-synergy bonus from casting Wildfire itself');
});

test('Moltres Heat Wave gains bonus Heat only while her own Wildfire is active', () => {
    const makeCaster = () =>
        makeUnit(moltresIndex, {
            state: {
                statuses: [
                    {
                        id: 'moltres_heat',
                        sourceSkillId: 'moltres-overheat',
                        remainingTurns: 999,
                        duration: 999,
                        metadata: { infiniteDuration: true, unremovable: true, heat: 0, overheatPenalty: 0, overheatUses: 0 },
                    },
                ],
                cooldowns: {},
                skillUses: {},
                snapshots: {},
            },
        });
    const skillIndex = findSkillIndex(moltresIndex, 'moltres-heat-wave');

    const casterWithoutWeather = makeCaster();
    const matchWithoutWeather = makeMatch({
        casterUnit: casterWithoutWeather,
        skillIndex,
        targetSelection: [{ username: 'gary', slot: 0 }],
    });
    resolvePendingTurnSkills({ match: matchWithoutWeather, actingUsername: 'ash', characters });
    assert.equal(
        casterWithoutWeather.state.statuses.find((s) => s.id === 'moltres_heat').metadata.heat,
        1
    );

    const casterWithWeather = makeCaster();
    const matchWithWeather = makeMatch({
        casterUnit: casterWithWeather,
        skillIndex,
        targetSelection: [{ username: 'gary', slot: 0 }],
    });
    matchWithWeather.weather = { key: 'wildfire', sourcePlayer: 'ash', sourceSlot: 0, roundsRemaining: 4, totalRounds: 4 };
    resolvePendingTurnSkills({ match: matchWithWeather, actingUsername: 'ash', characters });
    assert.equal(
        casterWithWeather.state.statuses.find((s) => s.id === 'moltres_heat').metadata.heat,
        2,
        'own Wildfire should add the extra Heat'
    );
});

test('Zapdos Thunderstorm (Thunderbolt) activates weather on first cast and clears it on detonation', () => {
    const casterUnit = makeUnit(zapdosIndex);
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const skillIndex = findSkillIndex(zapdosIndex, 'zapdos-thunderbolt');
    const match = makeMatch({ casterUnit, enemyUnits: [enemyUnit], skillIndex, targetSelection: [] });

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    assert.ok(match.weather);
    assert.equal(match.weather.key, 'thunderstorm');
    assert.equal(match.weather.damageTypeModifiers.Electric, 5);
    assert.equal(match.weather.periodicRandomTargetDamage.amount, 10);
    assert.deepEqual(match.weather.periodicRandomTargetDamage.immuneTypes, ['Electric', 'Ground']);
    assert.ok(
        casterUnit.state.statuses.some((status) => status.id === 'zapdos_thunderbolt_active')
    );

    match.pendingTurns.ash = { queueOrder: ['0'], queuedByActorSlot: { '0': { skillIndex, targetSelection: [] } } };
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    assert.equal(enemyUnit.hp, 85, 'detonation deals 15 piercing team damage');
    assert.equal(match.weather, null, 'detonating should end the weather it started');
});

test('Zapdos Zap Cannon applies the normal 3-turn mark without Charge', () => {
    const casterUnit = makeUnit(zapdosIndex);
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const skillIndex = findSkillIndex(zapdosIndex, 'zapdos-zap-cannon');
    const match = makeMatch({
        casterUnit,
        enemyUnits: [enemyUnit],
        skillIndex,
        targetSelection: [{ username: 'gary', slot: 0 }],
    });

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.equal(enemyUnit.hp, 100, 'no immediate damage without a ready Charge');
    assert.ok(enemyUnit.state.statuses.some((status) => status.id === 'zapdos_zap_cannon'));
});

test('Zapdos Zap Cannon resolves instantly once Charge has ticked down to its last turn', () => {
    const casterUnit = makeUnit(zapdosIndex, {
        state: {
            statuses: [
                {
                    id: 'zapdos_charge',
                    sourceSkillId: 'zapdos-charge',
                    remainingTurns: 1,
                    duration: 2,
                    metadata: {
                        genjutsuCostReduction: 1,
                        increaseGenjutsuReductionEachTurn: 1,
                        onOwnerUseSkillTrigger: true,
                        persistOnOwnerUseSkillTrigger: false,
                        removeStatusIdsOnOwnerUseSkill: ['zapdos_charge'],
                    },
                },
            ],
            cooldowns: {},
            skillUses: {},
            snapshots: {},
        },
    });
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const skillIndex = findSkillIndex(zapdosIndex, 'zapdos-zap-cannon');
    const match = makeMatch({
        casterUnit,
        enemyUnits: [enemyUnit],
        skillIndex,
        targetSelection: [{ username: 'gary', slot: 0 }],
    });

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.equal(enemyUnit.hp, 70, 'instant 30 damage should resolve immediately');
    assert.ok(
        enemyUnit.state.statuses.some((status) => status.id === 'zapdos_zap_cannon_expire_stun'),
        'the instant path should stun immediately instead of leaving a delayed mark'
    );
    assert.ok(
        !enemyUnit.state.statuses.some((status) => status.id === 'zapdos_zap_cannon'),
        'the delayed mark should not be applied on the instant-resolve path'
    );
    assert.ok(
        !casterUnit.state.statuses.some((status) => status.id === 'zapdos_charge'),
        'Charge should be consumed by casting another skill, as it already was before this change'
    );
});

test('Zapdos Zap Cannon gets the Thunderstorm Electric damage bonus on the instant-resolve path', () => {
    const casterUnit = makeUnit(zapdosIndex, {
        state: {
            statuses: [
                {
                    id: 'zapdos_charge',
                    sourceSkillId: 'zapdos-charge',
                    remainingTurns: 1,
                    duration: 2,
                    metadata: { onOwnerUseSkillTrigger: true, removeStatusIdsOnOwnerUseSkill: ['zapdos_charge'] },
                },
            ],
            cooldowns: {},
            skillUses: {},
            snapshots: {},
        },
    });
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const skillIndex = findSkillIndex(zapdosIndex, 'zapdos-zap-cannon');
    const match = makeMatch({
        casterUnit,
        enemyUnits: [enemyUnit],
        skillIndex,
        targetSelection: [{ username: 'gary', slot: 0 }],
    });
    match.weather = {
        key: 'thunderstorm',
        sourcePlayer: 'ash',
        sourceSlot: 0,
        excludeSkillId: 'zapdos-thunderbolt',
        roundsRemaining: 4,
        totalRounds: 4,
        damageTypeModifiers: { Electric: 5 },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.equal(enemyUnit.hp, 65, '30 base + 5 Electric weather bonus');
});
