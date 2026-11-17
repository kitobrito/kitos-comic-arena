const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const {
    buildInitialBoard,
    computeTargetOptions,
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

test('Perish Song persists and defeats its target after Jigglypuff is defeated', () => {
    const jigglypuffIndex = characters.findIndex((character) => character.id === 'jigglypuff');
    const enemyIndex = characters.findIndex((character) => character.id === 'pikachu');
    const players = [{ username: 'Ash', team: [jigglypuffIndex] }, { username: 'Gary', team: [enemyIndex] }];
    const match = makeMatch(players);
    match.board.Ash[0].alive = false;
    match.board.Ash[0].hp = 0;
    match.board.Gary[0].state.statuses.push({
        id: 'jigglypuff_perish_song',
        remainingTurns: 1,
        sourceSkillId: 'jigglypuff-perish-song',
        sourceUsername: 'Ash',
        sourceSlot: 0,
        metadata: { harmful: true, unremovable: true, instantKillOnExpire: true },
    });

    tickStatusesForTurnEnd({ match, endingUsername: 'Gary' });

    assert.equal(match.board.Gary[0].alive, false);
    assert.equal(match.board.Gary[0].hp, 0);
});

test('Sing advances every enemy Perish Song once on each of its two channeled turns', () => {
    const jigglypuffIndex = characters.findIndex((character) => character.id === 'jigglypuff');
    const enemyIndex = characters.findIndex((character) => character.id === 'pikachu');
    const players = [{ username: 'Ash', team: [jigglypuffIndex] }, { username: 'Gary', team: [enemyIndex, enemyIndex] }];
    const match = makeMatch(players);
    match.board.Ash[0].state.statuses.push({
        id: 'jigglypuff_sing_channel',
        remainingTurns: 2,
        sourceSkillId: 'jigglypuff-sing',
        sourceUsername: 'Ash',
        sourceSlot: 0,
        metadata: {
            ongoingClass: 'channeled',
            advanceAllEnemyPerishEachTurn: true,
            turnEndTrigger: 'source_turn',
        },
    });
    match.board.Gary[1].state.statuses.push({
        id: 'jigglypuff_perish_song',
        remainingTurns: 4,
        sourceSkillId: 'jigglypuff-perish-song',
        sourceUsername: 'Ash',
        sourceSlot: 0,
        metadata: { harmful: true, unremovable: true, instantKillOnExpire: true },
    });

    tickStatusesForTurnEnd({ match, endingUsername: 'Ash' });
    assert.equal(
        match.board.Gary[1].state.statuses.find((status) => status.id === 'jigglypuff_perish_song').remainingTurns,
        3
    );

    match.economy.turnCounts.Ash = 2;
    tickStatusesForTurnEnd({ match, endingUsername: 'Ash' });
    assert.equal(
        match.board.Gary[1].state.statuses.find((status) => status.id === 'jigglypuff_perish_song').remainingTurns,
        2
    );
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

test('a stored Pidgey override cannot bring back the old Gust/Whirlwind/Peck costs and cooldowns', () => {
    const canonicalPidgey = characters.find((character) => character.id === 'pidgey');
    const randomOnlyIds = ['pidgey-gust', 'pidgey-whirlwind', 'pidgey-peck', 'pidgeotto-gust', 'pidgeotto-whirlwind', 'pidgeotto-peck'];
    const stalePidgey = {
        ...JSON.parse(JSON.stringify(canonicalPidgey)),
        customCharacterOverride: true,
    };
    stalePidgey.skills.forEach((skill) => {
        if (randomOnlyIds.includes(skill.id)) {
            skill.energy = ['Taijutsu', 'Ninjutsu'];
            skill.cooldown = 0;
            skill.customSkillOverride = true;
        }
    });

    const [corrected] = applyRequiredCanonicalSkillCorrections([stalePidgey], [canonicalPidgey]);
    randomOnlyIds.forEach((id) => {
        const fixed = corrected.skills.find((skill) => skill.id === id);
        const canonical = canonicalPidgey.skills.find((skill) => skill.id === id);
        assert.ok(fixed, id);
        assert.deepEqual(fixed.energy, canonical.energy, `${id} energy`);
        assert.equal(fixed.cooldown, canonical.cooldown, `${id} cooldown`);
        assert.ok(fixed.energy.every((e) => e === 'Random'), `${id} is random-only`);
    });
    // The evolution passive's description still comes from characters.js too.
    const passive = corrected.skills.find((skill) => skill.id === 'pidgey-passive-evolution-pidgeotto');
    assert.equal(passive.skilldescription, canonicalPidgey.skills.find((s) => s.id === passive.id).skilldescription);
});
