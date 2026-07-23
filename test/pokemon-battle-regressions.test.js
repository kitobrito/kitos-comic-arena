const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const {
    buildInitialBoard,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');
const {
    applyRequiredCanonicalSkillCorrections,
    countActiveBattleUnits,
} = require('../server');

const makeMatch = (players, roster = characters) => ({
    players,
    board: buildInitialBoard(players, roster),
    chakraPools: Object.fromEntries(
        players.map(({ username }) => [username, { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 }])
    ),
    pendingTurns: {},
    pendingActions: [],
    pendingQueuedEffects: [],
    economy: { turnCounts: Object.fromEntries(players.map(({ username }) => [username, 1])) },
});

test('a permanently banished last unit no longer counts as alive', () => {
    const banished = {
        alive: true,
        hp: 10,
        state: {
            statuses: [{ id: 'master_ball_banish', remainingTurns: 999, metadata: { banished: true } }],
        },
    };

    assert.equal(countActiveBattleUnits([banished]), 0);
    assert.equal(countActiveBattleUnits([{ alive: true, hp: 100 }, banished]), 1);
});

test('Sand-Attack redirects the blinded caster, not attacks aimed at the blinded target', () => {
    const roster = [
        {
            id: 'attacker',
            skills: [{
                id: 'attack',
                target: 'single-enemy',
                classes: ['Physical', 'Instant'],
                energy: [],
                effects: [{ type: 'damage', amount: 10, scope: 'target' }],
            }],
        },
        { id: 'target', skills: [] },
        { id: 'other-target', skills: [] },
    ];
    const players = [{ username: 'Ash', team: [0] }, { username: 'Gary', team: [1, 2] }];
    const match = makeMatch(players, roster);
    match.board.Gary[0].state.statuses.push({
        id: 'pidgey_sand_attack_evasion',
        remainingTurns: 2,
        metadata: { harmful: true, fullBlind: true },
    });
    match.pendingTurns.Ash = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: { skillIndex: 0, targetSelection: [{ username: 'Gary', slot: 0 }] },
        },
    };

    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
        resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters: roster });
    } finally {
        Math.random = originalRandom;
    }

    assert.equal(match.board.Ash[0].hp, 100);
    assert.equal(match.board.Gary[0].hp, 90);
});

test('Abra Teleport protects Abra and the selected ally', () => {
    const abraIndex = characters.findIndex((character) => character.id === 'abra');
    const allyIndex = characters.findIndex((character) => character.id === 'pikachu');
    const enemyIndex = characters.findIndex((character) => character.id === 'charmander');
    const teleportIndex = characters[abraIndex].skills.findIndex((skill) => skill.id === 'abra-teleport');
    const players = [{ username: 'Ash', team: [abraIndex, allyIndex] }, { username: 'Gary', team: [enemyIndex] }];
    const match = makeMatch(players);
    match.pendingTurns.Ash = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: { skillIndex: teleportIndex, targetSelection: [{ username: 'Ash', slot: 1 }] },
        },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters });

    assert.ok(match.board.Ash[0].state.statuses.some((status) => status.id === 'abra_teleport_cover'));
    assert.ok(match.board.Ash[1].state.statuses.some((status) => status.id === 'abra_teleport_cover'));
});

test("Blissey's Emergency Life Support revives its selected defeated ally with 50 HP", () => {
    const chanseyIndex = characters.findIndex((character) => character.id === 'chansey');
    const allyIndex = characters.findIndex((character) => character.id === 'pikachu');
    const enemyIndex = characters.findIndex((character) => character.id === 'charmander');
    const emergencyLifeSupportIndex = characters[chanseyIndex].skills.findIndex(
        (skill) => skill.id === 'chansey-emergency-life-support'
    );
    const evolutionStatus = characters[chanseyIndex].startStatuses
        .find((status) => status.statusId === 'chansey_evolution_tracker')
        .metadata.applyStatusAtStack;
    const players = [
        { username: 'Ash', team: [chanseyIndex, allyIndex] },
        { username: 'Gary', team: [enemyIndex] },
    ];
    const match = makeMatch(players);
    match.board.Ash[0].state.statuses.push({
        id: evolutionStatus.statusId,
        remainingTurns: evolutionStatus.duration,
        metadata: structuredClone(evolutionStatus.metadata),
    });
    match.board.Ash[1].alive = false;
    match.board.Ash[1].hp = 0;
    match.pendingTurns.Ash = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: {
                skillIndex: emergencyLifeSupportIndex,
                targetSelection: [{ username: 'Ash', slot: 1 }],
            },
        },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters });

    assert.equal(match.board.Ash[1].alive, true);
    assert.equal(match.board.Ash[1].hp, 50);
});

test('Flareon ongoing effects end when Flareon is defeated', () => {
    const flareonIndex = characters.findIndex((character) => character.id === 'flareon');
    const enemyIndex = characters.findIndex((character) => character.id === 'pikachu');
    const players = [{ username: 'Ash', team: [flareonIndex] }, { username: 'Gary', team: [enemyIndex] }];
    const match = makeMatch(players);
    match.board.Ash[0].alive = false;
    match.board.Ash[0].hp = 0;
    match.board.Gary[0].state.statuses.push({
        id: 'flareon_fire_spin_burn',
        remainingTurns: 3,
        sourceSkillId: 'flareon-fire-spin',
        sourceUsername: 'Ash',
        sourceSlot: 0,
        metadata: { harmful: true, endIfSourceDies: true, turnEndDamage: 15 },
    });

    tickStatusesForTurnEnd({ match, endingUsername: 'Gary' });

    assert.ok(!match.board.Gary[0].state.statuses.some((status) => status.id === 'flareon_fire_spin_burn'));
    const flareon = characters[flareonIndex];
    flareon.skills
        .flatMap((skill) => skill.effects || [])
        .filter((effect) => String(effect.statusId || '').startsWith('flareon_') && effect.scope !== 'self')
        .forEach((effect) => assert.equal(effect.metadata.endIfSourceDies, true, effect.statusId));
});

