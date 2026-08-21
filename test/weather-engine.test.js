const test = require('node:test');
const assert = require('node:assert/strict');

const {
    applyDamageToUnit,
    computeEffectiveEnergyCost,
    getWeatherViewerPayload,
    resolvePendingTurnSkills,
    setWeather,
    clearWeather,
    tickWeatherForTurnEnd,
} = require('../battleLogic.js');

const makeUnit = (overrides = {}) => ({
    alive: true,
    hp: 100,
    maxHp: 100,
    rosterIndex: 0,
    state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
    ...overrides,
});

test('setWeather begins a new weather and clearWeather removes it', () => {
    const match = { turnNumber: 4, weather: null };
    const weather = setWeather(match, {
        key: 'wildfire',
        name: 'Wildfire',
        rounds: 4,
        sourcePlayer: 'ash',
        sourceSlot: 0,
        sourceSkillId: 'moltres-sunny-day',
    });

    assert.equal(weather.key, 'wildfire');
    assert.equal(weather.roundsRemaining, 4);
    assert.equal(weather.totalRounds, 4);
    assert.equal(weather.sourcePlayer, 'ash');
    assert.equal(match.weather, weather);

    clearWeather(match);
    assert.equal(match.weather, null);
});

test('setWeather honors blockRefreshIfActive and allows replacement by a different key', () => {
    const match = { turnNumber: 0, weather: null };
    const first = setWeather(match, { key: 'snowstorm', rounds: 4, blockRefreshIfActive: true });

    const refreshAttempt = setWeather(match, { key: 'snowstorm', rounds: 4, blockRefreshIfActive: true });
    assert.equal(refreshAttempt, first, 'refresh of the same still-active weather should be a no-op');
    assert.equal(match.weather.roundsRemaining, 4);

    const replaced = setWeather(match, { key: 'wildfire', rounds: 4 });
    assert.equal(match.weather.key, 'wildfire');
    assert.notEqual(replaced, first);
});

test('applyDamageToUnit applies the weather damage-type bonus and excludes the summoning skill', () => {
    const match = {
        turnNumber: 0,
        weather: {
            key: 'wildfire',
            excludeSkillId: 'moltres-sunny-day',
            damageTypeModifiers: { Fire: 5, Water: -5 },
            afflictionDamageBonusFlat: 0,
        },
    };

    const target = makeUnit();
    const dealt = applyDamageToUnit(target, 20, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        sourceSkillId: 'moltres-heat-wave',
        skillClasses: ['Fire', 'Special', 'Ranged'],
    });
    assert.equal(dealt, 25, 'Fire move should gain the +5 Wildfire bonus');

    const excludedTarget = makeUnit();
    const excludedDealt = applyDamageToUnit(excludedTarget, 20, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        sourceSkillId: 'moltres-sunny-day',
        skillClasses: ['Fire', 'Special', 'Ranged'],
    });
    assert.equal(excludedDealt, 20, 'the skill that summoned the weather should not buff itself');

    const waterTarget = makeUnit();
    const waterDealt = applyDamageToUnit(waterTarget, 20, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        sourceSkillId: 'squirtle-water-gun',
        skillClasses: ['Water', 'Special', 'Ranged'],
    });
    assert.equal(waterDealt, 15, 'Water moves should be penalized -5 during Wildfire');
});

