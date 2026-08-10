const test = require('node:test');
const assert = require('node:assert/strict');
const characters = require('../characters.js');

const {
    normalizeArenaMode,
    correctCanonicalNewsChangeText,
    applyRequiredCanonicalSkillCorrections,
    makeEmptyPendingTurn,
    sanitizeSavedTeamIndicesForArena,
    buildSanitizedSavedTeamIndicesByArena,
    serializeUserForClient,
    buildMatchPayloadForUser,
    buildMatchActionStatePayload,
    areQueuedSkillRequestsEquivalent,
    queueSkillForActorSlot,
    normalizeRecentLadderGames,
    countCurrentLadderSurrenderStreakByUser,
    isRepeatLadderSurrenderer,
    resolveExpiredTurnStartChoiceIfNeeded,
} = require('../server.js');

test('old Pidgey news text is served with the canonical 50 damage threshold', () => {
    const corrected = correctCanonicalNewsChangeText(
        { skillId: 'pidgey-passive-evolution-pidgeotto' },
        'Evolution triggers after Pidgey has dealt 100 total damage. At 100 damage, Pidgey evolves.'
    );
    assert.equal(
        corrected,
        'Evolution triggers after Pidgey has dealt 50 total damage. At 50 damage, Pidgey evolves.'
    );
    assert.equal(
        correctCanonicalNewsChangeText(
            { skillId: 'unrelated-skill' },
            'This unrelated skill mentions 100 total damage.'
        ),
        'This unrelated skill mentions 100 total damage.'
    );
});

