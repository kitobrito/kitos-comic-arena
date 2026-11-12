'use strict';

// Aerodactyl rework (Pokemon Arena): every skill, the Mega Evolution and Rock Blast played through the
// battle engine. Lance's Aerodactyl is a different character and keeps its own kit.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const {
    buildInitialBoard,
    processTurnStartStatusEffects,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');

const root = path.resolve(__dirname, '..');
const aero = characters.find((c) => c.id === 'aerodactyl');
const skill = (id) => aero.skills.findIndex((s) => s.id === id);
// Typeless dummies, so Pokemon type effectiveness doesn't change the numbers.
const punch = { id: 't-punch', name: 'Punch', energy: [], cooldown: 0, target: 'single-enemy', classes: ['Physical', 'Instant'], effects: [{ type: 'damage', amount: 20, scope: 'target' }] };
const sweep = { id: 't-sweep', name: 'Sweep', energy: [], cooldown: 0, target: 'all-enemy', classes: ['Physical', 'Instant'], effects: [{ type: 'damage', amount: 10, scope: 'all-enemy' }] };
const guard = { id: 't-guard', name: 'Guard', energy: [], cooldown: 0, target: 'self', classes: ['Instant'], effects: [{ type: 'apply_status', statusId: 't_guard', duration: 1, scope: 'self', metadata: { invulnerable: true } }] };
const dummy = { id: 'dummy', characterId: 'dummy', name: 'Dummy', arena: 'comic', skills: [punch, sweep, guard] };
const roster = [aero, dummy];
const PUNCH = 0, SWEEP = 1, GUARD = 2;

function game() {
    const players = [{ username: 'ash', team: [0] }, { username: 'foe', team: [1, 1, 1] }];
    const pool = { taijutsu: 9, ninjutsu: 9, genjutsu: 9, bloodline: 9 };
    const match = {
        players, board: buildInitialBoard(players, roster), chakraPools: { ash: { ...pool }, foe: { ...pool } },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { ash: 1, foe: 1 } },
    };
    const use = (username, skillIndex, targetUsername, targetSlot = 0, slot = 0) => {
        match.pendingTurns[username] = { queueOrder: [String(slot)], queuedByActorSlot: { [String(slot)]: { skillIndex, targetSelection: [{ username: targetUsername, slot: targetSlot }] } } };
        resolvePendingTurnSkills({ match, actingUsername: username, characters: roster });
        match.pendingTurns[username] = {};
    };
    const pass = (username) => {
        tickStatusesForTurnEnd({ match, endingUsername: username });
        const other = username === 'ash' ? 'foe' : 'ash';
        match.economy.turnCounts[other] += 1;
        processTurnStartStatusEffects({ match, startingUsername: other });
    };
    const unit = match.board.ash[0];
    return { match, use, pass, unit, foes: match.board.foe, ready: () => { unit.state.cooldowns = {}; } };
}
const has = (unit, id) => unit.state.statuses.some((s) => s.id === id);
const hps = (g) => g.foes.map((f) => f.hp);
// Giga Impact on foe 0, foe takes its turn, and the mark resolves at the end of it.
const megaEvolve = (g) => {
    g.use('ash', skill('aerodactyl-giga-impact'), 'foe', 0);
    g.pass('ash');
    g.pass('foe');
    g.ready();
};

test('the new kit: costs, cooldowns, classes and art (green = Taijutsu)', () => {
    assert.ok(aero);
    assert.deepEqual(aero.pokemonTypes, ['Rock', 'Flying']);
    const by = Object.fromEntries(aero.skills.map((s) => [s.id, s]));
    assert.deepEqual(aero.skills.slice(0, 4).map((s) => s.name), ['Gust', 'Dragon Breath', 'Hyper Beam', 'Giga Impact']);
    assert.deepEqual(by['aerodactyl-gust'].energy, ['Random']);
    assert.equal(by['aerodactyl-gust'].cooldown, 3);
    assert.deepEqual(by['aerodactyl-dragon-breath'].energy, ['Taijutsu']);
    assert.equal(by['aerodactyl-dragon-breath'].cooldown, 1);
    assert.deepEqual(by['aerodactyl-hyper-beam'].energy, ['Random', 'Random', 'Random']);
    assert.equal(by['aerodactyl-hyper-beam'].cooldown, 1);
    assert.deepEqual(by['aerodactyl-giga-impact'].energy, ['Random', 'Random']);
    assert.equal(by['aerodactyl-giga-impact'].cooldown, 4);
    assert.ok(by['aerodactyl-giga-impact'].classes.includes('Control'));
    assert.ok(by['aerodactyl-passive-mega-aerodactyl'].classes.includes('Passive'));
    assert.ok(by['aerodactyl-passive-rock-blast'].classes.includes('Passive'));
    ['aerodactyl-take-down', 'aerodactyl-rock-slide', 'aerodactyl-double-edge', 'aerodactyl-stone-edge'].forEach((id) => assert.ok(!by[id], `${id} is gone`));
    const files = [aero.facePicture, 'assets/images/PokemonArena/aerodactyl/megafp.webp', ...aero.skills.map((s) => s.skillimage)];
    files.forEach((f) => assert.ok(fs.existsSync(path.join(root, f)), f));
    const lance = characters.find((c) => c.id === 'lance-aerodactyl');
    assert.ok(lance.skills.some((s) => s.id === 'lance-aerodactyl-rock-slide'), "Lance's Aerodactyl keeps its kit");
});

