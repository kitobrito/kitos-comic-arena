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

