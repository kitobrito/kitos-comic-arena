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

test('costs and cooldowns match the design (red = Bloodline, yellow = Genjutsu)', () => {
    const by = Object.fromEntries(blaziken.skills.map((s) => [s.id, s]));
    assert.deepEqual(by['blaziken-smoldering-roundhouse'].energy, ['Bloodline']);
    assert.equal(by['blaziken-smoldering-roundhouse'].cooldown, 0);
    assert.deepEqual(by['blaziken-sky-uppercut'].energy, ['Genjutsu', 'Random']);
    assert.equal(by['blaziken-sky-uppercut'].cooldown, 2);
    assert.deepEqual(by['blaziken-fiery-roar'].energy, ['Bloodline', 'Random']);
    assert.equal(by['blaziken-fiery-roar'].cooldown, 3);
    assert.deepEqual(by['blaziken-blaze-kick'].energy, ['Bloodline', 'Bloodline']);
    assert.ok(by['blaziken-passive-mega-blaziken'].classes.includes('Passive'));
});

test('Smoldering Roundhouse: 15 + 5, and each use adds 5 affliction damage to later skills', () => {
    const g = game();
    g.use('may', skill('blaziken-smoldering-roundhouse'), 'foe', 0);
    assert.equal(g.foes[0].hp, 80, '15 physical + 5 affliction');
    g.round();
    g.use('may', skill('blaziken-smoldering-roundhouse'), 'foe', 1);
    assert.equal(g.foes[1].hp, 75, '15 + (5 + 5)');
    g.round();
    g.use('may', skill('blaziken-smoldering-roundhouse'), 'foe', 2);
    assert.equal(g.foes[2].hp, 70, '15 + (5 + 10): the physical part never grows');
    assert.equal(status(g.unit, 'blaziken_smoldering_heat').metadata.blazikenHeat, 15);
});

test('Fiery Roar: 0 base affliction to the team, charges the next harmful skill, cannot stack', () => {
    const g = game();
    g.use('may', skill('blaziken-fiery-roar'), 'foe', 0);
    assert.deepEqual(g.foes.map((f) => f.hp), [100, 100, 100], '0 base damage');
    assert.ok(status(g.unit, 'blaziken_fiery_roar_charge'));
    g.round(); g.readyAll();
    g.use('may', skill('blaziken-fiery-roar'), 'foe', 0);
    assert.equal(g.unit.state.statuses.filter((s) => s.id === 'blaziken_fiery_roar_charge').length, 1, 'may not be used while active');

    const h = game();
    h.use('may', skill('blaziken-smoldering-roundhouse'), 'foe', 0);
    h.round();
    h.use('may', skill('blaziken-fiery-roar'), 'foe', 0);
    assert.deepEqual(h.foes.map((f) => f.hp), [75, 95, 95], 'heat still adds to the 0 base');
});

test('the charged hit deals 30 more affliction, then Blaziken Mega Evolves, heals 10, and Fiery Roar becomes Blaze Kick', () => {
    const g = game();
    g.use('may', skill('blaziken-fiery-roar'), 'foe', 0);
    g.round();
    g.unit.hp = 60;
    g.use('may', skill('blaziken-sky-uppercut'), 'foe', 1);
    assert.equal(g.foes[1].hp, 40, '30 + 30 bonus');
    assert.equal(status(g.unit, 'blaziken_fiery_roar_charge'), undefined, 'charge used up');
    const mega = status(g.unit, 'blaziken_mega_evolution');
    assert.ok(mega, 'Mega Evolved');
    assert.equal(mega.metadata.facePictureOverride, 'assets/images/PokemonArena/blaziken/megablazikenfp.webp');
    assert.match(mega.metadata.tooltipText, /evolved into Mega Blaziken/, 'drives the evolution cinematic name');
    assert.equal(g.unit.hp, 70, 'heals 10');
    const replaced = resolveEffectiveSkill({ characters: roster, rosterIndex: g.unit.rosterIndex, skillIndex: skill('blaziken-fiery-roar'), actorState: g.unit.state });
    assert.equal(replaced.name, 'Blaze Kick');
});

test('a charge that never lands does not Mega Evolve', () => {
    const g = game();
    g.use('may', skill('blaziken-fiery-roar'), 'foe', 0);
    g.round();
    g.use('may', skill('blaziken-arm-guard'), 'may', 0);
    assert.ok(status(g.unit, 'blaziken_fiery_roar_charge'), 'a helpful skill keeps the charge');
    assert.equal(status(g.unit, 'blaziken_mega_evolution'), undefined);
});

test('Blaze Kick: 5 to the team, then 2 harmful skills deal 35 more; Mega only happens once', () => {
    const g = game();
    g.use('may', skill('blaziken-fiery-roar'), 'foe', 0);
    g.round();
    g.use('may', skill('blaziken-sky-uppercut'), 'foe', 0);
    g.round(); g.readyAll();
    g.foes.forEach((f) => { f.hp = 100; });
    g.unit.hp = 50;
    g.use('may', skill('blaziken-fiery-roar'), 'foe', 0);
    assert.deepEqual(g.foes.map((f) => f.hp), [95, 95, 95], 'Blaze Kick 5 base');
    assert.equal(status(g.unit, 'blaziken_blaze_kick_charge').metadata.nextHarmfulSkillBonusUses, 2);
    g.round();
    g.use('may', skill('blaziken-smoldering-roundhouse'), 'foe', 0);
    assert.equal(g.foes[0].hp, 40, '15 + 5 + 35');
    g.round();
    g.use('may', skill('blaziken-smoldering-roundhouse'), 'foe', 1);
    assert.equal(g.foes[1].hp, 30, '95 - (15 + (5+5) + (35+5))');
    g.round();
    g.use('may', skill('blaziken-smoldering-roundhouse'), 'foe', 2);
    assert.equal(g.foes[2].hp, 65, 'charges spent: 15 + (5+10)');
    assert.equal(g.unit.hp, 50, 'no second Mega heal');
});

test('Sky Uppercut counters the first new enemy skill on Blaziken for 1 turn; Arm Guard blocks everything', () => {
    const g = game();
    g.use('may', skill('blaziken-sky-uppercut'), 'foe', 0);
    g.pass('may');
    g.use('foe', 0, 'may', 0, 0);
    g.use('foe', 0, 'may', 0, 1);
    assert.equal(g.unit.hp, 80, 'first countered, second lands');
    g.pass('foe');
    g.use('may', skill('blaziken-arm-guard'), 'may', 0);
    g.pass('may');
    g.use('foe', 0, 'may', 0, 2);
    assert.equal(g.unit.hp, 80, 'invulnerable');
});

test('unlock mission: 10 wins and 4 in a row with Charmander and with Cyndaquil', () => {
    const src = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    const block = src.slice(src.indexOf('const POKEMON_BLAZIKEN_MISSION_ENTRY'), src.indexOf('const POKEMON_AEGISLASH_MISSION_ENTRY'));
    for (const [type, id, wins] of [['win_matches', 'charmander', 10], ['win_streak', 'charmander', 4], ['win_matches', 'cyndaquil', 10], ['win_streak', 'cyndaquil', 4]]) {
        assert.match(block, new RegExp(`type: '${type}', character_id: '${id}', character_name: '\\w+', wins: ${wins}`));
    }
    assert.match(src, /upsertRequiredMission\(POKEMON_BLAZIKEN_MISSION_ENTRY/);
});
