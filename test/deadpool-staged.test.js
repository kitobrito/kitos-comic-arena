'use strict';

// Deadpool is prepared in staging/deadpool.js but not live. These tests play his kit through the
// real battle engine and check the release script, so releasing him is a single command.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
    applyStatus,
    buildInitialBoard,
    processTurnStartStatusEffects,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');
const { character: deadpool, mission } = require('../staging/deadpool');
const { isPrivateStaticSourcePath } = require('../server');
const { releaseCharacter } = require('../scripts/release-staged-character');

const root = path.resolve(__dirname, '..');
const skill = (id) => deadpool.skills.findIndex((s) => s.id === id);
const punch = { id: 't-punch', name: 'Punch', energy: [], cooldown: 0, target: 'single-enemy', classes: ['Physical', 'Instant'], effects: [{ type: 'damage', amount: 20, scope: 'target' }] };
const blast = { id: 't-blast', name: 'Blast', energy: [], cooldown: 0, target: 'single-enemy', classes: ['Energy', 'Ranged', 'Instant'], effects: [{ type: 'damage', amount: 15, scope: 'target' }] };
const dummy = { id: 'dummy', characterId: 'dummy', name: 'Dummy', arena: 'comic', skills: [punch, blast] };
const roster = [deadpool, dummy];

function game() {
    const players = [{ username: 'wade', team: [0] }, { username: 'foe', team: [1, 1, 1] }];
    const pool = { taijutsu: 9, ninjutsu: 9, genjutsu: 9, bloodline: 9 };
    const match = {
        players, board: buildInitialBoard(players, roster), chakraPools: { wade: { ...pool }, foe: { ...pool } },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { wade: 1, foe: 1 } },
    };
    const use = (username, slot, skillIndex, targetUsername, targetSlot = 0) => {
        const turn = match.pendingTurns[username]?.queueOrder ? match.pendingTurns[username] : { queueOrder: [], queuedByActorSlot: {} };
        turn.queueOrder.push(String(slot));
        turn.queuedByActorSlot[String(slot)] = { skillIndex, targetSelection: [{ username: targetUsername, slot: targetSlot }] };
        match.pendingTurns[username] = turn;
    };
    const resolve = (username) => { resolvePendingTurnSkills({ match, actingUsername: username, characters: roster }); match.pendingTurns[username] = {}; };
    const endTurn = (username) => tickStatusesForTurnEnd({ match, endingUsername: username });
    const startTurn = (username) => { match.economy.turnCounts[username] += 1; processTurnStartStatusEffects({ match, startingUsername: username }); };
    const pass = (username) => { endTurn(username); const other = username === 'wade' ? 'foe' : 'wade'; startTurn(other); };
    return { match, use, resolve, endTurn, startTurn, pass, wade: match.board.wade[0], foes: match.board.foe };
}
const has = (unit, id) => unit.state.statuses.some((s) => s.id === id);

test('Deadpool is staged, not live', () => {
    const live = require('../characters');
    assert.equal(live.some((c) => c.characterId === 'deadpool'), false, 'not in characters.js');
    assert.equal(fs.readFileSync(path.join(root, 'server.js'), 'utf8').includes("missionId: 'deadpool'"), false, 'mission not in the catalog');
    assert.equal(isPrivateStaticSourcePath('/staging/deadpool.js'), true, 'staging is never served');
});

test('Deadpool art is all present', () => {
    [deadpool.facePicture, mission.image, mission.portrait, ...deadpool.skills.map((s) => s.skillimage)].forEach((p) => {
        assert.ok(fs.existsSync(path.join(root, p)), p);
    });
});

test('kit matches the design: costs, cooldowns, mission', () => {
    const byName = Object.fromEntries(deadpool.skills.map((s) => [s.name, s]));
    assert.deepEqual(byName['Katana Slice'].energy, ['Taijutsu']);
    assert.equal(byName['Katana Slice'].cooldown, 0);
    assert.deepEqual(byName['Gun Play'].energy, ['Bloodline']);
    assert.equal(byName['Gun Play'].cooldown, 0);
    assert.deepEqual(byName["Katana Slash n' Hack"].energy, ['Random']);
    assert.equal(byName["Katana Slash n' Hack"].cooldown, 3);
    assert.ok(byName["Katana Slash n' Hack"].classes.includes('Invisible'));
    assert.deepEqual(byName['4th-Wall Break'].energy, ['Taijutsu', 'Bloodline', 'Ninjutsu', 'Genjutsu', 'Random']);
    assert.equal(byName['4th-Wall Break'].cooldown, 8);
    assert.ok(byName['Passive: Cancer Factor'].classes.includes('Passive'));
    assert.deepEqual(mission.goals, [{ type: 'win_matches', character_id: '', character_name: '', wins: 10 }]);
    assert.equal(mission.reward_character, 'deadpool');
});

test('Katana Slice: 25 piercing, then +10 on his next turn only', () => {
    const g = game();
    applyStatus({ targetState: g.foes[0].state, targetUnit: g.foes[0], statusId: 'armor', duration: 9, metadata: { damageReductionFlat: 10 } });
    g.use('wade', 0, skill('deadpool-katana-slice'), 'foe', 0); g.resolve('wade');
    assert.equal(g.foes[0].hp, 75, 'piercing ignores damage reduction');
    g.pass('wade'); g.pass('foe');
    g.use('wade', 0, skill('deadpool-katana-slice'), 'foe', 1); g.resolve('wade');
    assert.equal(g.foes[1].hp, 65, '25 + 10');
    g.pass('wade'); g.pass('foe'); g.pass('wade'); g.pass('foe');
    assert.equal(has(g.wade, 'deadpool_katana_slice_bonus'), false, 'bonus wears off');
});

