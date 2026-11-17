'use strict';
// A small vocabulary for Pokemon Arena kits. Every effect is one of a dozen well-tested engine primitives,
// and each skill's description is written from its effects, so the text always matches what it does.
//
// Energy: G = Taijutsu (green), B = Ninjutsu (blue), Y = Genjutsu (yellow), R = Bloodline (red), X = Random.
const ENERGY = { G: 'Taijutsu', B: 'Ninjutsu', Y: 'Genjutsu', R: 'Bloodline', X: 'Random' };
const cost = (s = '') => [...s].map((c) => ENERGY[c]);

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const turns = (n) => plural(n, 'turn');
const WHO = { target: 'one enemy', 'all-enemy': 'all enemies', self: '{name}', ally: 'one ally', 'all-allies': 'all allies', 'random-enemy': 'a random enemy' };
const OBJ = { target: 'the target', 'all-enemy': 'they', self: '{name}', ally: 'the ally', 'all-allies': 'they' };

// --- effect builders. Each returns { fx: [engine effects], text: 'sentence fragment' }.
// opts.who: where it lands (target, all-enemy, self, ally, all-allies). Defaults depend on the effect.
function damage(n, o = {}) {
  const scope = o.who ?? 'target';
  const meta = { harmful: true, ...(o.pierce ? { ignoreDamageReduction: true, ignoreDestructibleDefense: true } : {}) };
  if (scope === 'self') return { fx: [{ type: 'damage', amount: n, scope, metadata: { ...meta, harmful: false, fixedDamage: true } }], text: `{name} takes ${n} recoil damage`, scope };
  if (scope === 'random-enemy') return { fx: [{ type: 'damage', amount: n, scope: 'random-other-enemy', metadata: meta }], text: `${n} damage to another random enemy`, scope };
  return { fx: [{ type: 'damage', amount: n, scope, metadata: meta }], text: `Deals ${n}${o.pierce ? ' piercing' : ''} damage to ${WHO[scope]}`, scope };
}
function overTime(n, dur, o = {}) { // affliction damage each turn
  const scope = o.who ?? 'target';
  return { fx: [{ type: 'apply_status', statusId: o.id, duration: dur, scope, metadata: { harmful: true, afflictionDamage: true, turnEndDamage: n, ignoreTargetDamageReduction: true, ignoreTargetDestructibleDefense: true, turnEndTrigger: 'source_turn', turnDurationAnchor: 'source_turn', tooltipText: `Takes ${n} affliction damage each turn.` } }],
    text: o.after ? `then ${n} affliction damage each turn for ${turns(dur)}` : `Deals ${n} affliction damage to ${WHO[scope]} each turn for ${turns(dur)}`, scope };
}
const status = (id, dur, scope, metadata) => ({ type: 'apply_status', statusId: id, duration: dur, scope, metadata });
function stun(dur, o = {}) {
  const scope = o.who ?? 'target';
  const what = o.only ? `${o.only} skills` : 'skills';
  const meta = o.only ? { harmful: true, cannotUseSkillClasses: [o.only], tooltipText: `Cannot use ${what}.` } : { harmful: true, cannotUseSkills: true, tooltipText: 'Stunned: cannot use skills.' };
  return { fx: [status(o.id, dur, scope, meta)], text: o.only ? `stops ${o.after ? OBJ[scope] : WHO[scope]} from using ${what} for ${turns(dur)}` : `stuns ${o.after ? OBJ[scope] : WHO[scope]} for ${turns(dur)}`, scope };
}
function invulnerable(dur = 1, o = {}) {
  const scope = o.who ?? 'self';
  return { fx: [status(o.id, dur, scope, { invulnerable: true, tooltipText: 'Invulnerable.' })], text: scope === 'self' ? `{name} becomes invulnerable for ${turns(dur)}` : `makes ${WHO[scope]} invulnerable for ${turns(dur)}`, scope };
}
function shield(n, dur, o = {}) { // destructible defense
  const scope = o.who ?? 'self';
  return { fx: [status(o.id, dur, scope, { destructibleDefensePoints: n, tooltipText: `${n} destructible defense.` })], text: `gives ${WHO[scope]} ${n} destructible defense${dur < 99 ? ` for ${turns(dur)}` : ''}`, scope };
}
function reduce(n, dur, o = {}) { // flat damage reduction
  const scope = o.who ?? 'self';
  return { fx: [status(o.id, dur, scope, { damageReductionFlat: n, tooltipText: `Takes ${n} less damage.` })], text: `${WHO[scope]} take${scope === 'self' || scope === 'ally' ? 's' : ''} ${n} less damage for ${turns(dur)}`, scope };
}
function boost(n, dur, o = {}) {
  const scope = o.who ?? 'self';
  return { fx: [status(o.id, dur, scope, { damageBonusFlat: n, mergeNumericAddKeys: ['damageBonusFlat'], tooltipText: `Deals ${n} more damage.` })], text: `${WHO[scope]} deal${scope === 'self' || scope === 'ally' ? 's' : ''} ${n} more damage for ${turns(dur)}`, scope };
}
function weaken(n, dur, o = {}) {
  const scope = o.who ?? 'target';
  return { fx: [status(o.id, dur, scope, { harmful: true, DamageDebuff: n, tooltipText: `Deals ${n} less damage.` })], text: `${o.after ? OBJ[scope] : WHO[scope]} deal${scope === 'target' || (o.after && false) ? 's' : ''} ${n} less damage for ${turns(dur)}`, scope };
}
function expose(n, dur, o = {}) {
  const scope = o.who ?? 'target';
  return { fx: [status(o.id, dur, scope, { harmful: true, damageTakenBonusFlat: n, tooltipText: `Takes ${n} more damage.` })], text: `${o.after ? OBJ[scope] : WHO[scope]} take${scope === 'target' || scope === 'self' ? 's' : ''} ${n} more damage for ${turns(dur)}`, scope };
}
function heal(n, o = {}) {
  const scope = o.who ?? 'self';
  return { fx: [{ type: 'heal', amount: n, scope }], text: `heals ${WHO[scope]} for ${n}`, scope };
}
function regen(n, dur, o = {}) {
  const scope = o.who ?? 'self';
  return { fx: [status(o.id, dur, scope, { turnEndHealFlat: n, tooltipText: `Heals ${n} each turn.` })], text: o.after ? `${n} more each turn for ${turns(dur)}` : `heals ${WHO[scope]} for ${n} each turn for ${turns(dur)}`, scope };
}
function drain(n = 1, o = {}) {
  return { fx: [{ type: 'drain_chakra', amount: n, chakraType: 'random', scope: o.who ?? 'target' }], text: `removes ${plural(n, 'random energy')} from ${o.after ? 'their team' : 'the enemy team'}`.replace('energys', 'energy') };
}
function gain(n = 1) {
  return { fx: [{ type: 'gain_chakra', chakraType: 'random', amount: n }], text: `gains ${n} random energy` };
}
function cleanse(o = {}) {
  const scope = o.who ?? 'self';
  return { fx: [{ type: 'cleanse_statuses', count: 0, harmfulOnly: true, sourceRelation: 'enemy', scope }], text: `removes harmful effects from ${WHO[scope]}`, scope };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Join fragments into one or two short sentences.
function describe(parts, name) {
  const t = parts.map((p, i) => (i === 0 ? cap(p.text) : p.text.replace(/^Deals /, 'deals ')));
  let out = t.length > 1 ? `${t.slice(0, -1).join(', ')} and ${t[t.length - 1]}.` : `${t[0]}.`;
  return out.replace(/\{name\}/g, name).replace(/ ,/g, ',');
}

module.exports = { ENERGY, cost, damage, overTime, stun, invulnerable, shield, reduce, boost, weaken, expose, heal, regen, drain, gain, cleanse, describe, cap };
