const assert = require('node:assert/strict');
const test = require('node:test');

const characters = require('../characters');
const { buildInitialBoard, resolvePendingTurnSkills } = require('../battleLogic');

const drowzeeIndex = characters.findIndex((entry) => entry.id === 'drowzee');
const abraIndex = characters.findIndex((entry) => entry.id === 'abra');

const makeMatch = () => {
    const players = [
        { username: 'Drowzee', team: [drowzeeIndex] },
        { username: 'Enemy', team: [abraIndex] },
    ];
    return {
        players,
        board: buildInitialBoard(players, characters),
        chakraPools: {
            Drowzee: { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 },
            Enemy: { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 },
        },
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { Drowzee: 1, Enemy: 1 } },
    };
};

const queueSkill = (match, username, skillId, targetUsername) => {
    const character = characters[match.players.find((p) => p.username === username).team[0]];
    const skillIndex = character.skills.findIndex((entry) => entry.id === skillId);
    assert.ok(skillIndex >= 0, `${skillId} not found for ${username}`);
    match.pendingTurns[username] = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: { skillIndex, targetSelection: [{ username: targetUsername, slot: 0 }] },
        },
    };
};

const enemyState = (match) => match.board.Enemy[0].state;
const hasHypnosis = (match) =>
    enemyState(match).statuses.some(
        (status) => status?.id === 'drowzee_hypnosis_active' && (Number(status?.remainingTurns) || 0) > 0
    );