test('stored Abra overrides keep custom fields while canonical two-target Teleport survives', () => {
    const canonicalAbra = characters.find((character) => character.id === 'abra');
    const staleAbra = {
        characterId: 'abra',
        customCharacterOverride: true,
        skills: [{
            id: 'abra-teleport',
            target: 'self-or-single-ally',
            customSkillOverride: true,
            effects: [{
                type: 'apply_status',
                statusId: 'abra_teleport_cover',
                duration: 1,
                scope: 'self-or-single-ally',
                metadata: { customStatusOverride: true },
            }],
        }],
    };

    const [corrected] = applyRequiredCanonicalSkillCorrections([staleAbra], [canonicalAbra]);
    const teleport = corrected.skills[0];

    assert.equal(corrected.customCharacterOverride, true);
    assert.equal(teleport.customSkillOverride, true);
    assert.equal(teleport.target, 'single-ally');
    assert.deepEqual(teleport.effects.map((effect) => effect.scope), ['self', 'target']);
    teleport.effects.forEach((effect) => assert.equal(effect.metadata.customStatusOverride, true));
});

test('Zubat and Golbat Leech Life steal their increased base HP amounts', () => {
    const zubatIndex = characters.findIndex((character) => character.id === 'zubat');
    const leechLifeIndex = characters[zubatIndex].skills.findIndex(
        (skill) => skill.id === 'zubat-leech-life'
    );
    const roster = [characters[zubatIndex], {
        id: 'neutral-pokemon-target',
        arena: 'pokemon',
        universe: 'pokemon',
        pokemonTypes: ['Normal'],
        skills: [],
    }];
    const players = [{ username: 'Ash', team: [0] }, { username: 'Gary', team: [1] }];

    const useLeechLife = (evolved) => {
        const match = makeMatch(players, roster);
        match.board.Ash[0].hp = 40;
        if (evolved) {
            match.board.Ash[0].state.statuses.push({
                id: 'zubat_golbat_evolution',
                remainingTurns: 99,
                sourceSkillId: 'zubat-passive-evolution-golbat',
                metadata: {
                    infiniteDuration: true,
                    skillReplacements: { 'zubat-leech-life': 'golbat-leech-life' },
                },
            });
        }
        match.pendingTurns.Ash = {
            queueOrder: ['0'],
            queuedByActorSlot: {
                0: { skillIndex: leechLifeIndex, targetSelection: [{ username: 'Gary', slot: 0 }] },
            },
        };

        resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters: roster });
        return match;
    };

    const zubatMatch = useLeechLife(false);
    assert.equal(zubatMatch.board.Gary[0].hp, 75);
    assert.equal(zubatMatch.board.Ash[0].hp, 65);

    const golbatMatch = useLeechLife(true);
    assert.equal(golbatMatch.board.Gary[0].hp, 70);
    assert.equal(golbatMatch.board.Ash[0].hp, 70);
});

test('stored Zubat overrides keep custom effects while canonical Leech Life base steals survive', () => {
    const canonicalZubat = characters.find((character) => character.id === 'zubat');
    const staleZubat = {
        characterId: 'zubat',
        customCharacterOverride: true,
        skills: ['zubat-leech-life', 'golbat-leech-life'].map((id) => ({
            id,
            skilldescription: 'Stale description',
            customSkillOverride: true,
            effects: [{
                type: 'health_steal_damage',
                amount: 1,
                scope: 'target',
                metadata: { customEffectOverride: true },
            }, {
                type: 'custom_override_effect',
                amount: 99,
            }],
        })),
    };

    const [corrected] = applyRequiredCanonicalSkillCorrections([staleZubat], [canonicalZubat]);

    assert.equal(corrected.customCharacterOverride, true);
    assert.deepEqual(
        corrected.skills.map((skill) => skill.effects[0].amount),
        [25, 30]
    );
    corrected.skills.forEach((skill) => {
        assert.equal(skill.customSkillOverride, true);
        assert.equal(skill.effects[0].metadata.customEffectOverride, true);
        assert.equal(skill.effects[1].type, 'custom_override_effect');
        assert.notEqual(skill.skilldescription, 'Stale description');
    });
});

test('battle polish outlines black energy and signs without routine queue-sync popups', () => {
    const root = path.resolve(__dirname, '..');
    const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

    assert.match(styles, /\.chakra-box\.black\s*\{[\s\S]*?border:\s*1px solid #fff;/);
    assert.match(styles, /\.minus-button,\s*\.plus-button\s*\{[\s\S]*?-webkit-text-stroke:\s*1px #fff;/);
    assert.match(styles, /\.exchange_symbol\s*\{[\s\S]*?-webkit-text-stroke:\s*1px #fff;/);
    assert.doesNotMatch(script, /queued-random-energy-reminder/);
    assert.doesNotMatch(script, /match state changed while that skill was being queued/);
    assert.match(ingame, /scripts\/script\.js\?v=pokemon-battle-polish-v2/);
});