test('applyDamageToUnit transforms Water into Ice during Snowstorm, bypassing damage reduction but not destructible defense', () => {
    const match = {
        turnNumber: 0,
        weather: {
            key: 'snowstorm',
            damageTypeModifiers: { Ice: 5, Fire: -5 },
            transformMoveType: { Water: 'Ice' },
        },
    };

    const reducedTarget = makeUnit({
        state: {
            statuses: [
                {
                    id: 'test-guard',
                    remainingTurns: 5,
                    metadata: { harmful: false, damageReductionPercent: 50 },
                },
            ],
            cooldowns: {},
            skillUses: {},
            snapshots: {},
        },
    });
    const dealt = applyDamageToUnit(reducedTarget, 20, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        sourceSkillId: 'squirtle-water-gun',
        skillClasses: ['Water', 'Special', 'Ranged'],
    });
    assert.equal(
        dealt,
        25,
        'transformed to Ice (+5 bonus = 25 base) and the 50% reduction should be bypassed entirely, not just halved'
    );

    const shieldedTarget = makeUnit({
        state: {
            statuses: [
                {
                    id: 'test-shield',
                    remainingTurns: 5,
                    metadata: { harmful: false, destructibleDefensePoints: 100 },
                },
            ],
            cooldowns: {},
            skillUses: {},
            snapshots: {},
        },
    });
    const shieldedDealt = applyDamageToUnit(shieldedTarget, 20, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        sourceSkillId: 'squirtle-water-gun',
        skillClasses: ['Water', 'Special', 'Ranged'],
    });
    assert.equal(
        shieldedDealt,
        0,
        'unlike affliction/ignoreDestructibleDefense damage, a weather-transformed hit must still be absorbed by destructible defense'
    );
    const shield = shieldedTarget.state.statuses.find((status) => status.id === 'test-shield');
    assert.equal(shield.metadata.destructibleDefensePoints, 75, 'the shield should have absorbed the full 25 transformed damage');
});

test('applyDamageToUnit applies the weather affliction bonus only to affliction damage', () => {
    const match = {
        turnNumber: 0,
        weather: { key: 'test-weather', afflictionDamageBonusFlat: 3, damageTypeModifiers: {} },
    };

    const afflictionTarget = makeUnit();
    const afflictionDealt = applyDamageToUnit(afflictionTarget, 10, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        skillClasses: ['Affliction', 'Instant'],
    });
    assert.equal(afflictionDealt, 13);

    const physicalTarget = makeUnit();
    const physicalDealt = applyDamageToUnit(physicalTarget, 10, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        skillClasses: ['Physical', 'Instant'],
    });
    assert.equal(physicalDealt, 10, 'non-affliction damage should be unaffected');
});

test('computeEffectiveEnergyCost applies the weather cost modifier by move type', () => {
    const match = {
        turnNumber: 0,
        weather: { key: 'wildfire', costTypeModifiers: { Grass: -1, Electric: 1 } },
    };
    const actorState = { statuses: [] };

    const grassSkill = { id: 'grass-skill', classes: ['Grass'], energy: ['Random', 'Random'] };
    const grassCost = computeEffectiveEnergyCost({ skill: grassSkill, actorState, match });
    assert.equal(grassCost.requiredRandom, 1);

    const electricSkill = { id: 'electric-skill', classes: ['Electric'], energy: ['Random'] };
    const electricCost = computeEffectiveEnergyCost({ skill: electricSkill, actorState, match });
    assert.equal(electricCost.requiredRandom, 2);

    const noMatchSkill = { id: 'no-type-skill', classes: ['Instant'], energy: ['Random'] };
    const noMatchCost = computeEffectiveEnergyCost({ skill: noMatchSkill, actorState, match: null });
    assert.equal(noMatchCost.requiredRandom, 1, 'missing match should be a safe no-op');
});

test('tickWeatherForTurnEnd deals periodic damage, skips immune types, and decrements once per round', () => {
    const iceCharacter = { id: 'test-ice-mon', pokemonTypes: ['Ice'] };
    const normalCharacter = { id: 'test-normal-mon', pokemonTypes: ['Normal'] };
    const characters = [iceCharacter, normalCharacter];

    const iceUnit = makeUnit({ rosterIndex: 0 });
    const normalUnit = makeUnit({ rosterIndex: 1 });
    const match = {
        turnNumber: 0,
        board: { ash: [iceUnit], gary: [normalUnit] },
        weather: {
            key: 'snowstorm',
            roundsRemaining: 2,
            totalRounds: 2,
            lastDecrementTurnNumber: 0,
            periodicNonTypeDamage: { amount: 3, immuneTypes: ['Ice', 'Water'] },
        },
    };

    tickWeatherForTurnEnd({ match, characters });
    assert.equal(iceUnit.hp, 100);
    assert.equal(normalUnit.hp, 100, 'periodic damage should not resolve until a full round has passed');
    assert.ok(match.weather, 'weather should still be active after only one of two turns in the round');
    assert.equal(match.weather.roundsRemaining, 2);

    match.turnNumber = 1;
    tickWeatherForTurnEnd({ match, characters });
    assert.equal(iceUnit.hp, 100, 'Ice-type unit should be immune to Snowstorm chip damage');
    assert.equal(normalUnit.hp, 97, 'non-immune unit should take the periodic tick once the round completes');
    assert.ok(match.weather, 'weather persists after the first full round');
    assert.equal(match.weather.roundsRemaining, 1);

    match.turnNumber = 2;
    tickWeatherForTurnEnd({ match, characters });
    assert.equal(normalUnit.hp, 97, 'no additional tick until the second round completes');
    match.turnNumber = 3;
    tickWeatherForTurnEnd({ match, characters });
    assert.equal(normalUnit.hp, 94, 'the final round still deals its tick before the weather clears');
    assert.equal(match.weather, null, 'weather should clear once roundsRemaining reaches 0');
});