test('Gust: the enemy team cannot use area skills for 2 turns; Aerodactyl\'s team\'s area damage +5', () => {
    const g = game();
    g.use('ash', skill('aerodactyl-gust'), 'foe', 0);
    assert.deepEqual(hps(g), [100, 100, 100], 'no damage before Mega');
    g.pass('ash');
    g.use('foe', SWEEP, 'ash', 0);
    assert.equal(g.unit.hp, 100, 'Sweep (an area skill) is blocked');
    g.use('foe', PUNCH, 'ash', 0);
    assert.equal(g.unit.hp, 80, 'single-target skills still work');
    g.pass('foe');
    g.use('ash', skill('aerodactyl-hyper-beam'), 'foe', 0);
    assert.deepEqual(hps(g), [60, 85, 85], 'Hyper Beam: 40 to the target, 10 + 5 to the others');
    g.pass('ash');
    g.use('foe', SWEEP, 'ash', 0);
    assert.equal(g.unit.hp, 80, 'still blocked on the second turn');
    g.pass('foe');
    g.pass('ash');
    g.use('foe', SWEEP, 'ash', 0);
    assert.equal(g.unit.hp, 70, 'gone on the third turn');
});

test('Dragon Breath: 10 affliction to the team now and 10 more next turn', () => {
    const g = game();
    g.use('ash', skill('aerodactyl-dragon-breath'), 'foe', 0);
    assert.deepEqual(hps(g), [80, 80, 80].map((n) => n + 10));
    g.pass('ash'); g.pass('foe'); g.pass('ash');
    assert.deepEqual(hps(g), [80, 80, 80], '20 in total');
    g.pass('foe'); g.pass('ash');
    assert.deepEqual(hps(g), [80, 80, 80], 'nothing after that');
});

test('Hyper Beam: 40 to one enemy and 10 to the others', () => {
    const g = game();
    g.use('ash', skill('aerodactyl-hyper-beam'), 'foe', 1);
    assert.deepEqual(hps(g), [90, 60, 90]);
});

test('Giga Impact: invulnerable for a turn, then both take 30, the target is stunned, Aerodactyl Mega Evolves', () => {
    const g = game();
    g.use('ash', skill('aerodactyl-giga-impact'), 'foe', 0);
    g.pass('ash');
    g.use('foe', PUNCH, 'ash', 0);
    assert.equal(g.unit.hp, 100, 'Aerodactyl is invulnerable');
    g.pass('foe');
    assert.equal(g.foes[0].hp, 70, 'the target takes 30');
    assert.equal(g.unit.hp, 80, 'Aerodactyl takes 30 and heals 10 on Mega Evolving');
    assert.ok(has(g.unit, 'aerodactyl_mega_evolution'), 'Mega Evolved');
    const mega = g.unit.state.statuses.find((s) => s.id === 'aerodactyl_mega_evolution');
    assert.equal(mega.metadata.facePictureOverride, 'assets/images/PokemonArena/aerodactyl/megafp.webp');
    g.pass('ash');
    g.use('foe', PUNCH, 'ash', 0, 0);
    assert.equal(g.unit.hp, 80, 'the target is stunned on its next turn');
    g.pass('foe');
    g.pass('ash');
    g.use('foe', PUNCH, 'ash', 0, 0);
    assert.equal(g.unit.hp, 60, 'the stun lasts 1 turn');
});