test('a rejected queued-skill replacement does not mutate the live energy pool', () => {
    const rosterIndex = characters.findIndex((character) =>
        (character?.skills || []).some((skill) => (skill?.energy || []).length >= 2)
    );
    const skillIndex = characters[rosterIndex].skills.findIndex(
        (skill) => (skill?.energy || []).length >= 2
    );
    const originalPool = { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
    const match = {
        players: [{ username: 'EnergyTester' }, { username: 'Opponent' }],
        board: {
            EnergyTester: [{ alive: true, rosterIndex, state: { statuses: [], skillCooldowns: {} } }],
            Opponent: [],
        },
        chakraPools: { EnergyTester: { ...originalPool } },
        pendingTurns: {
            EnergyTester: {
                queuedByActorSlot: {
                    0: {
                        actorSlot: 0,
                        skillIndex: 0,
                        targetSelection: [],
                        reservedSpecific: { taijutsu: 1 },
                        requiredRandom: 0,
                    },
                },
                queueOrder: [0],
                unresolvedRandom: 0,
                randomAssignments: { ...originalPool },
                turnStartChoice: null,
            },
        },
    };

    assert.throws(
        () => queueSkillForActorSlot({
            match,
            username: 'EnergyTester',
            actorSlot: 0,
            skillIndex,
            targetSelection: [],
        }),
        /Not enough chakra/
    );
    assert.deepEqual(match.chakraPools.EnergyTester, originalPool);
    assert.equal(match.pendingTurns.EnergyTester.queuedByActorSlot[0].skillIndex, 0);
});

test('one energy cannot lock in skills for two different characters', () => {
    const rosterIndex = characters.findIndex((character) =>
        (character?.skills || []).some(
            (skill) =>
                Array.isArray(skill?.energy) &&
                skill.energy.length === 1 &&
                String(skill.energy[0]).toLowerCase() !== 'random' &&
                skill.target === 'self'
        )
    );
    const skillIndex = characters[rosterIndex].skills.findIndex(
        (skill) =>
            Array.isArray(skill?.energy) &&
            skill.energy.length === 1 &&
            String(skill.energy[0]).toLowerCase() !== 'random' &&
            skill.target === 'self'
    );
    const energyType = String(characters[rosterIndex].skills[skillIndex].energy[0]).toLowerCase();
    const pool = { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
    pool[energyType] = 1;
    const match = {
        players: [{ username: 'EnergyTester' }, { username: 'Opponent' }],
        board: {
            EnergyTester: [0, 1].map(() => ({
                alive: true,
                rosterIndex,
                state: { statuses: [], skillCooldowns: {} },
            })),
            Opponent: [],
        },
        chakraPools: { EnergyTester: pool },
        pendingTurns: { EnergyTester: makeEmptyPendingTurn() },
    };

    queueSkillForActorSlot({
        match,
        username: 'EnergyTester',
        actorSlot: 0,
        skillIndex,
        targetSelection: { username: 'EnergyTester', slot: 0 },
    });
    assert.throws(
        () => queueSkillForActorSlot({
            match,
            username: 'EnergyTester',
            actorSlot: 1,
            skillIndex,
            targetSelection: { username: 'EnergyTester', slot: 1 },
        }),
        /Not enough chakra/
    );
    assert.deepEqual(match.pendingTurns.EnergyTester.queueOrder, [0]);
    assert.equal(match.pendingTurns.EnergyTester.queuedByActorSlot[1], undefined);
});

test('required gameplay fixes survive stored character overrides without removing extra fields', () => {
    const canonical = [{
        characterId: 'magnemite',
        skills: [{ id: 'magneton-flash-cannon', skilldescription: 'Corrected text', cooldown: 1 }],
    }];
    const merged = [{
        characterId: 'magnemite',
        customOverride: true,
        skills: [{
            id: 'magneton-flash-cannon',
            skilldescription: 'Stale text',
            cooldown: 7,
            customSkillOverride: true,
        }],
    }];

    const [corrected] = applyRequiredCanonicalSkillCorrections(merged, canonical);

    assert.equal(corrected.customOverride, true);
    assert.equal(corrected.skills[0].customSkillOverride, true);
    assert.equal(corrected.skills[0].cooldown, 7);
    assert.equal(corrected.skills[0].skilldescription, 'Corrected text');
});

test('Bulbasaur Leech Seed corrections survive stored overrides without removing extra fields', () => {
    const canonicalBulbasaur = characters.find((character) => character.id === 'bulbasaur');
    assert.ok(canonicalBulbasaur);
    const staleBulbasaur = structuredClone(canonicalBulbasaur);
    staleBulbasaur.customStoredField = 'preserved';
    const staleLeechSeed = staleBulbasaur.skills.find(
        (skill) => skill.id === 'bulbasaur-leech-seed'
    );
    staleLeechSeed.skilldescription = 'Old 10 health for 3 turns.';
    staleLeechSeed.effects = [{
        type: 'apply_status',
        duration: 3,
        metadata: { turnStartDamage: 10 },
    }];
    staleLeechSeed.customSkillField = 'preserved';

    const [corrected] = applyRequiredCanonicalSkillCorrections(
        [staleBulbasaur],
        [canonicalBulbasaur]
    );
    const leechSeed = corrected.skills.find((skill) => skill.id === 'bulbasaur-leech-seed');
    const immediate = leechSeed.effects.find((effect) => effect.type === 'health_steal_damage');
    const ongoing = leechSeed.effects.find((effect) => effect.statusId === 'bulbasaur_leech_seed');
    assert.equal(corrected.customStoredField, 'preserved');
    assert.equal(leechSeed.customSkillField, 'preserved');
    assert.equal(immediate.amount, 20);
    assert.equal(ongoing.duration, 2);
    assert.equal(ongoing.metadata.turnStartDamage, 5);
});

test('Mewtwo combo corrections append to stored overrides instead of replacing them', () => {
    const canonical = [{
        characterId: 'mewtwo',
        skills: [{
            id: 'mewtwo-psychic',
            skilldescription: 'Canonical combo text',
            description: 'Canonical combo text',
            effects: [
                { type: 'damage', amount: 20, scope: 'target' },
                {
                    type: 'apply_status',
                    statusId: 'mewtwo_psychic_followup',
                    duration: 1,
                    scope: 'self',
                },
            ],
        }],
    }];
    const merged = [{
        characterId: 'mewtwo',
        skills: [{
            id: 'mewtwo-psychic',
            skilldescription: 'Stale combo text',
            description: 'Stale combo text',
            effects: [
                { type: 'damage', amount: 23, scope: 'target', customDamageOverride: true },
                { type: 'custom_mewtwo_effect', customEffectOverride: true },
            ],
        }],
    }];

    const [corrected] = applyRequiredCanonicalSkillCorrections(merged, canonical);
    const [psychic] = corrected.skills;
    assert.equal(psychic.skilldescription, 'Canonical combo text');
    assert.equal(psychic.effects.some((effect) => effect.customDamageOverride), true);
    assert.equal(psychic.effects.some((effect) => effect.customEffectOverride), true);
    assert.equal(
        psychic.effects.filter((effect) => effect.statusId === 'mewtwo_psychic_followup').length,
        1
    );
});

test('Pokemon Trainer balance values survive stored character overrides', () => {
    const canonicalTrainer = characters.find((character) => character.id === 'pokemon-trainer');
    assert.ok(canonicalTrainer);
    const staleTrainer = structuredClone(canonicalTrainer);
    Object.assign(
        staleTrainer.skills.find((skill) => skill.id === 'pokemon-trainer-potion'),
        { energy: ['Random', 'Random'], cooldown: 3, maxUses: 99 }
    );
    Object.assign(
        staleTrainer.skills.find((skill) => skill.id === 'pokemon-trainer-revive'),
        {
            target: 'single-ally',
            effects: [{ type: 'heal', amount: 50, scope: 'target' }],
        }
    );
    const staleBallCycle = staleTrainer.startStatuses.find(
        (status) => status.statusId === 'pokemon_trainer_ball_cycle'
    );
    staleBallCycle.metadata.customStoredField = true;
    staleBallCycle.metadata.turnStartApplyRandomSkillReplacementToOwner.options =
        [4, 3, 2, 1].map((weight) => ({ weight }));
    const [corrected] = applyRequiredCanonicalSkillCorrections(
        [staleTrainer],
        [canonicalTrainer]
    );
    const potion = corrected.skills.find((skill) => skill.id === 'pokemon-trainer-potion');
    const revive = corrected.skills.find((skill) => skill.id === 'pokemon-trainer-revive');
    const ballCycle = corrected.startStatuses.find(
        (status) => status.statusId === 'pokemon_trainer_ball_cycle'
    );
    assert.deepEqual(potion.energy, ['Random']);
    assert.equal(potion.cooldown, 1);
    assert.equal(potion.maxUses, 2);
    assert.equal(revive.target, 'dead-ally-first');
    assert.deepEqual(revive.effects.map((effect) => effect.type), ['revive']);
    assert.equal(ballCycle.metadata.customStoredField, true);
    assert.deepEqual(
        ballCycle.metadata.turnStartApplyRandomSkillReplacementToOwner.options.map(
            (option) => option.weight
        ),
        [8, 6, 5, 1]
    );
});

test('Machop rework survives stored character overrides without dropping extra fields', () => {
    const canonicalMachop = characters.find((character) => character.id === 'machop');
    assert.ok(canonicalMachop);
    const staleMachop = structuredClone(canonicalMachop);
    staleMachop.customStoredField = 'preserved';
    staleMachop.characterdeescription =
        'Old Machop evolves into Machoke after Counter successfully hurts an enemy.';
    const staleBrick = staleMachop.skills.find((skill) => skill.id === 'machop-brick-break');
    Object.assign(staleBrick, {
        skilldescription: 'Old Brick Break deals 35 damage.',
        energy: ['Ninjutsu', 'Random'],
        customSkillField: 'preserved',
        effects: [
            { type: 'destroy_destructible_defense', scope: 'target' },
            { type: 'damage', amount: 35, scope: 'target' },
        ],
    });
    const staleEvolution = staleMachop.skills.find(
        (skill) => skill.id === 'machop-passive-evolution-machoke'
    );
    staleEvolution.skilldescription = 'Old Counter evolution rule.';

    const [corrected] = applyRequiredCanonicalSkillCorrections(
        [staleMachop],
        [canonicalMachop]
    );
    const brick = corrected.skills.find((skill) => skill.id === 'machop-brick-break');
    const bulk = corrected.skills.find((skill) => skill.id === 'machop-bulk-up');
    const evolution = corrected.skills.find(
        (skill) => skill.id === 'machop-passive-evolution-machoke'
    );
    assert.equal(corrected.customStoredField, 'preserved');
    assert.equal(brick.customSkillField, 'preserved');
    assert.deepEqual(brick.energy, ['Ninjutsu']);
    assert.equal(brick.effects.find((effect) => effect.type === 'damage').amount, 20);
    assert.ok(brick.effects.find(
        (effect) => effect.type === 'destroy_destructible_defense'
    ).metadata.onDestroyedApplyStatusToOwner);
    assert.ok(bulk.effects.some(
        (effect) => effect.statusId === 'machop_bulk_up_evolution_tracker'
    ));
    assert.match(evolution.skilldescription, /Bulk Up twice/);
    assert.match(corrected.characterdeescription, /Bulk Up twice/);
});

test('batch evolution, Smokescreen, and Scyther changes survive stored overrides', () => {
    const staleCharacters = ['pidgey', 'gastly', 'koffing', 'scyther'].map((id) => {
        const canonical = characters.find((character) => character.id === id);
        assert.ok(canonical);
        const stale = structuredClone(canonical);
        stale.customStoredField = `${id}-preserved`;
        return stale;
    });
    const stalePidgey = staleCharacters.find((character) => character.id === 'pidgey');
    const pidgeyTracker = stalePidgey.startStatuses.find(
        (status) => status.statusId === 'pidgey_evolution_tracker'
    );
    pidgeyTracker.metadata.stackMax = 100;
    pidgeyTracker.metadata.applyStatusAtStack.value = 100;
    pidgeyTracker.metadata.customTrackerField = true;
    stalePidgey.skills.find(
        (skill) => skill.id === 'pidgey-passive-evolution-pidgeotto'
    ).skilldescription = 'Old 100 damage threshold.';
    const staleNestedPidgeyTracker = stalePidgey.skills
        .flatMap((skill) => skill.effects || [])
        .map((effect) => effect?.metadata?.onSuccessfulDamageApplyStatusToOwner?.metadata)
        .find((metadata) => metadata?.stackMetadataKey === 'pidgeyDamageDealt');
    staleNestedPidgeyTracker.stackMax = 100;
    staleNestedPidgeyTracker.tooltipTextTemplate = 'Old 100 damage tracker.';

    const staleGastly = staleCharacters.find((character) => character.id === 'gastly');
    const gastlyTracker = staleGastly.startStatuses.find(
        (status) => status.statusId === 'gastly_evolution_tracker'
    );
    gastlyTracker.metadata.stackMax = 50;
    gastlyTracker.metadata.applyStatusAtStack.value = 50;
    staleGastly.skills.find(
        (skill) => skill.id === 'gastly-passive-evolution-haunter'
    ).skilldescription = 'Old 50 HP threshold.';

    const staleKoffing = staleCharacters.find((character) => character.id === 'koffing');
    staleKoffing.skills.find(
        (skill) => skill.id === 'koffing-smokescreen'
    ).energy = ['Genjutsu'];
    staleKoffing.skills.find(
        (skill) => skill.id === 'koffing-weezing-smokescreen'
    ).energy = ['Genjutsu', 'Random'];

    const staleScyther = staleCharacters.find((character) => character.id === 'scyther');
    const staleDoubleTeam = staleScyther.skills.find(
        (skill) => skill.id === 'scyther-double-team'
    );
    staleDoubleTeam.cooldown = 4;
    staleDoubleTeam.effects[0].duration = 1;
    staleDoubleTeam.customSkillField = 'preserved';
    staleScyther.skills.find(
        (skill) => skill.id === 'scyther-fury-cutter'
    ).effects = [];

    const corrected = applyRequiredCanonicalSkillCorrections(
        staleCharacters,
        characters
    );
    const correctedPidgey = corrected.find((character) => character.id === 'pidgey');
    const correctedPidgeyTracker = correctedPidgey.startStatuses.find(
        (status) => status.statusId === 'pidgey_evolution_tracker'
    );
    assert.equal(correctedPidgeyTracker.metadata.stackMax, 50);
    assert.equal(correctedPidgeyTracker.metadata.applyStatusAtStack.value, 50);
    assert.equal(correctedPidgeyTracker.metadata.customTrackerField, true);
    const correctedNestedPidgeyTracker = correctedPidgey.skills
        .flatMap((skill) => skill.effects || [])
        .map((effect) => effect?.metadata?.onSuccessfulDamageApplyStatusToOwner?.metadata)
        .find((metadata) => metadata?.stackMetadataKey === 'pidgeyDamageDealt');
    assert.equal(correctedNestedPidgeyTracker.stackMax, 50);
    assert.match(correctedNestedPidgeyTracker.tooltipTextTemplate, /\/50.*At 50 damage/);

    const correctedGastlyTracker = corrected.find(
        (character) => character.id === 'gastly'
    ).startStatuses.find((status) => status.statusId === 'gastly_evolution_tracker');
    assert.equal(correctedGastlyTracker.metadata.stackMax, 35);
    assert.equal(correctedGastlyTracker.metadata.applyStatusAtStack.value, 35);

    const correctedKoffing = corrected.find((character) => character.id === 'koffing');
    assert.deepEqual(correctedKoffing.skills.find(
        (skill) => skill.id === 'koffing-smokescreen'
    ).energy, ['Random']);
    assert.deepEqual(correctedKoffing.skills.find(
        (skill) => skill.id === 'koffing-weezing-smokescreen'
    ).energy, ['Random', 'Random']);

    const correctedDoubleTeam = corrected.find(
        (character) => character.id === 'scyther'
    ).skills.find((skill) => skill.id === 'scyther-double-team');
    assert.equal(correctedDoubleTeam.customSkillField, 'preserved');
    assert.equal(correctedDoubleTeam.cooldown, 5);
    assert.equal(correctedDoubleTeam.effects[0].duration, 2);
    assert.equal(corrected.every(
        (character) => character.customStoredField === `${character.id}-preserved`
    ), true);
});

test('stored overrides cannot restore unused-skill cooldowns or Jolteon speedup metadata', () => {
    const canonical = characters
        .filter((character) => character.id === 'krabby' || character.id === 'jolteon')
        .map((character) => structuredClone(character));
    const merged = canonical.map((character) => structuredClone(character));
    const staleKrabby = merged.find((character) => character.id === 'krabby');
    const staleJolteon = merged.find((character) => character.id === 'jolteon');

    ['krabby-leer', 'kingler-leer'].forEach((skillId) => {
        const bubble = staleKrabby.skills.find((skill) => skill.id === skillId);
        const cooldownEffect = bubble.effects.find((effect) => effect.type === 'modify_cooldowns');
        bubble.skilldescription = 'Stale Bubble text';
        bubble.customSkillOverride = true;
        cooldownEffect.includeAllCharacterSkills = true;
        cooldownEffect.metadata.includeAllCharacterSkills = true;
    });
    ['jolteon-pin-missile', 'jolteon-thunder-fang'].forEach((skillId) => {
        const jolteonSkill = staleJolteon.skills.find((skill) => skill.id === skillId);
        const cooldownEffect = jolteonSkill.effects.find((effect) =>
            String(effect.statusId || '').includes('cooldown_increase')
        );
        jolteonSkill.skilldescription = 'Stale Jolteon text';
        jolteonSkill.customSkillOverride = true;
        cooldownEffect.metadata.ownerTurnEndExtraCooldownTicksAllSkills = 1;
        delete cooldownEffect.metadata.newSkillCooldownIncrease;
    });

    const corrected = applyRequiredCanonicalSkillCorrections(merged, canonical);
    const correctedKrabby = corrected.find((character) => character.id === 'krabby');
    const correctedJolteon = corrected.find((character) => character.id === 'jolteon');

    ['krabby-leer', 'kingler-leer'].forEach((skillId) => {
        const bubble = correctedKrabby.skills.find((skill) => skill.id === skillId);
        const cooldownEffect = bubble.effects.find((effect) => effect.type === 'modify_cooldowns');
        assert.equal(bubble.customSkillOverride, true);
        assert.match(bubble.skilldescription, /active cooldowns/);
        assert.equal(cooldownEffect.includeAllCharacterSkills, undefined);
        assert.equal(cooldownEffect.metadata.includeAllCharacterSkills, undefined);
    });
    ['jolteon-pin-missile', 'jolteon-thunder-fang'].forEach((skillId) => {
        const jolteonSkill = correctedJolteon.skills.find((skill) => skill.id === skillId);
        const cooldownEffect = jolteonSkill.effects.find((effect) =>
            String(effect.statusId || '').includes('cooldown_increase')
        );
        assert.equal(jolteonSkill.customSkillOverride, true);
        assert.match(jolteonSkill.skilldescription, /new skills/i);
        assert.equal(cooldownEffect.metadata.newSkillCooldownIncrease, 1);
        assert.equal(cooldownEffect.metadata.ownerTurnEndExtraCooldownTicksAllSkills, undefined);
    });
});

const firstComicRosterIndex = characters.findIndex(
    (character) => normalizeArenaMode(character?.arena || character?.universe) === 'comic'
);
const firstPokemonRosterIndex = characters.findIndex(
    (character) => normalizeArenaMode(character?.arena || character?.universe) === 'pokemon'
);

test('normalizeArenaMode keeps pokemon and falls back invalid values to comic', () => {
    assert.equal(normalizeArenaMode('pokemon'), 'pokemon');
    assert.equal(normalizeArenaMode('comic'), 'comic');
    assert.equal(normalizeArenaMode(' naruto '), 'comic');
    assert.equal(normalizeArenaMode(''), 'comic');
});

test('sanitizeSavedTeamIndicesForArena strips cross-arena, duplicate, and invalid slots', () => {
    assert.ok(firstComicRosterIndex >= 0);
    assert.ok(firstPokemonRosterIndex >= 0);

    assert.deepEqual(
        sanitizeSavedTeamIndicesForArena(
            [
                firstPokemonRosterIndex,
                firstComicRosterIndex,
                firstComicRosterIndex,
                firstPokemonRosterIndex + 1,
                -1,
            ],
            'comic'
        ),
        [firstComicRosterIndex]
    );

    assert.deepEqual(
        sanitizeSavedTeamIndicesForArena(
            [firstComicRosterIndex, firstPokemonRosterIndex, firstPokemonRosterIndex, 9999],
            'pokemon'
        ),
        [firstPokemonRosterIndex]
    );
});

test('serializeUserForClient keeps comic and pokemon saved teams isolated', () => {
    assert.ok(firstComicRosterIndex >= 0);
    assert.ok(firstPokemonRosterIndex >= 0);

    const serializedUser = serializeUserForClient({
        username: 'ArenaTester',
        savedTeamIndices: [firstPokemonRosterIndex, firstComicRosterIndex],
        savedTeamIndicesByArena: {
            comic: [firstPokemonRosterIndex, firstComicRosterIndex],
            pokemon: [firstComicRosterIndex, firstPokemonRosterIndex],
        },
        profile: {},
    });

    assert.deepEqual(serializedUser.savedTeamIndices, [firstComicRosterIndex]);
    assert.deepEqual(serializedUser.savedTeamIndicesByArena, {
        comic: [firstComicRosterIndex],
        pokemon: [firstPokemonRosterIndex],
    });
});

test('buildSanitizedSavedTeamIndicesByArena falls back legacy comic teams without leaking into pokemon', () => {
    assert.ok(firstComicRosterIndex >= 0);
    assert.ok(firstPokemonRosterIndex >= 0);

    const savedTeams = buildSanitizedSavedTeamIndicesByArena({
        savedTeamIndices: [firstComicRosterIndex, firstPokemonRosterIndex],
    });

    assert.deepEqual(savedTeams, {
        comic: [firstComicRosterIndex],
        pokemon: [],
    });
});

test('buildMatchPayloadForUser preserves pokemon arena and hides opponent cooldowns', () => {
    const pendingTurn = makeEmptyPendingTurn();
    pendingTurn.queueOrder = [0];
    pendingTurn.queuedByActorSlot = {
        '0': {
            actorSlot: 0,
            skillIndex: 1,
            targetSelection: [{ username: 'gary', slot: 0 }],
        },
    };

    const match = {
        matchId: 'match-test-1',
        mode: 'quick',
        arena: 'pokemon',
        status: 'active',
        currentTurn: 'ash',
        turnOrder: ['ash', 'gary'],
        turnStartedAt: new Date('2026-06-28T10:00:00.000Z'),
        turnExpiresAt: new Date('2026-06-28T10:01:00.000Z'),
        players: [
            {
                username: 'ash',
                team: [1, 2, 3],
                profile: {
                    avatarUrl: 'ash.png',
                    arenas: {
                        pokemon: {
                            ladder: { rank: 'Trainer', level: 8 },
                        },
                    },
                },
            },
            {
                username: 'gary',
                team: [4, 5, 6],
                profile: {
                    avatarUrl: 'gary.png',
                    arenas: {
                        pokemon: {
                            ladder: { rank: 'Rival', level: 9 },
                        },
                    },
                },
            },
        ],
        board: {
            ash: [
                {
                    slot: 0,
                    rosterIndex: 1,
                    alive: true,
                    hp: 85,
                    state: {
                        statuses: [],
                        cooldowns: { 'skill-a': 2 },
                        skillUses: { 'skill-a': 1 },
                    },
                },
            ],
            gary: [
                {
                    slot: 0,
                    rosterIndex: 4,
                    alive: true,
                    hp: 90,
                    state: {
                        statuses: [],
                        cooldowns: { 'secret-skill': 3 },
                        skillUses: { 'secret-skill': 1 },
                    },
                },
            ],
        },
        chakraPools: {
            ash: { taijutsu: 1, ninjutsu: 2, bloodline: 0, genjutsu: 1 },
            gary: { taijutsu: 9, ninjutsu: 9, bloodline: 9, genjutsu: 9 },
        },
        economy: {
            lastChakraGain: {
                ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
                gary: { taijutsu: 1, ninjutsu: 1, bloodline: 1, genjutsu: 1 },
            },
        },
        pendingTurns: {
            ash: pendingTurn,
            gary: makeEmptyPendingTurn(),
        },
        ladderResults: null,
        backgroundOverride: 'assets/images/PokemonArena/newingamebgPA.png',
    };

    const payload = buildMatchPayloadForUser(match, 'ash');

    assert.equal(payload.arena, 'pokemon');
    assert.equal(payload.player.username, 'ash');
    assert.equal(payload.opponent.username, 'gary');
    assert.deepEqual(payload.chakraPools, {
        ash: { taijutsu: 1, ninjutsu: 2, bloodline: 0, genjutsu: 1 },
    });
    assert.deepEqual(payload.lastChakraGain, {
        ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
    });
    assert.deepEqual(payload.pendingTurn.queueOrder, [0]);
    assert.deepEqual(payload.board.ash[0].state.cooldowns, { 'skill-a': 2 });
    assert.equal(payload.board.gary[0].state.cooldowns, undefined);
    assert.equal(payload.backgroundOverride, 'assets/images/PokemonArena/newbattlepic/1783150082785.png');
});

test('buildMatchPayloadForUser preserves status icon URLs for client passive icons', () => {
    const statusIconUrl = 'assets/images/ghostridermotorcycle.png';
    const match = {
        matchId: 'match-status-icon-url',
        mode: 'quick',
        arena: 'comic',
        status: 'active',
        currentTurn: 'ash',
        players: [
            { username: 'ash', team: [firstComicRosterIndex], profile: {} },
            { username: 'gary', team: [firstComicRosterIndex], profile: {} },
        ],
        board: {
            ash: [
                {
                    slot: 0,
                    rosterIndex: firstComicRosterIndex,
                    alive: true,
                    hp: 100,
                    state: {
                        statuses: [
                            {
                                id: 'comic_passive_status_icon',
                                remainingTurns: 99,
                                sourceSkillId: null,
                                metadata: {
                                    statusIconUrl,
                                    tooltipText: 'Passive tracker is active.',
                                },
                            },
                        ],
                        cooldowns: {},
                        skillUses: {},
                    },
                },
            ],
            gary: [
                {
                    slot: 0,
                    rosterIndex: firstComicRosterIndex,
                    alive: true,
                    hp: 100,
                    state: { statuses: [] },
                },
            ],
        },
        pendingTurns: {
            ash: makeEmptyPendingTurn(),
            gary: makeEmptyPendingTurn(),
        },
    };

    const payload = buildMatchPayloadForUser(match, 'ash');

    assert.equal(
        payload.board.ash[0].state.statuses[0].metadata.statusIconUrl,
        statusIconUrl
    );
});

test('buildMatchPayloadForUser rebuilds incomplete match teams from board state', () => {
    assert.ok(firstPokemonRosterIndex >= 0);
    const secondPokemonRosterIndex = characters.findIndex(
        (character, index) =>
            index !== firstPokemonRosterIndex &&
            normalizeArenaMode(character?.arena || character?.universe) === 'pokemon'
    );
    const thirdPokemonRosterIndex = characters.findIndex(
        (character, index) =>
            index !== firstPokemonRosterIndex &&
            index !== secondPokemonRosterIndex &&
            normalizeArenaMode(character?.arena || character?.universe) === 'pokemon'
    );
    assert.ok(secondPokemonRosterIndex >= 0);
    assert.ok(thirdPokemonRosterIndex >= 0);

    const payload = buildMatchPayloadForUser(
        {
            matchId: 'match-incomplete-team',
            arena: 'pokemon',
            mode: 'quick',
            status: 'active',
            currentTurn: 'ash',
            players: [
                {
                    username: 'ash',
                    team: [firstPokemonRosterIndex],
                    profile: {},
                },
                {
                    username: 'gary',
                    team: [firstPokemonRosterIndex],
                    profile: {},
                },
            ],
            board: {
                ash: [
                    { slot: 0, rosterIndex: firstPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 1, rosterIndex: secondPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 2, rosterIndex: thirdPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                ],
                gary: [
                    { slot: 0, rosterIndex: thirdPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 1, rosterIndex: secondPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 2, rosterIndex: firstPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                ],
            },
            pendingTurns: {
                ash: makeEmptyPendingTurn(),
                gary: makeEmptyPendingTurn(),
            },
        },
        'ash'
    );

    assert.deepEqual(payload.player.team, [
        firstPokemonRosterIndex,
        secondPokemonRosterIndex,
        thirdPokemonRosterIndex,
    ]);
    assert.deepEqual(payload.opponent.team, [
        thirdPokemonRosterIndex,
        secondPokemonRosterIndex,
        firstPokemonRosterIndex,
    ]);
});

test('buildMatchPayloadForUser resolves viewer-scoped energy with username case differences', () => {
    const match = {
        matchId: 'match-test-case-scope',
        mode: 'quick',
        arena: 'pokemon',
        status: 'active',
        currentTurn: 'ash',
        players: [
            { username: 'ash', team: [1, 2, 3], profile: {} },
            { username: 'gary', team: [4, 5, 6], profile: {} },
        ],
        board: {
            ash: [{ slot: 0, rosterIndex: 1, alive: true, hp: 100, state: { statuses: [] } }],
            gary: [{ slot: 0, rosterIndex: 4, alive: true, hp: 100, state: { statuses: [] } }],
        },
        chakraPools: {
            ash: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 3 },
        },
        economy: {
            lastChakraGain: {
                ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
            },
        },
        pendingTurns: {
            ash: makeEmptyPendingTurn(),
            gary: makeEmptyPendingTurn(),
        },
        ladderResults: {
            ash: { ladderPointsDelta: 18, rating: 1210, rewardSuppressedReason: '' },
        },
    };

    const payload = buildMatchPayloadForUser(match, 'Ash');

    assert.equal(payload.player.username, 'ash');
    assert.deepEqual(payload.chakraPools, {
        Ash: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 3 },
    });
    assert.deepEqual(payload.lastChakraGain, {
        Ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
    });
    assert.deepEqual(payload.ladderResult, {
        ladderPointsDelta: 18,
        rating: 1210,
        rewardSuppressedReason: '',
    });
});

test('normalizeRecentLadderGames preserves surrender metadata for repeat-surrender checks', () => {
    const normalized = normalizeRecentLadderGames([
        {
            playedAt: new Date(),
            opponentUsername: 'Gary',
            winnerUsername: 'Gary',
            expDelta: 0,
            clanExpDelta: 0,
            unlockPointDelta: 0,
            surrenderedBy: 'Ash',
            endReason: 'SURRENDER',
            rewardSuppressedReason: 'self-surrender',
        },
    ]);

    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].surrenderedBy, 'Ash');
    assert.equal(normalized[0].endReason, 'surrender');
    assert.equal(normalized[0].rewardSuppressedReason, 'self-surrender');
    assert.equal(normalized[0].unlockPointDelta, 0);
});

