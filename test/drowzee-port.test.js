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
    const enemyHpBefore = match.board.Enemy[0].hp;
    queueSkill(match, 'Drowzee', 'drowzee-nightmare', 'Enemy');
    resolvePendingTurnSkills({ match, actingUsername: 'Drowzee', characters });
    const enemyUnit = match.board.Enemy[0];
    const tookEffect = enemyUnit.alive === false || enemyUnit.hp !== enemyHpBefore;
    assert.ok(tookEffect, 'Nightmare should have affected the enemy - Hypnosis was still active');
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