test('Giga Impact: a target that turns invulnerable dodges it, and nobody takes damage or Mega Evolves', () => {
    const g = game();
    g.use('ash', skill('aerodactyl-giga-impact'), 'foe', 0);
    g.pass('ash');
    g.use('foe', GUARD, 'foe', 0, 0);
    g.pass('foe');
    assert.equal(g.foes[0].hp, 100);
    assert.equal(g.unit.hp, 100);
    assert.ok(!has(g.unit, 'aerodactyl_mega_evolution'));
});

test("Giga Impact: Aerodactyl's own 30 can't kill it", () => {
    const g = game();
    g.unit.hp = 20;
    megaEvolve(g);
    assert.equal(g.foes[0].hp, 70);
    assert.equal(g.unit.hp, 11, 'down to 1, then +10 from Mega Evolving');
});

test('Mega Aerodactyl: Gust deals 10, Dragon Breath\'s first hit +10, Hyper Beam\'s splash +10', () => {
    let g = game();
    megaEvolve(g);
    const base = hps(g); // [70, 100, 100]
    g.use('ash', skill('aerodactyl-gust'), 'foe', 1);
    assert.deepEqual(hps(g), base.map((n) => n - 10), 'Gust deals 10 (no Gust bonus on itself)');

    g = game();
    megaEvolve(g);
    g.use('ash', skill('aerodactyl-dragon-breath'), 'foe', 1);
    assert.deepEqual(hps(g), [50, 80, 80], 'first hit 10 + 10');

    g = game();
    megaEvolve(g);
    g.use('ash', skill('aerodactyl-hyper-beam'), 'foe', 1);
    assert.deepEqual(hps(g), [50, 60, 80], '40 to the target, 10 + 10 to the others');
});

test('Rock Blast: while Mega, every skill adds 5 piercing to the enemy team for 2 turns, and it stacks', () => {
    const g = game();
    // Before Mega Evolving, no Rock Blast.
    g.use('ash', skill('aerodactyl-hyper-beam'), 'foe', 1);
    assert.ok(!g.foes.some((f) => has(f, 'aerodactyl_rock_blast')));
    g.foes.forEach((f) => { f.hp = 100; });
    g.ready();
    megaEvolve(g);
    g.foes.forEach((f) => { f.hp = 100; f.state.statuses = []; });
    g.use('ash', skill('aerodactyl-hyper-beam'), 'foe', 0);
    assert.deepEqual(hps(g), [60, 80, 80]);
    assert.ok(g.foes.every((f) => has(f, 'aerodactyl_rock_blast')), 'every enemy gets Rock Blast');
    // Rock Blast starts on the turns after the skill: nothing at the end of this turn.
    let before = hps(g);
    g.pass('ash');
    assert.deepEqual(hps(g), before, 'nothing on the turn it was used');
    g.pass('foe'); g.ready();
    g.use('ash', skill('aerodactyl-hyper-beam'), 'foe', 0);
    assert.equal(g.foes[1].state.statuses.filter((s) => s.id === 'aerodactyl_rock_blast').length, 2, 'a second use adds a second stack');
    before = hps(g);
    g.pass('ash');
    assert.deepEqual(before.map((n, i) => n - g.foes[i].hp), [5, 5, 5], 'first stack ticks (5 piercing)');
    g.pass('foe');
    before = hps(g);
    g.pass('ash');
    assert.deepEqual(before.map((n, i) => n - g.foes[i].hp), [10, 10, 10], 'both stacks tick together: 5 + 5');
    g.pass('foe');
    before = hps(g);
    g.pass('ash');
    assert.deepEqual(before.map((n, i) => n - g.foes[i].hp), [5, 5, 5], 'the first stack has run out after 2 turns');
    g.pass('foe');
    before = hps(g);
    g.pass('ash');
    assert.deepEqual(hps(g), before, 'both gone');
});

test('Client: the skill bar greys out area skills under Gust; the new status flags reach the browser', () => {
    const client = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    assert.match(client, /status\?\.metadata\?\.cannotUseAoeSkills\) && isAreaSkill\(skill\)/);
    const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    assert.match(server, /'cannotUseAoeSkills',/);
    assert.match(server, /'aoeSkillDamageBonusFlat',/);
    assert.match(server, /REWORKED_CHARACTER_IDS_IGNORING_OVERRIDES = new Set\(\['aerodactyl'\]\)/);
});
