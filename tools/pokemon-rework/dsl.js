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

// Match-wide weather (one at a time, either team can summon it). It also changes the arena background.
// mods: { Type: +/- damage }. The skill that summons it does not get its own bonus.
function weather(key, name, rounds, mods) {
  const parts = Object.entries(mods).map(([t, n]) => `${t} skills deal ${Math.abs(n)} ${n > 0 ? 'more' : 'less'} damage`);
  const rule = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return { fx: [{ type: 'set_weather', scope: 'self', weather: { key, name, rounds, description: `${rule}.`, damageTypeModifiers: { ...mods } } }],
    text: `summons ${name} for ${rounds} rounds (${rule})`, scope: 'self' };
}
// ---- Combos: one main skill puts a named mark on enemies (or a stance on the Pokemon itself), and the
// other skills check for it. Conditions on 'target' are read on each character hit; 'self' on the caster.
// mark(part, id, label, text): the part's status gets a fixed id and a name ("Burned", "In its shell").
function mark(part, id, label, text) {
  part.fx = part.fx.map((e) => (e.type === 'apply_status' ? { ...e, statusId: id, fixedId: true, metadata: { ...e.metadata, tooltipText: `${label}: ${e.metadata?.tooltipText ?? ''}`.trim() } } : e));
  if (!part.fx.some((e) => e.type === 'apply_status')) throw new Error(`mark ${id}: no status in part`);
  if (text) part.text = text;
  return part;
}
// A plain named marker with no other effect (e.g. Static), lasting `dur` turns.
function tag(id, label, dur, scope, text) {
  return { fx: [{ type: 'apply_status', statusId: id, fixedId: true, duration: dur, scope, metadata: { ...(scope === 'self' || scope === 'ally' || scope === 'all-allies' ? {} : { harmful: true }), tooltipText: `${label}.` } }], text, scope };
}
const cond = (id, self) => ({ scope: self ? 'self' : 'target', statusId: id });
// Extra damage while the target (or, with self, the Pokemon) has the mark/stance.
function bonus(n, id, label, o = {}) {
  const scope = o.who ?? 'target';
  return { fx: [{ type: 'damage', amount: n, scope, condition: cond(id, o.self), metadata: { harmful: true, ...(o.pierce ? { ignoreDamageReduction: true, ignoreDestructibleDefense: true } : {}) } }],
    text: o.self ? `+${n} damage while {name} is ${label}` : `+${n} damage to ${label} enemies`, scope, bonus: true };
}
// Any other part, only while the mark/stance is there.
function when(part, id, label, o = {}) {
  part.fx = part.fx.map((e) => ({ ...e, condition: cond(id, o.self) }));
  part.text = part.text.replace(/\bone enemy\b/, 'it').replace(/\bone ally\b/, 'that ally');
  part.text = o.self ? `while {name} is ${label}, also ${part.text.charAt(0).toLowerCase()}${part.text.slice(1)}` : `if the target is ${label}, ${part.text.charAt(0).toLowerCase()}${part.text.slice(1)}`;
  if (o.text) part.text = o.text;
  part.when = true;
  return part;
}
// Critical hit: pct% chance of +n piercing damage (shown as CRIT). o.up = { id, label, pct }: higher chance while
// the Pokemon has that stance.
function crit(n, pct, o = {}) {
  const meta = { harmful: true, criticalHit: true, ignoreDamageReduction: true, ignoreDestructibleDefense: true };
  if (o.up) meta.chanceBonusIfActorStatus = { statusId: o.up.id, amount: o.up.pct };
  return { fx: [{ type: 'damage', amount: n, scope: o.who ?? 'target', chance: pct, metadata: meta }],
    text: `${pct}% chance to crit for +${n} damage${o.up ? ` (${pct + o.up.pct}% while {name} is ${o.up.label})` : ''}`, scope: o.who ?? 'target', bonus: true };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Join fragments into one or two short sentences.
function describe(parts, name) {
  parts = parts.filter((p) => p.text);
  const main = parts.filter((p) => !p.bonus && !p.when), extra = parts.filter((p) => p.bonus || p.when);
  const t = main.map((p, i) => (i === 0 ? cap(p.text) : p.text.replace(/^Deals /, 'deals ')));
  let out = t.length ? (t.length > 1 ? `${t.slice(0, -1).join(', ')} and ${t[t.length - 1]}.` : `${t[0]}.`) : '';
  for (const p of extra) out += ` ${cap(p.text)}.`;
  return out.trim().replace(/\{name\}/g, name).replace(/ ,/g, ',');
}

module.exports = { crit, mark, tag, bonus, when, weather, ENERGY, cost, damage, overTime, stun, invulnerable, shield, reduce, boost, weaken, expose, heal, regen, drain, gain, cleanse, describe, cap };