test('Gun Play: 20 piercing to the target, 10 piercing to another random enemy, then +5', () => {
    const g = game();
    g.use('wade', 0, skill('deadpool-gun-play'), 'foe', 0); g.resolve('wade');
    assert.equal(g.foes[0].hp, 80);
    assert.deepEqual(g.foes.slice(1).map((f) => f.hp).sort(), [100, 90]);
    g.pass('wade'); g.pass('foe');
    g.use('wade', 0, skill('deadpool-katana-slice'), 'foe', 0); g.resolve('wade');
    assert.equal(g.foes[0].hp, 50, '25 + 5');
});

test("Katana Slash n' Hack: ignores physical skills; a new skill on him gets Katana Slice back, once", () => {
    const g = game();
    g.use('wade', 0, skill('deadpool-katana-slash-n-hack'), 'wade', 0); g.resolve('wade');
    const status = g.wade.state.statuses.find((s) => s.id === 'deadpool_katana_slash_n_hack');
    assert.equal(status.metadata.hideTooltipFromEnemy, true, 'invisible to the enemy');
    g.pass('wade');
    g.use('foe', 0, 0, 'wade'); g.use('foe', 1, 1, 'wade'); g.resolve('foe');
    assert.equal(g.wade.hp, 85, 'the physical Punch is ignored; the energy Blast lands');
    assert.equal(g.foes[0].hp, 75, 'Punch user gets Katana Slice');
    assert.equal(g.foes[1].hp, 75, 'Blast user gets Katana Slice');
    g.use('foe', 0, 0, 'wade'); g.resolve('foe');
    assert.equal(g.foes[0].hp, 75, 'only once per enemy');
    assert.ok(has(g.wade, 'deadpool_katana_slice_bonus'), 'Deadpool gains the Katana Slice bonus');
    g.pass('foe');
    g.use('wade', 0, skill('deadpool-katana-slice'), 'foe', 2); g.resolve('wade');
    assert.equal(g.foes[2].hp, 65);
    g.pass('wade');
    g.use('foe', 0, 0, 'wade'); g.resolve('foe');
    assert.equal(g.wade.hp, 65, 'lasts 1 turn');
});

test("4th-Wall Break: the whole enemy team skips its next turn, invulnerable or not", () => {
    const g = game();
    applyStatus({ targetState: g.foes[2].state, targetUnit: g.foes[2], statusId: 'inv', duration: 3, metadata: { invulnerable: true } });
    g.use('wade', 0, skill('deadpool-fourth-wall-break'), 'wade', 0); g.resolve('wade');
    assert.ok(g.foes.every((f) => has(f, 'deadpool_fourth_wall_break')));
    g.pass('wade');
    g.use('foe', 0, 0, 'wade'); g.use('foe', 1, 1, 'wade'); g.use('foe', 2, 0, 'wade'); g.resolve('foe');
    assert.equal(g.wade.hp, 100, 'no enemy can act');
    g.pass('foe'); g.pass('wade');
    g.use('foe', 0, 0, 'wade'); g.resolve('foe');
    assert.equal(g.wade.hp, 80, 'they act again the turn after');
});

test('Cancer Factor: 12, 9, 6, 4, 4 on undamaged turns; enemy damage resets it', () => {
    const g = game();
    g.wade.hp = 30;
    const heals = [];
    let last = g.wade.hp;
    for (let turn = 0; turn < 9; turn += 1) {
        g.startTurn('wade');
        heals.push(g.wade.hp - last);
        g.endTurn('wade');
        g.startTurn('foe');
        if (turn === 5) { g.use('foe', 0, 1, 'wade'); g.resolve('foe'); }
        last = g.wade.hp;
        g.endTurn('foe');
    }
    assert.deepEqual(heals, [0, 12, 9, 6, 4, 4, 0, 12, 9]);
});

test('the release script adds Deadpool and his mission and the result loads', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
    fs.mkdirSync(path.join(tmp, 'staging'));
    fs.copyFileSync(path.join(root, 'staging', 'deadpool.js'), path.join(tmp, 'staging', 'deadpool.js'));
    fs.copyFileSync(path.join(root, 'characters.js'), path.join(tmp, 'characters.js'));
    // characters.js loads a few sibling modules.
    for (const dep of fs.readFileSync(path.join(root, 'characters.js'), 'utf8').matchAll(/require\('\.\/([^']+)'\)/g)) {
        const file = dep[1].endsWith('.js') ? dep[1] : `${dep[1]}.js`;
        fs.copyFileSync(path.join(root, file), path.join(tmp, file));
    }
    fs.copyFileSync(path.join(root, 'server.js'), path.join(tmp, 'server.js'));
    releaseCharacter('deadpool', { root: tmp });
    delete require.cache[path.join(tmp, 'characters.js')];
    const released = require(path.join(tmp, 'characters.js'));
    const live = require('../characters');
    assert.equal(released.length, live.length + 1);
    assert.deepEqual(released.at(-1), JSON.parse(JSON.stringify(deadpool)));
    const server = fs.readFileSync(path.join(tmp, 'server.js'), 'utf8');
    assert.match(server, /missionId: 'deadpool',[\s\S]*?type: 'win_matches',\s*character_id: '',\s*character_name: '',\s*wins: 10/);
    assert.doesNotThrow(() => new Function(server.replace(/^#!.*\n/, '')), 'server.js still parses');
    assert.throws(() => releaseCharacter('deadpool', { root: tmp }), /already/);
});
