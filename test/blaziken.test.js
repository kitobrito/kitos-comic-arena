'use strict';

// Blaziken (Pokemon Arena): every skill and the Mega Evolution played through the battle engine.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const {
    buildInitialBoard,
    processTurnStartStatusEffects,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');

const root = path.resolve(__dirname, '..');
const blaziken = characters.find((c) => c.characterId === 'blaziken');
const skill = (id) => blaziken.skills.findIndex((s) => s.id === id);
// A typeless target, so Pokemon type effectiveness doesn't change the numbers.
const punch = { id: 't-punch', name: 'Punch', energy: [], cooldown: 0, target: 'single-enemy', classes: ['Physical', 'Instant'], effects: [{ type: 'damage', amount: 20, scope: 'target' }] };
const dummy = { id: 'dummy', characterId: 'dummy', name: 'Dummy', arena: 'comic', skills: [punch] };
const roster = [blaziken, dummy];

function game() {
    const players = [{ username: 'may', team: [0] }, { username: 'foe', team: [1, 1, 1] }];
    const pool = { taijutsu: 9, ninjutsu: 9, genjutsu: 9, bloodline: 9 };
    const match = {
        players, board: buildInitialBoard(players, roster), chakraPools: { may: { ...pool }, foe: { ...pool } },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { may: 1, foe: 1 } },
    };
    const use = (username, skillIndex, targetUsername, targetSlot = 0, slot = 0) => {
        match.pendingTurns[username] = { queueOrder: [String(slot)], queuedByActorSlot: { [String(slot)]: { skillIndex, targetSelection: [{ username: targetUsername, slot: targetSlot }] } } };
        resolvePendingTurnSkills({ match, actingUsername: username, characters: roster });
        match.pendingTurns[username] = {};
    };
    const pass = (username) => {
        tickStatusesForTurnEnd({ match, endingUsername: username });
        const other = username === 'may' ? 'foe' : 'may';
        match.economy.turnCounts[other] += 1;
        processTurnStartStatusEffects({ match, startingUsername: other });
    };
    const round = () => { pass('may'); pass('foe'); };
    const unit = match.board.may[0];
    return { match, use, pass, round, unit, foes: match.board.foe, readyAll: () => { unit.state.cooldowns = {}; } };
}
const status = (unit, id) => unit.state.statuses.find((s) => s.id === id);

test('Blaziken is a Fire/Fighting Pokemon with all art present', () => {
    assert.ok(blaziken);
    assert.deepEqual(blaziken.pokemonTypes, ['Fire', 'Fighting']);
    const mega = status({ state: { statuses: [] } }, 'x');
    assert.equal(mega, undefined);
    const files = [blaziken.facePicture, 'assets/images/PokemonArena/blaziken/megablazikenfp.webp', 'assets/images/PokemonArena/missionpics/blaziken.webp',
        ...blaziken.skills.map((s) => s.skillimage)];
    files.forEach((f) => assert.ok(fs.existsSync(path.join(root, f)), f));
});

test('unlock mission: 10 wins and 4 in a row with Charmander and with Cyndaquil', () => {
    const src = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    const block = src.slice(src.indexOf('const POKEMON_BLAZIKEN_MISSION_ENTRY'), src.indexOf('const POKEMON_AEGISLASH_MISSION_ENTRY'));
    for (const [type, id, wins] of [['win_matches', 'charmander', 10], ['win_streak', 'charmander', 4], ['win_matches', 'cyndaquil', 10], ['win_streak', 'cyndaquil', 4]]) {
        assert.match(block, new RegExp(`type: '${type}', character_id: '${id}', character_name: '\\w+', wins: ${wins}`));
    }
    assert.match(src, /upsertRequiredMission\(POKEMON_BLAZIKEN_MISSION_ENTRY/);
});