test('tickWeatherForTurnEnd resolves the random-target piercing tick deterministically', () => {
    const unitA = makeUnit();
    const unitB = makeUnit();
    const match = {
        turnNumber: 0,
        board: { ash: [unitA], gary: [unitB] },
        weather: {
            key: 'thunderstorm',
            roundsRemaining: 4,
            totalRounds: 4,
            lastDecrementTurnNumber: 0,
            periodicRandomTargetDamage: { amount: 10, piercing: true, paralyzeCooldowns: true },
        },
    };

    const originalRandom = Math.random;
    Math.random = () => 0.99;
    try {
        tickWeatherForTurnEnd({ match, characters: [] });
        assert.equal(unitA.hp, 100, 'no tick until a full round has passed');
        assert.equal(unitB.hp, 100);
        match.turnNumber = 1;
        tickWeatherForTurnEnd({ match, characters: [] });
    } finally {
        Math.random = originalRandom;
    }

    assert.equal(unitA.hp, 100, 'unit at index 0 should not be the picked target with Math.random() = 0.99');
    assert.equal(unitB.hp, 90);
    assert.ok(
        unitB.state.statuses.some((status) => status?.metadata?.freezeCooldowns),
        'the struck unit should have its cooldowns frozen for a turn'
    );
});

test('getWeatherViewerPayload returns a symmetric public shape or null', () => {
    assert.equal(getWeatherViewerPayload(null), null);
    const payload = getWeatherViewerPayload({
        key: 'wildfire',
        name: 'Wildfire',
        description: 'The sun blazes.',
        sourcePlayer: 'ash',
        sourceSlot: 1,
        roundsRemaining: 3,
        totalRounds: 4,
        excludeSkillId: 'moltres-sunny-day',
        damageTypeModifiers: { Fire: 5 },
    });
    assert.deepEqual(payload, {
        key: 'wildfire',
        name: 'Wildfire',
        description: 'The sun blazes.',
        sourcePlayer: 'ash',
        sourceSlot: 1,
        roundsRemaining: 3,
        totalRounds: 4,
    });
});