test('repeat surrenderer helpers require three ladder surrenders in a row', () => {
    const recentLadderGames = normalizeRecentLadderGames([
        {
            playedAt: new Date(),
            opponentUsername: 'Gary',
            winnerUsername: 'Gary',
            surrenderedBy: 'Ash',
            endReason: 'surrender',
        },
        {
            playedAt: new Date(Date.now() - 1000),
            opponentUsername: 'Brock',
            winnerUsername: 'Brock',
            surrenderedBy: 'Ash',
            endReason: 'surrender',
        },
        {
            playedAt: new Date(Date.now() - 2000),
            opponentUsername: 'Misty',
            winnerUsername: 'Misty',
            surrenderedBy: 'Ash',
            endReason: 'surrender',
        },
        {
            playedAt: new Date(Date.now() - 3000),
            opponentUsername: 'Lt. Surge',
            winnerUsername: 'Ash',
            surrenderedBy: '',
            endReason: 'elimination',
        },
    ]);

    assert.equal(
        countCurrentLadderSurrenderStreakByUser({
            username: 'ash',
            recentLadderGames,
        }),
        3
    );
    assert.equal(
        isRepeatLadderSurrenderer({
            username: 'ash',
            recentLadderGames,
        }),
        true
    );
    assert.equal(
        isRepeatLadderSurrenderer({
            username: 'gary',
            recentLadderGames,
        }),
        false
    );
});
test('buildMatchActionStatePayload carries current safe state for stale actions', () => {
    const match = {
        matchId: 'match-test-2',
        mode: 'quick',
        arena: 'pokemon',
        status: 'ended',
        winner: 'misty',
        endReason: 'timeout',
        currentTurn: null,
        players: [
            { username: 'misty', team: [1, 2, 3], profile: {} },
            { username: 'brock', team: [4, 5, 6], profile: {} },
        ],
        board: {
            misty: [{ slot: 0, rosterIndex: 1, alive: true, hp: 100, state: { statuses: [] } }],
            brock: [{ slot: 0, rosterIndex: 4, alive: false, hp: 0, state: { statuses: [] } }],
        },
        chakraPools: {
            misty: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
            brock: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
        },
        pendingTurns: {
            misty: makeEmptyPendingTurn(),
            brock: makeEmptyPendingTurn(),
        },
    };

    const payload = buildMatchActionStatePayload(match, 'misty', {
        actionRejected: 'match-ended',
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.staleAction, true);
    assert.equal(payload.actionRejected, 'match-ended');
    assert.equal(payload.status, 'ended');
    assert.equal(payload.arena, 'pokemon');
    assert.equal(payload.player.username, 'misty');
    assert.equal(payload.opponent.username, 'brock');
    assert.deepEqual(payload.chakraPools, {
        misty: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
    });
});

test('areQueuedSkillRequestsEquivalent matches repeated queue submissions', () => {
    const existing = {
        actorSlot: 1,
        skillIndex: 2,
        classChoice: 'energy',
        absorptionChoice: 'negative',
        targetSelection: [{ username: 'Gary ', slot: '1' }, { username: 'ash', slot: 0 }],
    };

    assert.equal(
        areQueuedSkillRequestsEquivalent(existing, {
            skillIndex: 2,
            classChoice: ' Energy ',
            absorptionChoice: 'NEGATIVE',
            targetSelection: [{ username: 'ash', slot: 0 }, { username: 'gary', slot: 1 }],
        }),
        true
    );

    assert.equal(
        areQueuedSkillRequestsEquivalent(existing, {
            skillIndex: 2,
            classChoice: 'physical',
            absorptionChoice: 'negative',
            targetSelection: [{ username: 'ash', slot: 0 }, { username: 'gary', slot: 1 }],
        }),
        false
    );
});

test('resolveExpiredTurnStartChoiceIfNeeded auto-picks the default prompt option', () => {
    const pendingTurn = makeEmptyPendingTurn();
    pendingTurn.turnStartChoice = {
        actorSlot: 0,
        sourceSkillId: 'saint-walker-radiant-hope',
        sourceUsername: 'ash',
        sourceSlot: 0,
        sourceStatusId: 'saint_walker_radiant_hope_active',
        promptText: 'Select 1 Radiant Hope effect.',
        options: [
            {
                key: 'defense',
                label: 'Grant one ally 20 permanent destructible defense',
                targetStrategy: 'alive-ally-lowest-hp',
                effect: {
                    type: 'apply_status',
                    statusId: 'saint_walker_radiant_hope_defense_option',
                    duration: 99,
                    metadata: {
                        destructibleDefensePoints: 20,
                        infiniteDuration: true,
                        tooltipText:
                            'This character has 20 points of permanent destructible defense from Radiant Hope.',
                    },
                },
            },
        ],
        maxUses: 1,
        usesUsed: 0,
    };

    const match = {
        matchId: 'match-test-turn-start-choice-timeout',
        mode: 'quick',
        arena: 'comic',
        status: 'active',
        currentTurn: 'ash',
        players: [
            { username: 'ash', team: [1, 2, 3], aliveCount: 1, profile: {} },
            { username: 'gary', team: [4, 5, 6], aliveCount: 1, profile: {} },
        ],
        board: {
            ash: [
                {
                    slot: 0,
                    rosterIndex: 1,
                    alive: true,
                    hp: 40,
                    state: {
                        statuses: [
                            {
                                id: 'saint_walker_radiant_hope_active',
                                remainingTurns: 1,
                                metadata: {
                                    turnStartChoiceQueued: true,
                                    turnStartChoiceMaxUses: 1,
                                    turnStartChoiceUsesUsed: 0,
                                },
                            },
                        ],
                    },
                },
            ],
            gary: [
                {
                    slot: 0,
                    rosterIndex: 4,
                    alive: true,
                    hp: 100,
                    state: { statuses: [] },
                },
            ],
        },
        pendingTurns: {
            ash: pendingTurn,
            gary: makeEmptyPendingTurn(),
        },
    };

    const resolved = resolveExpiredTurnStartChoiceIfNeeded({
        match,
        username: 'ash',
    });

    assert.equal(resolved, true);
    assert.equal(match.pendingTurns.ash.turnStartChoice, null);
    assert.equal(match.board.ash[0].state.statuses[0].metadata.turnStartChoiceQueued, false);
    assert.equal(match.board.ash[0].state.statuses[0].metadata.turnStartChoiceUsesUsed, 1);
    assert.match(
        match.board.ash[0].state.statuses[1].id,
        /saint_walker_radiant_hope_defense_option/
    );
});