test('Drowzee Hypnosis fully stuns the enemy for their next turn', () => {
    const match = makeMatch();
    queueSkill(match, 'Drowzee', 'drowzee-hypnosis', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    assert.ok(hasHypnosis(match), 'Hypnosis should be active immediately after cast');

    // Enemy attempts to act while stunned - queue a skill and resolve their turn;
    // cannotUseSkills should block it from actually executing.
    queueSkill(match, 'Enemy', 'abra-psychic', 'Drowzee');
    resolvePendingTurnSkills({ match, actingUsername: 'Enemy', characters });
    const drowzeeState = match.board.Drowzee[0].state;
    assert.equal(
        drowzeeState.statuses.some((status) => status?.harmful && status?.sourceUsername === 'Enemy'),
        false,
        'Stunned enemy should not have been able to land a skill'
    );
});

test('Hypnosis survives through to Drowzee\'s next turn so Nightmare can chain off it', () => {
    const match = makeMatch();
    queueSkill(match, 'Drowzee', 'drowzee-hypnosis', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    assert.ok(hasHypnosis(match), 'Hypnosis active after cast');

    // Enemy's turn passes (stunned, no meaningful action possible).
    resolvePendingTurnSkills({ match, actingUsername: 'Enemy', characters });
    assert.ok(hasHypnosis(match), 'Hypnosis should still be active after the enemy\'s stunned turn');

    // Drowzee's very next turn: Nightmare should still see Hypnosis as active.
    const hypnosisBefore = enemyState(match).statuses.find((entry) => entry?.id === 'drowzee_hypnosis_active');
    const remainingTurnsBefore = Number(hypnosisBefore?.remainingTurns) || 0;
    queueSkill(match, 'Drowzee', 'drowzee-nightmare', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    const nightmareDot = enemyState(match).statuses.find((entry) => entry?.id === 'drowzee_nightmare_dot');
    assert.ok(nightmareDot, 'Nightmare should apply its damage-over-time status - Hypnosis was still active');
    const hypnosisAfter = enemyState(match).statuses.find((entry) => entry?.id === 'drowzee_hypnosis_active');
    assert.ok(
        Number(hypnosisAfter?.remainingTurns) > remainingTurnsBefore,
        'Nightmare should extend Hypnosis by 1 turn'
    );
});

test('Drowzee Nightmare does nothing if the enemy is not affected by Hypnosis', () => {
    const match = makeMatch();
    queueSkill(match, 'Drowzee', 'drowzee-nightmare', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    assert.equal(
        enemyState(match).statuses.some((entry) => entry?.id === 'drowzee_nightmare_dot'),
        false,
        'Nightmare should require the enemy to already be affected by Hypnosis'
    );
});

test('Drowzee Dream Eater deals damage even without Hypnosis active, but does not steal energy', () => {
    const match = makeMatch();
    const enemyChakraBefore = { ...match.chakraPools.Enemy };
    const enemyHpBefore = match.board.Enemy[0].hp;
    queueSkill(match, 'Drowzee', 'drowzee-dream-eater', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    assert.ok(match.board.Enemy[0].hp < enemyHpBefore, 'Dream Eater should deal damage even without Hypnosis active');
    const totalEnemyChakraAfter = Object.values(match.chakraPools.Enemy).reduce((sum, value) => sum + value, 0);
    const totalEnemyChakraBefore = Object.values(enemyChakraBefore).reduce((sum, value) => sum + value, 0);
    assert.equal(
        totalEnemyChakraAfter,
        totalEnemyChakraBefore,
        'Dream Eater should not steal energy from an enemy that is not affected by Hypnosis'
    );
});

test('Drowzee Dream Eater steals 1 random energy from an enemy affected by Hypnosis', () => {
    const match = makeMatch();
    queueSkill(match, 'Drowzee', 'drowzee-hypnosis', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    const chakraBefore = { ...match.chakraPools.Enemy };
    queueSkill(match, 'Enemy', 'abra-psychic', 'Drowzee');
    resolvePendingTurnSkills({ match, actingUsername: 'Enemy', characters });
    queueSkill(match, 'Drowzee', 'drowzee-dream-eater', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    const totalBefore = Object.values(chakraBefore).reduce((sum, value) => sum + value, 0);
    const totalAfter = Object.values(match.chakraPools.Enemy).reduce((sum, value) => sum + value, 0);
    assert.ok(
        totalAfter < totalBefore,
        'Dream Eater should steal 1 random energy from an enemy affected by Hypnosis'
    );
});

test('Hypnosis targets an enemy without it, but not one already affected by it', () => {
    const characterList = characters;
    const drowzee = characterList[drowzeeIndex];
    const hypnosisSkill = drowzee.skills.find((entry) => entry.id === 'drowzee-hypnosis');
    assert.deepEqual(
        hypnosisSkill.targetCondition,
        { missingStatusId: 'drowzee_hypnosis_active' },
        'Hypnosis should only be able to target an enemy that is not already affected by it'
    );

    const match = makeMatch();
    queueSkill(match, 'Drowzee', 'drowzee-hypnosis', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    const statusAfterFirstCast = enemyState(match).statuses.find(
        (entry) => entry?.id === 'drowzee_hypnosis_active'
    );
    assert.ok(statusAfterFirstCast, 'Hypnosis should be applied by the first cast');

    // Bypass the cooldown so a second cast attempt is possible - the target condition should
    // still leave the enemy with exactly one (unduplicated, unthrown) Hypnosis status.
    match.board.Drowzee[0].state.cooldowns['drowzee-hypnosis'] = 0;
    queueSkill(match, 'Drowzee', 'drowzee-hypnosis', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    const hypnosisStatusesAfterSecondAttempt = enemyState(match).statuses.filter(
        (entry) => entry?.id === 'drowzee_hypnosis_active'
    );
    assert.equal(
        hypnosisStatusesAfterSecondAttempt.length,
        1,
        'Hypnosis should not stack or duplicate when re-cast on an already-affected target'
    );
});

test('Hypnosis has a finite duration (does not last forever)', () => {
    const match = makeMatch();
    queueSkill(match, 'Drowzee', 'drowzee-hypnosis', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    const status = enemyState(match).statuses.find((entry) => entry?.id === 'drowzee_hypnosis_active');
    assert.ok(status, 'Hypnosis status should be applied');
    assert.ok(
        Number(status.remainingTurns) < 90,
        `Hypnosis should be a short, finite duration, not infinite (got ${status.remainingTurns})`
    );
});
