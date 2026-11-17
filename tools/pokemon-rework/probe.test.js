'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('./dsl');
const { buildInitialBoard, processTurnStartStatusEffects, resolvePendingTurnSkills, tickStatusesForTurnEnd } = require('../../battleLogic');
const sk = (id, parts, extra = {}) => ({ id, name: id, energy: [], cooldown: 0, target: extra.target ?? 'single-enemy', classes: ['Physical', 'Instant'], effects: parts.flatMap((p) => p.fx), ...extra });
const A = { id: 'pa', characterId: 'pa', name: 'A', arena: 'comic', skills: [
  sk('hit', [D.damage(20)]), sk('pierce', [D.damage(20, { pierce: true })]), sk('dot', [D.overTime(10, 2, { id: 'p_dot' })]),
  sk('stun', [D.stun(1, { id: 'p_stun' })]), sk('inv', [D.invulnerable(1, { id: 'p_inv' })], { target: 'self' }),
  sk('shield', [D.shield(15, 2, { id: 'p_sh' })], { target: 'self' }), sk('reduce', [D.reduce(10, 2, { id: 'p_dr' })], { target: 'self' }),
  sk('boost', [D.boost(10, 2, { id: 'p_bo' })], { target: 'self' }), sk('weaken', [D.weaken(10, 1, { id: 'p_we' })]),
  sk('expose', [D.expose(10, 2, { id: 'p_ex' })]), sk('heal', [D.heal(25)], { target: 'self' }), sk('regen', [D.regen(10, 2, { id: 'p_rg' })], { target: 'self' }),
  sk('drain', [D.damage(5), D.drain(1)]), sk('gain', [D.gain(1)], { target: 'self' }), sk('cleanse', [D.cleanse()], { target: 'self' }),
] };
const S = Object.fromEntries(A.skills.map((s, i) => [s.id, i]));
const roster = [A, A];
function game() {
  const players = [{ username: 'a', team: [0] }, { username: 'b', team: [1] }];
  const pool = { taijutsu: 3, ninjutsu: 3, genjutsu: 3, bloodline: 3 };
  const match = { players, board: buildInitialBoard(players, roster), chakraPools: { a: { ...pool }, b: { ...pool } }, pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { a: 1, b: 1 } } };
  const use = (u, id, tu, ts = 0) => { match.pendingTurns[u] = { queueOrder: ['0'], queuedByActorSlot: { 0: { skillIndex: S[id], targetSelection: [{ username: tu, slot: ts }] } } }; resolvePendingTurnSkills({ match, actingUsername: u, characters: roster }); match.pendingTurns[u] = {}; match.board[u][0].state.cooldowns = {}; };
  const pass = (u) => { tickStatusesForTurnEnd({ match, endingUsername: u }); const o = u === 'a' ? 'b' : 'a'; match.economy.turnCounts[o] += 1; processTurnStartStatusEffects({ match, startingUsername: o }); };
  return { match, use, pass, a: match.board.a[0], b: match.board.b[0] };
}
test('damage, piercing vs reduction', () => {
  const g = game(); g.use('a', 'hit', 'b'); assert.equal(g.b.hp, 80);
  g.use('b', 'reduce', 'b'); g.use('a', 'hit', 'b'); assert.equal(g.b.hp, 70); g.use('a', 'pierce', 'b'); assert.equal(g.b.hp, 50);
});
test('affliction over time: lasts its duration', () => {
  const g = game(); g.use('a', 'dot', 'b'); const hp = [g.b.hp];
  for (let i = 0; i < 6; i++) { g.pass(i % 2 ? 'b' : 'a'); hp.push(g.b.hp); }
  console.log('dot hp', hp.join(' ')); assert.ok(g.b.hp <= 80 && g.b.hp >= 70, String(hp));
});
test('stun blocks skills for its turn', () => {
  const g = game(); g.use('a', 'stun', 'b'); g.pass('a'); g.use('b', 'hit', 'a'); assert.equal(g.a.hp, 100, 'stunned b could not hit');
  g.pass('b'); g.pass('a'); g.use('b', 'hit', 'a'); assert.equal(g.a.hp, 80, 'stun wore off');
});
test('invulnerable, shield, boost, weaken, expose', () => {
  let g = game(); g.use('b', 'inv', 'b'); g.use('a', 'hit', 'b'); assert.equal(g.b.hp, 100, 'invulnerable');
  g = game(); g.use('b', 'shield', 'b'); g.use('a', 'hit', 'b'); assert.equal(g.b.hp, 95, 'shield 15 absorbs');
  g = game(); g.use('a', 'boost', 'a'); g.use('a', 'hit', 'b'); assert.equal(g.b.hp, 70, 'boost +10');
  g = game(); g.use('a', 'weaken', 'b'); g.use('b', 'hit', 'a'); assert.equal(g.a.hp, 90, 'weaken -10');
  g = game(); g.use('a', 'expose', 'b'); g.use('a', 'hit', 'b'); assert.equal(g.b.hp, 70, 'expose +10');
});
test('heal, regen, cleanse, energy', () => {
  const g = game(); g.use('b', 'hit', 'a'); g.use('b', 'hit', 'a'); g.use('a', 'heal', 'a'); assert.equal(g.a.hp, 85);
  g.use('a', 'regen', 'a'); const h = []; for (let i = 0; i < 4; i++) { g.pass(i % 2 ? 'b' : 'a'); h.push(g.a.hp); } console.log('regen', h.join(' '));
  g.use('b', 'dot', 'a'); g.use('a', 'cleanse', 'a'); assert.ok(!g.a.state.statuses.some((s) => s.id === 'p_dot'), 'cleansed');
  const tot = (u) => Object.values(g.match.chakraPools[u]).reduce((x, y) => x + y, 0);
  const before = tot('b'); g.use('a', 'drain', 'b'); assert.equal(tot('b'), before - 1, 'drained');
  const ga = tot('a'); g.use('a', 'gain', 'a'); assert.equal(tot('a'), ga + 1, 'gained');
});
test('timed evolution: a start status that expires into useEvolvedSkills', () => {
  const E = { id: 'pe', characterId: 'pe', name: 'E', arena: 'comic', facePicture: 'a.png',
    startStatuses: [{ statusId: 'pe_tracker', duration: 3, metadata: { unremovable: true, tooltipText: 'Evolves soon',
      onExpireApplyStatusToSelf: { statusId: 'pe_evolution', duration: 999, metadata: { infiniteDuration: true, unremovable: true, useEvolvedSkills: true, facePictureOverride: 'b.png' } } } }],
    skills: [{ ...sk('hit', [D.damage(10)]), evolvesTo: sk('hit2', [D.damage(30)]) }] };
  const roster = [E, A];
  const players = [{ username: 'a', team: [0] }, { username: 'b', team: [1] }];
  const pool = { taijutsu: 3, ninjutsu: 3, genjutsu: 3, bloodline: 3 };
  const match = { players, board: buildInitialBoard(players, roster), chakraPools: { a: { ...pool }, b: { ...pool } }, pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { a: 1, b: 1 } } };
  const use = () => { match.pendingTurns.a = { queueOrder: ['0'], queuedByActorSlot: { 0: { skillIndex: 0, targetSelection: [{ username: 'b', slot: 0 }] } } }; resolvePendingTurnSkills({ match, actingUsername: 'a', characters: roster }); match.pendingTurns.a = {}; match.board.a[0].state.cooldowns = {}; };
  const pass = (u) => { tickStatusesForTurnEnd({ match, endingUsername: u }); const o = u === 'a' ? 'b' : 'a'; match.economy.turnCounts[o] += 1; processTurnStartStatusEffects({ match, startingUsername: o }); };
  const b = match.board.b[0], log = [];
  for (let t = 1; t <= 5; t++) { const before = b.hp; use(); log.push(`T${t}:${before - b.hp}`); pass('a'); pass('b'); }
  console.log('evo', log.join(' '), match.board.a[0].state.statuses.map((s) => s.id).join(','));
  assert.ok(log.some((x) => x.endsWith(':30')), 'evolved skill used');
});
