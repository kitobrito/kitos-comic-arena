const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const { applyStatus, buildInitialBoard, tickStatusesForTurnEnd } = require('../battleLogic');

test('Zubat and Golbat Supersonic durations are anchored to their own turns', () => {
    const zubat = characters.find((character) => character.id === 'zubat');
    assert.ok(zubat, 'Zubat should exist');

    for (const skillId of ['zubat-supersonic', 'golbat-supersonic']) {
        const skill = zubat.skills.find((entry) => entry.id === skillId);
        assert.ok(skill, `${skillId} should exist`);
        const mark = skill.effects.find(
            (effect) => effect.type === 'apply_status' && effect.statusId === 'zubat_supersonic_mark'
        );
        assert.ok(mark, `${skillId} should apply the Supersonic mark`);
        assert.equal(mark.metadata.turnDurationAnchor, 'source_turn');
    }
});

test('Supersonic survives the enemy turn and expires after Zubat can cash it in', () => {
    const zubatIndex = characters.findIndex((character) => character.id === 'zubat');
    const players = [
        { username: 'ZubatUser', team: [zubatIndex] },
        { username: 'Opponent', team: [0] },
    ];
    const match = { players, board: buildInitialBoard(players, characters) };
    const target = match.board.Opponent[0];

    applyStatus({
        targetState: target.state,
        targetUnit: target,
        statusId: 'zubat_supersonic_mark',
        duration: 1,
        sourceSkillId: 'zubat-supersonic',
        sourceUsername: 'ZubatUser',
        sourceSlot: 0,
        metadata: { turnDurationAnchor: 'source_turn' },
        fresh: true,
    });

    tickStatusesForTurnEnd({ match, endingUsername: 'ZubatUser' });
    tickStatusesForTurnEnd({ match, endingUsername: 'Opponent' });
    assert.equal(target.state.statuses.some((status) => status.id === 'zubat_supersonic_mark'), true);

    tickStatusesForTurnEnd({ match, endingUsername: 'ZubatUser' });
    assert.equal(target.state.statuses.some((status) => status.id === 'zubat_supersonic_mark'), false);
});

test('the battle page cache-busts the corrected Pokemon character data', () => {
    const ingame = fs.readFileSync(path.join(__dirname, '..', 'ingame.html'), 'utf8');
    assert.match(ingame, /characters\.js\?v=pokemon-target-fixes-v1/);
});