test('a set_weather skill effect resolved through resolvePendingTurnSkills populates match.weather', () => {
    const characters = [
        {
            id: 'test-weather-caster',
            skills: [
                {
                    id: 'test-summon-sunny-day',
                    classes: ['Fire', 'Instant'],
                    effects: [
                        {
                            type: 'set_weather',
                            scope: 'self',
                            weather: {
                                key: 'wildfire',
                                name: 'Wildfire',
                                rounds: 4,
                                damageTypeModifiers: { Fire: 5, Water: -5 },
                            },
                        },
                    ],
                },
            ],
        },
        { id: 'test-target', skills: [] },
    ];
    const match = {
        players: [{ username: 'ash' }, { username: 'gary' }],
        turnNumber: 0,
        weather: null,
        board: {
            ash: [makeUnit({ rosterIndex: 0 })],
            gary: [makeUnit({ rosterIndex: 1 })],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': { skillIndex: 0, targetSelection: [] },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { ash: 1, gary: 1 } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });

    assert.ok(match.weather);
    assert.equal(match.weather.key, 'wildfire');
    assert.equal(match.weather.sourcePlayer, 'ash');
    assert.equal(match.weather.sourceSlot, 0);
    assert.equal(match.weather.sourceSkillId, 'test-summon-sunny-day');
    assert.equal(match.weather.excludeSkillId, 'test-summon-sunny-day');
});

test('applyDamageToUnit applies Polluted Air\'s Poison bonus and excludes Smokescreen itself', () => {
    const match = {
        turnNumber: 0,
        weather: {
            key: 'pollutedair',
            excludeSkillId: 'koffing-smokescreen',
            damageTypeModifiers: { Poison: 5 },
            afflictionDamageBonusFlat: 0,
        },
    };

    const poisonMoveTarget = makeUnit();
    const poisonDealt = applyDamageToUnit(poisonMoveTarget, 10, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        sourceSkillId: 'koffing-sludge',
        skillClasses: ['Poison', 'Special'],
    });
    assert.equal(poisonDealt, 15, 'Poison move should gain the +5 Polluted Air bonus');

    const smokescreenTarget = makeUnit();
    const smokescreenDealt = applyDamageToUnit(smokescreenTarget, 10, {
        match,
        sourceUsername: 'ash',
        targetUsername: 'gary',
        sourceSkillId: 'koffing-smokescreen',
        skillClasses: ['Poison', 'Special'],
    });
    assert.equal(smokescreenDealt, 10, 'Smokescreen should not buff its own damage from the weather it summons');
});

test('tickWeatherForTurnEnd deals Polluted Air chip damage to non-Poison units only', () => {
    const poisonCharacter = { id: 'test-poison-mon', pokemonTypes: ['Poison'] };
    const normalCharacter = { id: 'test-normal-mon-2', pokemonTypes: ['Normal'] };
    const characters = [poisonCharacter, normalCharacter];

    const poisonUnit = makeUnit({ rosterIndex: 0 });
    const normalUnit = makeUnit({ rosterIndex: 1 });
    const match = {
        turnNumber: 1,
        board: { ash: [poisonUnit], gary: [normalUnit] },
        weather: {
            key: 'pollutedair',
            roundsRemaining: 4,
            totalRounds: 4,
            lastDecrementTurnNumber: 0,
            periodicNonTypeDamage: { amount: 5, immuneTypes: ['Poison'] },
        },
    };

    tickWeatherForTurnEnd({ match, characters });
    assert.equal(poisonUnit.hp, 100, 'Poison-type unit should be immune to Polluted Air chip damage');
    assert.equal(normalUnit.hp, 95, 'non-Poison unit should take the 5 affliction damage tick');
});

test('Polluted Air grants Poison type Pokemon bonus evasion against enemy skills', () => {
    const characters = [
        {
            id: 'test-attacker',
            skills: [
                {
                    id: 'test-tackle',
                    classes: ['Normal', 'Physical', 'Instant'],
                    target: 'single-enemy',
                    effects: [{ type: 'damage', scope: 'target', amount: 10 }],
                },
            ],
        },
        { id: 'test-poison-defender', pokemonTypes: ['Poison'], skills: [] },
        { id: 'test-normal-defender', pokemonTypes: ['Normal'], skills: [] },
    ];

    const makeWeatherMatch = (defenderRosterIndex) => ({
        players: [{ username: 'ash' }, { username: 'gary' }],
        turnNumber: 0,
        weather: {
            key: 'pollutedair',
            roundsRemaining: 4,
            totalRounds: 4,
            lastDecrementTurnNumber: 0,
            evasionBonusByType: { Poison: 100 },
        },
        board: {
            ash: [makeUnit({ rosterIndex: 0 })],
            gary: [makeUnit({ rosterIndex: defenderRosterIndex })],
        },
        chakraPools: {
            ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    '0': { skillIndex: 0, targetSelection: [{ username: 'gary', slot: 0 }] },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { ash: 1, gary: 1 } },
    });

    const poisonMatch = makeWeatherMatch(1);
    resolvePendingTurnSkills({ match: poisonMatch, actingUsername: 'ash', characters });
    assert.equal(poisonMatch.board.gary[0].hp, 100, 'a Poison type Pokemon should evade with a 100% weather-granted chance');

    const normalMatch = makeWeatherMatch(2);
    resolvePendingTurnSkills({ match: normalMatch, actingUsername: 'ash', characters });
    assert.equal(normalMatch.board.gary[0].hp, 90, 'a non-Poison Pokemon should not gain any evasion from Polluted Air');
});
