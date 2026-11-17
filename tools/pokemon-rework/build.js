'use strict';
// Writes the reworked kits (kits.js) into characters.js, records each skill's Pokemon type for the
// type system, and lists the reworked ids for the server (stored admin overrides are ignored for them).
// Usage: node tools/pokemon-rework/build.js            (writes)   --check (only prints descriptions)
const fs = require('fs');
const path = require('path');
const D = require('./dsl');
const kits = require('./kits');
const root = path.resolve(__dirname, '../..');
const CHAR_FILE = path.join(root, 'characters.js');
const BASE_REV = process.env.BASE_REV || 'main';
const source = require('child_process').execSync(`git show ${BASE_REV}:characters.js`, { cwd: root, maxBuffer: 1 << 28 }).toString();
const tmp = path.join(root, '.characters-base.tmp.js');
fs.writeFileSync(tmp, source);
let existing;
try { existing = require(tmp); } finally { fs.unlinkSync(tmp); }
const byId = new Map(existing.map((c) => [c.id, c]));
const allSkills = (c) => (c.skills || []).flatMap((s) => [s, ...(s.evolvesTo ? [s.evolvesTo] : [])]);
const types = {};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function fxFor(skillId, parts, target) {
  let n = 0;
  return parts.flatMap((p) => p.fx).map((e) => {
    const out = JSON.parse(JSON.stringify(e));
    if (out.type === 'apply_status') out.statusId = `${skillId.replace(/-/g, '_')}_${++n}`;
    // "ally" in a skill that targets self-or-ally lands on the chosen character.
    if (out.scope === 'ally') out.scope = 'target';
    if (out.scope === 'target' && target === 'all-allies') out.scope = 'all-allies';
    return out;
  });
}
function classesFor(cls, parts) {
  const c = [cls, 'Instant'];
  if (parts.some((p) => p.fx.some((e) => e.metadata?.afflictionDamage)) && cls !== 'Strategic') c.splice(1, 0, 'Affliction');
  return c;
}
function makeSkill(charName, base, over, prior) {
  const s = { ...base, ...over };
  const parts = s.parts;
  const name = (s.name ?? prior?.name ?? base.id).replace(/^[A-Z][a-z]+(-[A-Z][a-z]+)?'s /, '').replace(/^(Pikachu|Persian|Clefable|Wigglytuff|Mega Beedrill|Ivysaur|Charmeleon|Charizard [XY]) /, '');
  const desc = D.describe(parts, charName);
  types[s.id] = s.type;
  return {
    id: s.id, name, skillimage: prior?.skillimage ?? '', skilldescription: desc, description: desc,
    energy: D.cost(s.cost), cooldown: s.cd, target: s.target, damage: 0, classes: classesFor(s.cls, parts),
    effects: fxFor(s.id, parts, s.target),
  };
}

const lines = [];
let trainerPatch = null;
const built = new Map();
for (const k of kits) {
  const old = byId.get(k.id);
  if (!old) throw new Error(`No character ${k.id}`);
  const name = old.name, evolved = k.evolve?.into;
  const skills = k.skills.map((s) => {
    const prior = allSkills(old).find((x) => x.id === s.id);
    if (!prior) throw new Error(`${k.id}: unknown skill ${s.id}`);
    if (s.keepEffects) { // e.g. Metronome: the effect itself stays, the rest follows the new rules
      types[s.id] = s.type; if (prior.evolvesTo) types[prior.evolvesTo.id] = s.type;
      return { ...JSON.parse(JSON.stringify(prior)), energy: D.cost(s.cost), cooldown: s.cd, ...(prior.evolvesTo ? { evolvesTo: { ...JSON.parse(JSON.stringify(prior.evolvesTo)), energy: D.cost(s.cost), cooldown: s.cd } } : {}) };
    }
    const skill = makeSkill(name, s, {}, { ...prior, name: s.name ?? prior.name });
    if (k.evolve && s.evo) {
      const ev = s.evo === true ? {} : s.evo;
      const evoId = ev.id ?? `${s.id}-evolved`;
      const evoPrior = allSkills(old).find((x) => x.id === evoId);
      const parts = ev.parts ?? s.parts;
      const evoName = ev.name ?? (evoPrior && !/'s |^(Charmeleon|Ivysaur|Persian|Clefable|Wigglytuff|Mega)/.test(evoPrior.name) ? evoPrior.name : (s.name ?? prior.name));
      skill.evolvesTo = makeSkill(evolved, { ...s, ...ev, id: evoId, parts }, {}, { skillimage: evoPrior?.skillimage ?? prior.skillimage, name: evoName });
    }
    return skill;
  });
  for (const s of k.extra ?? []) { // separate skills that swap in (e.g. a skin's evolved form)
    const prior = allSkills(old).find((x) => x.id === s.id);
    if (!prior) throw new Error(`${k.id}: unknown skill ${s.id}`);
    skills.push(makeSkill(s.charName ?? name, s, {}, { ...prior, name: s.name ?? prior.name }));
  }
  let startStatuses = [];
  if (k.evolve) {
    const e = k.evolve, prior = allSkills(old).find((x) => x.id === e.passive);
    const text = `At the start of its 4th turn, ${name} evolves into ${e.into} and its skills get stronger.`;
    types[e.passive] = types[k.skills[0].id];
    skills.push({ id: e.passive, name: `Evolution: ${e.into}`, skillimage: prior?.skillimage ?? old.facePicture, skilldescription: text, description: text,
      energy: [], cooldown: 0, target: '', damage: 0, classes: ['Passive', 'Instant'], effects: [] });
    startStatuses = [{ statusId: e.tracker, sourceSkillId: e.passive, duration: 3, metadata: { unremovable: true, tooltipText: `Evolves into ${e.into} at the start of its 4th turn.`,
      onExpireApplyStatusToSelf: { statusId: e.status, duration: 999, metadata: { infiniteDuration: true, unremovable: true, useEvolvedSkills: true, facePictureOverride: e.face, tooltipText: `${name} has evolved into ${e.into}.` } } } }];
  }
  const about = `${k.about}`;
  const next = { id: old.id, characterId: old.characterId ?? old.id, name, facePicture: old.facePicture, arena: old.arena, universe: old.universe,
    role: k.role, roleCategory: slug(k.role), description: about, descriptionHtml: esc(about), characterdeescription: old.characterdeescription,
    pokemonTypes: old.pokemonTypes, startStatuses, skills };
  built.set(k.id, next);
  lines.push(`\n${name} (${k.role}) - ${about}`);
  for (const s of skills) {
    lines.push(`  ${s.name} [${s.energy.map((x) => Object.entries(D.ENERGY).find(([, v]) => v === x)[0]).join('') || '-'} cd${s.cooldown}] ${s.skilldescription}`);
    if (s.evolvesTo) lines.push(`    -> ${s.evolvesTo.name} [${s.evolvesTo.energy.map((x) => Object.entries(D.ENERGY).find(([, v]) => v === x)[0]).join('')} cd${s.evolvesTo.cooldown}] ${s.evolvesTo.skilldescription}`);
  }
}
fs.writeFileSync(path.join(__dirname, 'KITS.txt'), lines.join('\n').trim() + '\n');
if (process.argv.includes('--check')) { console.log(lines.join('\n')); process.exit(0); }

// Pokemon Trainer's Rare Candy evolves an ally on the spot: point it at the new evolutions.
{
  const trainer = JSON.parse(JSON.stringify(byId.get('pokemon-trainer')));
  const evo = new Map(kits.filter((k) => k.evolve).map((k) => [k.evolve.status, k.evolve]));
  let fixed = 0;
  const walk = (o) => { if (Array.isArray(o)) return o.forEach(walk); if (!o || typeof o !== 'object') return;
    const e = evo.get(o.statusId);
    if (e && o.metadata && (o.metadata.skillReplacements || o.metadata.useEvolvedSkills)) {
      delete o.metadata.skillReplacements; o.metadata.useEvolvedSkills = true; o.metadata.facePictureOverride = e.face; o.metadata.removeStatusIdsOnApply = [e.tracker]; fixed++;
    }
    Object.values(o).forEach(walk); };
  walk(trainer.skills.find((x) => x.id === 'pokemon-trainer-rare-candy'));
  trainerPatch = { id: 'pokemon-trainer', skill: trainer.skills.find((x) => x.id === 'pokemon-trainer-rare-candy'), fixed };
}
// Splice each reworked character over its old object in characters.js (everything else is untouched).
const start = source.indexOf('[');
const ranges = [];
let depth = 0, inStr = false, q = '', objStart = -1;
for (let i = start; i < source.length; i++) {
  const ch = source[i];
  if (inStr) { if (ch === '\\') i++; else if (ch === q) inStr = false; continue; }
  if (ch === '"' || ch === "'" || ch === '`') { inStr = true; q = ch; continue; }
  if (ch === '[' || ch === '{') { depth++; if (depth === 2 && ch === '{') objStart = i; }
  else if (ch === ']' || ch === '}') { if (depth === 2 && ch === '}') ranges.push([objStart, i + 1]); depth--; if (depth === 0) break; }
}
let out = source, replaced = 0;
for (const [a, b] of ranges.reverse()) {
  const m = source.slice(a, a + 400).match(/"id"\s*:\s*"([^"]+)"/);
  if (!m || !built.has(m[1])) continue;
  const json = JSON.stringify(built.get(m[1]), null, 4).split('\n').map((l, i) => (i ? '    ' + l : l)).join('\n');
  out = out.slice(0, a) + json + out.slice(b); replaced++;
}
if (replaced !== built.size) throw new Error(`replaced ${replaced} of ${built.size}`);
// Only Rare Candy's evolution statuses change in the Trainer's entry: patch that skill's effects text in place.
{
  const t0 = out.search(/"id"\s*:\s*"pokemon-trainer-rare-candy"/);
  if (t0 < 0) throw new Error('Rare Candy not found');
  const e0 = out.indexOf('"effects"', t0), a0 = out.indexOf('[', e0);
  let d = 0, i = a0, str = false;
  for (; i < out.length; i++) { const ch = out[i]; if (str) { if (ch === '\\') i++; else if (ch === '"') str = false; continue; } if (ch === '"') str = true; else if (ch === '[') d++; else if (ch === ']') { d--; if (!d) break; } }
  const indent = (out.slice(out.lastIndexOf('\n', e0) + 1, e0).match(/^\s*/) || [''])[0];
  const json = JSON.stringify(trainerPatch.skill.effects, null, 4).split('\n').map((l, j) => (j ? indent + l : l)).join('\n');
  out = out.slice(0, a0) + json + out.slice(i + 1);
  console.log(`Rare Candy: ${trainerPatch.fixed} evolutions pointed at the new kits`);
}
fs.writeFileSync(CHAR_FILE, out);
fs.writeFileSync(path.join(root, 'pokemonReworkData.js'), `'use strict';\n// Written by tools/pokemon-rework/build.js: the Pokemon Arena rework.\n// Move type of every reworked skill, and the reworked characters (stored admin overrides are ignored for them).\nconst POKEMON_REWORK_SKILL_TYPES = ${JSON.stringify(types, null, 4)};\nconst POKEMON_REWORKED_IDS = ${JSON.stringify([...built.keys()])};\nmodule.exports = { POKEMON_REWORK_SKILL_TYPES, POKEMON_REWORKED_IDS };\n`);
console.log(`rewrote ${replaced} characters, ${Object.keys(types).length} skill types`);
