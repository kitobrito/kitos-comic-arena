'use strict';
// Pokemon Arena rework (V.4.0): simple kits where every skill connects back to one MAIN skill.
// The main skill puts a named mark on enemies (Burned, Static, Poisoned...) or a stance on the Pokemon itself
// (In its shell, Focused...), and every other skill says plainly how it uses it. Some skills can crit.
// Evolving Pokemon evolve at the start of their 4th turn with the same combo and bigger numbers.
// Skill ids and art stay the same (missions, animations, skins and history keep working).
const D = require('./dsl');
const { crit, mark, tag, bonus, when, weather, damage: dmg, overTime: dot, stun, invulnerable: inv, shield, reduce, boost, weaken, expose, heal, regen, drain, gain, cleanse } = D;
const S = (id, o) => ({ id, ...o });
const after = (p) => { p.text = p.text.replace(/^Deals (\d+) affliction damage to .*? each turn/, 'then $1 affliction damage each turn').replace(/^(stuns|stops) one enemy/, '$1 the target').replace(/one enemy/, 'the target'); return p; };
const A = after;
const protect = (id, name = 'Protect', extra = [], evoExtra) => S(id, { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name, parts: [inv(1), ...extra], evo: { name, parts: [inv(1), ...(evoExtra ?? extra)] } });

// Marks on enemies. `who` 'all-enemy' marks everyone hit.
const burn = (id, n, who = 'target', dur = 2) => mark(dot(n, dur, { who }), id, 'Burned', `${who === 'all-enemy' ? 'Burns all enemies' : 'Burns the target'} (${n} affliction damage each turn for ${dur} turns)`);
const poison = (id, n, dur, who = 'target') => mark(dot(n, dur, { who }), id, 'Poisoned', `${who === 'all-enemy' ? 'Poisons all enemies' : 'Poisons the target'} (${n} affliction damage each turn for ${dur} turns)`);
const named = (id, label, verb, who = 'target', dur = 2) => tag(id, label, dur, who, `${verb} for ${dur} turns`);
const stance = (id, label, parts, text) => { const p = { fx: parts.flatMap((x) => x.fx), text, scope: 'self' }; p.fx = p.fx.map((e) => (e.type === 'apply_status' ? { ...e, statusId: id, fixedId: true, metadata: { ...e.metadata, tooltipText: `${label}: ${e.metadata?.tooltipText ?? ''}`.trim() } } : e)); if (!p.fx.some((e) => e.type === 'apply_status')) p.fx.push(tag(id, label, 2, 'self', '').fx[0]); return p; };
// Only one status per stance is allowed to carry the id: split extra statuses onto their own ids.
const stanceOf = (id, label, dur, text, extras = []) => { const t = tag(id, label, dur, 'self', text); t.fx.push(...extras.flatMap((x) => x.fx)); return t; };

const KITS = [
  // ---------------------------------------------------------------- Kanto starters
  { id: 'charmander', role: 'Damage over time', about: 'Ember Burns enemies, and every other skill hits Burned enemies harder.',
    evolve: { into: 'Charmeleon', face: 'assets/images/PokemonArena/Charmander/charmeleonfp.jpg', status: 'charmander_charmeleon_evolution', tracker: 'charmander_evolution_tracker', passive: 'charmander-passive-evolution-charmeleon' },
    skills: [
      S('charmander-ember', { type: 'Fire', cls: 'Special', cost: 'R', cd: 0, target: 'single-enemy', main: true, parts: [dmg(10), burn('charmander_burn', 5)], evo: { id: 'charmander-fire-punch', name: 'Fire Punch', cls: 'Physical', parts: [dmg(15), burn('charmander_burn', 10)] } }),
      S('charmander-scratch', { type: 'Normal', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'charmander_burn', 'Burned'), crit(10, 20)], evo: { id: 'charmander-dragon-claw', name: 'Dragon Claw', type: 'Dragon', parts: [dmg(25), bonus(15, 'charmander_burn', 'Burned'), crit(10, 25)] } }),
      S('charmander-flamethrower', { type: 'Fire', cls: 'Special', cost: 'RX', cd: 2, target: 'all-enemy', parts: [dmg(10, { who: 'all-enemy' }), bonus(10, 'charmander_burn', 'Burned', { who: 'all-enemy' })], evo: { id: 'charmander-charmeleon-flamethrower', parts: [dmg(15, { who: 'all-enemy' }), bonus(15, 'charmander_burn', 'Burned', { who: 'all-enemy' })] } }),
      protect('charmander-rage'),
    ] },
  { id: 'squirtle', role: 'Tank', about: 'Withdraw puts Squirtle in its shell; its water attacks hit harder while it is inside.',
    evolve: { into: 'Wartortle', face: 'assets/images/PokemonArena/squirtle/wartortlefp.jpg', status: 'squirtle_wartortle_evolution', tracker: 'squirtle_evolution_tracker', passive: 'squirtle-passive-evolution-wartortle' },
    skills: [
      S('squirtle-withdraw', { type: 'Water', cls: 'Strategic', cost: 'X', cd: 2, target: 'self', main: true, parts: [mark(shield(25, 2), 'squirtle_shell', 'In its shell', 'Squirtle goes into its shell for 2 turns: 25 destructible defense')], evo: { id: 'wartortle-shell-guard', parts: [mark(shield(35, 2), 'squirtle_shell', 'In its shell', 'Wartortle goes into its shell for 2 turns: 35 destructible defense')] } }),
      S('squirtle-water-gun', { type: 'Water', cls: 'Special', cost: 'B', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'squirtle_shell', 'in its shell', { self: true })], evo: { id: 'wartortle-hydro-pump', name: 'Hydro Pump', cost: 'BX', cd: 1, parts: [dmg(30), bonus(15, 'squirtle_shell', 'in its shell', { self: true }), crit(10, 20)] } }),
      S('squirtle-bubble', { type: 'Water', cls: 'Special', cost: 'BX', cd: 1, target: 'single-enemy', parts: [dmg(20), A(weaken(10, 1, { after: true })), when(stun(1), 'squirtle_shell', 'in its shell', { self: true })], evo: { id: 'wartortle-bubblebeam', target: 'all-enemy', cost: 'BXX', parts: [dmg(20, { who: 'all-enemy' }), A(weaken(10, 1, { who: 'all-enemy', after: true })), bonus(10, 'squirtle_shell', 'in its shell', { self: true, who: 'all-enemy' })] } }),
      protect('squirtle-rapid-spin'),
    ] },
  { id: 'bulbasaur', role: 'Drain & sustain', about: 'Leech Seed drains an enemy; Bulbasaur\'s other skills are stronger against Seeded enemies.',
    evolve: { into: 'Ivysaur', face: 'assets/images/PokemonArena/Bulbasaur/ivysaurfp.jpg', status: 'bulbasaur_ivysaur_evolution', tracker: 'bulbasaur_sun_tracker', passive: 'bulbasaur-passive-evolution-ivysaur' },
    skills: [
      S('bulbasaur-leech-seed', { type: 'Grass', cls: 'Special', cost: 'G', cd: 1, target: 'single-enemy', main: true, parts: [mark(dot(10, 3), 'bulbasaur_seed', 'Seeded', 'Seeds one enemy (10 affliction damage each turn for 3 turns)'), regen(5, 3)], evo: { id: 'ivysaur-leech-seed', parts: [mark(dot(15, 3), 'bulbasaur_seed', 'Seeded', 'Seeds one enemy (15 affliction damage each turn for 3 turns)'), regen(10, 3)] } }),
      S('bulbasaur-vine-whip', { type: 'Grass', cls: 'Physical', cost: 'GX', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'bulbasaur_seed', 'Seeded')], evo: { id: 'ivysaur-vine-whip', parts: [dmg(25), bonus(15, 'bulbasaur_seed', 'Seeded'), crit(10, 20)] } }),
      S('bulbasaur-solar-beam', { type: 'Grass', cls: 'Special', cost: 'GXX', cd: 3, target: 'single-enemy', parts: [dmg(40, { pierce: true }), bonus(15, 'bulbasaur_seed', 'Seeded', { pierce: true })], evo: { id: 'ivysaur-solar-beam', parts: [dmg(45, { pierce: true }), bonus(20, 'bulbasaur_seed', 'Seeded', { pierce: true })] } }),
      S('bulbasaur-razor-leaf', { type: 'Grass', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Synthesis', parts: [inv(1)], evo: { id: 'ivysaur-razor-leaf', name: 'Synthesis', parts: [inv(1), heal(15)] } }),
    ] },
  { id: 'pikachu', role: 'Burst damage', about: 'Thundershock gives Static; Volt Tackle and Thunder punish enemies with Static.',
    skills: [
      S('pikachu-thundershock', { type: 'Electric', cls: 'Special', cost: 'Y', cd: 0, target: 'single-enemy', main: true, parts: [dmg(15), named('pikachu_static', 'Static', 'gives the target Static')] }),
      S('pikachu-volt-tackle', { type: 'Electric', cls: 'Physical', cost: 'GY', cd: 1, target: 'single-enemy', parts: [dmg(30, { pierce: true }), bonus(15, 'pikachu_static', 'Static'), crit(10, 25)] }),
      S('pikachu-thunder', { type: 'Electric', cls: 'Special', cost: 'YX', cd: 3, target: 'single-enemy', parts: [dmg(25), A(stun(1)), when(stun(2), 'pikachu_static', 'Static', { text: 'if the target is Static, the stun lasts 2 turns' })] }),
      protect('pikachu-agility', 'Agility'),
    ] },
  { id: 'butterfree', role: 'Controller', about: 'Sleep Powder makes enemies Drowsy; its other skills punish Drowsy enemies.',
    skills: [
      S('butterfree-sleep-powder', { type: 'Grass', cls: 'Special', cost: 'YX', cd: 3, target: 'all-enemy', main: true, parts: [mark(weaken(10, 2, { who: 'all-enemy' }), 'butterfree_drowsy', 'Drowsy', 'Makes all enemies Drowsy for 2 turns: they deal 10 less damage')] }),
      S('butterfree-confusion', { type: 'Psychic', cls: 'Special', cost: 'B', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'butterfree_drowsy', 'Drowsy')] }),
      S('butterfree-stun-spore', { type: 'Grass', cls: 'Special', cost: 'Y', cd: 2, target: 'single-enemy', parts: [dmg(15), when(stun(1), 'butterfree_drowsy', 'Drowsy')] }),
      protect('butterfree-whirlwind'),
    ] },
  { id: 'chansey', role: 'Healer', about: 'Softboil heals an ally and puts Chansey on duty as a Nurse; her other skills are stronger while Nursing.',
    evolve: { into: 'Blissey', face: 'assets/images/PokemonArena/Chansey/blisseyfp.png', status: 'chansey_blissey_evolution', tracker: 'chansey_evolution_tracker', passive: 'chansey-passive-evolution-blissey' },
    skills: [
      S('chansey-softboil', { type: 'Normal', cls: 'Strategic', cost: 'Y', cd: 0, target: 'self-or-single-ally', main: true, parts: [heal(20, { who: 'ally' }), stanceOf('chansey_nursing', 'Nursing', 2, 'Chansey is Nursing for 2 turns')], evo: { id: 'blissey-softboil', parts: [heal(30, { who: 'ally' }), stanceOf('chansey_nursing', 'Nursing', 2, 'Blissey is Nursing for 2 turns')] } }),
      S('chansey-eggbomb', { type: 'Normal', cls: 'Physical', cost: 'X', cd: 0, target: 'single-enemy', parts: [dmg(15), bonus(10, 'chansey_nursing', 'Nursing', { self: true })], evo: { id: 'blissey-eggbomb', parts: [dmg(20), bonus(10, 'chansey_nursing', 'Nursing', { self: true })] } }),
      S('chansey-pokemon-center-healing', { type: 'Normal', cls: 'Strategic', cost: 'YX', cd: 3, target: 'all-allies', parts: [heal(10, { who: 'all-allies' }), when(regen(10, 2, { who: 'all-allies' }), 'chansey_nursing', 'Nursing', { self: true })], evo: { id: 'blissey-pokemon-center-healing', parts: [heal(15, { who: 'all-allies' }), when(regen(15, 2, { who: 'all-allies' }), 'chansey_nursing', 'Nursing', { self: true })] } }),
      S('chansey-emergency-life-support', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 4, target: 'self-or-single-ally', name: 'Safeguard', parts: [inv(1, { who: 'ally' }), when(cleanse({ who: 'ally' }), 'chansey_nursing', 'Nursing', { self: true })], evo: { id: 'blissey-emergency-life-support', name: 'Safeguard', parts: [inv(1, { who: 'ally' }), when(cleanse({ who: 'ally' }), 'chansey_nursing', 'Nursing', { self: true })] } }),
    ] },
  { id: 'koffing', role: 'Poison', about: 'Smog Poisons an enemy; Poison Gas and Self-Destruct hit Poisoned enemies harder.',
    evolve: { into: 'Weezing', face: 'assets/images/PokemonArena/koffing/weezingfp.webp', status: 'koffing_weezing_evolution', tracker: 'koffing_weezing_progress_tracker', passive: 'koffing-passive-evolution-weezing' },
    skills: [
      S('koffing-smog', { type: 'Poison', cls: 'Special', cost: 'B', cd: 1, target: 'single-enemy', main: true, parts: [dmg(10), poison('koffing_poison', 10, 2)], evo: { id: 'koffing-weezing-smog', parts: [dmg(15), poison('koffing_poison', 10, 3)] } }),
      S('koffing-smokescreen', { type: 'Poison', cls: 'Special', cost: 'BX', cd: 3, target: 'all-enemy', name: 'Poison Gas', parts: [poison('koffing_poison', 5, 2, 'all-enemy')], evo: { id: 'koffing-weezing-smokescreen', name: 'Poison Gas', parts: [poison('koffing_poison', 10, 2, 'all-enemy')] } }),
      S('koffing-self-destruct', { type: 'Normal', cls: 'Physical', cost: 'BXX', cd: 4, target: 'all-enemy', parts: [dmg(20, { who: 'all-enemy' }), bonus(15, 'koffing_poison', 'Poisoned', { who: 'all-enemy' }), dmg(20, { who: 'self', pierce: true })], evo: { id: 'koffing-weezing-self-destruct', parts: [dmg(25, { who: 'all-enemy' }), bonus(20, 'koffing_poison', 'Poisoned', { who: 'all-enemy' }), dmg(20, { who: 'self', pierce: true })] } }),
      protect('koffing-haze', 'Haze'),
    ] },
  { id: 'zubat', role: 'Fast damage', about: 'Supersonic Confuses an enemy; Zubat\'s bites hit Confused enemies harder.',
    evolve: { into: 'Golbat', face: 'assets/images/PokemonArena/zubat/golbatfp.webp', status: 'zubat_golbat_evolution', tracker: 'zubat_evolution_tracker', passive: 'zubat-passive-evolution-golbat' },
    skills: [
      S('zubat-supersonic', { type: 'Normal', cls: 'Special', cost: 'Y', cd: 2, target: 'single-enemy', main: true, parts: [mark(weaken(10, 2), 'zubat_confused', 'Confused', 'Confuses one enemy for 2 turns: it deals 10 less damage')], evo: { id: 'golbat-supersonic', parts: [mark(weaken(15, 2), 'zubat_confused', 'Confused', 'Confuses one enemy for 2 turns: it deals 15 less damage')] } }),
      S('zubat-bite', { type: 'Dark', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'zubat_confused', 'Confused'), crit(10, 20)], evo: { id: 'golbat-bite', parts: [dmg(25), bonus(10, 'zubat_confused', 'Confused'), crit(10, 25)] } }),
      S('zubat-leech-life', { type: 'Bug', cls: 'Physical', cost: 'BX', cd: 1, target: 'single-enemy', parts: [dmg(20), heal(15), bonus(10, 'zubat_confused', 'Confused')], evo: { id: 'golbat-leech-life', parts: [dmg(25), heal(20), bonus(10, 'zubat_confused', 'Confused')] } }),
      protect('zubat-draining-fangs', 'Double Team'),
    ] },
  { id: 'gastly', role: 'Disruptor', about: 'Curse haunts an enemy; Lick and Spite are stronger against Cursed enemies.',
    evolve: { into: 'Haunter', face: 'assets/images/PokemonArena/gastley/haunterfp.webp', status: 'gastly_haunter_evolution', tracker: 'gastly_evolution_tracker', passive: 'gastly-passive-evolution-haunter' },
    skills: [
      S('gastly-curse', { type: 'Ghost', cls: 'Special', cost: 'BY', cd: 2, target: 'single-enemy', main: true, parts: [mark(dot(10, 3), 'gastly_curse', 'Cursed', 'Curses one enemy (10 affliction damage each turn for 3 turns)')], evo: { id: 'haunter-curse', parts: [mark(dot(15, 3), 'gastly_curse', 'Cursed', 'Curses one enemy (15 affliction damage each turn for 3 turns)')] } }),
      S('gastly-lick', { type: 'Ghost', cls: 'Physical', cost: 'B', cd: 0, target: 'single-enemy', parts: [dmg(20, { pierce: true }), bonus(10, 'gastly_curse', 'Cursed', { pierce: true })], evo: { id: 'haunter-lick', parts: [dmg(25, { pierce: true }), bonus(10, 'gastly_curse', 'Cursed', { pierce: true })] } }),
      S('gastly-spite', { type: 'Ghost', cls: 'Special', cost: 'Y', cd: 3, target: 'single-enemy', parts: [dmg(10), when(drain(1), 'gastly_curse', 'Cursed')], evo: { id: 'haunter-spite', parts: [dmg(20), when(drain(1), 'gastly_curse', 'Cursed')] } }),
      protect('gastly-glare', 'Vanish'),
    ] },
  { id: 'abra', role: 'Psychic damage', about: 'Calm Mind Focuses Abra; its psychic attacks hit harder and crit more while Focused.',
    evolve: { into: 'Kadabra', face: 'assets/images/PokemonArena/abra/kadabrafp.webp', status: 'abra_kadabra_evolution', tracker: 'abra_calm_mind_tracker', passive: 'abra-passive-evolution-kadabra' },
    skills: [
      S('abra-calm-mind', { type: 'Psychic', cls: 'Strategic', cost: 'Y', cd: 3, target: 'self', main: true, parts: [stanceOf('abra_focus', 'Focused', 2, 'Abra is Focused for 2 turns')], evo: { id: 'kadabra-calm-mind', parts: [stanceOf('abra_focus', 'Focused', 2, 'Kadabra is Focused for 2 turns')] } }),
      S('abra-psychic', { type: 'Psychic', cls: 'Special', cost: 'YX', cd: 0, target: 'single-enemy', parts: [dmg(25), bonus(10, 'abra_focus', 'Focused', { self: true }), crit(15, 10, { up: { id: 'abra_focus', label: 'Focused', pct: 30 } })], evo: { id: 'kadabra-psychic', parts: [dmg(30), bonus(15, 'abra_focus', 'Focused', { self: true }), crit(15, 10, { up: { id: 'abra_focus', label: 'Focused', pct: 30 } })] } }),
      S('abra-future-sight', { type: 'Psychic', cls: 'Special', cost: 'B', cd: 2, target: 'all-enemy', parts: [dmg(15, { who: 'all-enemy' }), bonus(5, 'abra_focus', 'Focused', { self: true, who: 'all-enemy' })], evo: { id: 'kadabra-future-sight', parts: [dmg(20, { who: 'all-enemy' }), bonus(10, 'abra_focus', 'Focused', { self: true, who: 'all-enemy' })] } }),
      protect('abra-teleport', 'Teleport'),
    ] },
  { id: 'krabby', role: 'Bruiser', about: 'Leer Exposes an enemy; Krabby\'s claws crush Exposed enemies.',
    evolve: { into: 'Kingler', face: 'assets/images/PokemonArena/Krabby/kinglerfp.webp', status: 'krabby_kingler_evolution', tracker: 'krabby_harden_turn_tracker', passive: 'krabby-passive-evolution-kingler' },
    skills: [
      S('krabby-leer', { type: 'Normal', cls: 'Special', cost: 'X', cd: 2, target: 'single-enemy', name: 'Leer', main: true, parts: [mark(expose(5, 2), 'krabby_exposed', 'Exposed', 'Exposes one enemy for 2 turns: it takes 5 more damage')], evo: { id: 'kingler-leer', name: 'Leer', parts: [mark(expose(10, 2), 'krabby_exposed', 'Exposed', 'Exposes one enemy for 2 turns: it takes 10 more damage')] } }),
      S('krabby-metal-claw', { type: 'Steel', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', name: 'Metal Claw', parts: [dmg(20), bonus(10, 'krabby_exposed', 'Exposed'), crit(10, 20)], evo: { id: 'kingler-metal-claw', name: 'Metal Claw', parts: [dmg(25), bonus(10, 'krabby_exposed', 'Exposed'), crit(10, 25)] } }),
      S('krabby-crabhammer', { type: 'Water', cls: 'Physical', cost: 'GX', cd: 2, target: 'single-enemy', name: 'Crabhammer', parts: [dmg(30), when(stun(1), 'krabby_exposed', 'Exposed')], evo: { id: 'kingler-crabhammer', name: 'Crabhammer', parts: [dmg(40), when(stun(1), 'krabby_exposed', 'Exposed')] } }),
      S('krabby-harden', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', name: 'Harden', parts: [reduce(10, 2)], evo: { id: 'kingler-harden', name: 'Harden', parts: [reduce(15, 2)] } }),
    ] },
  { id: 'scyther', role: 'Assassin', about: 'Swords Dance Sharpens Scyther\'s blades; its cuts hit harder and crit more while Sharpened.',
    skills: [
      S('scyther-swords-dance', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', main: true, parts: [stanceOf('scyther_sharp', 'Sharpened', 2, 'Scyther is Sharpened for 2 turns')] }),
      S('scyther-fury-cutter', { type: 'Bug', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'scyther_sharp', 'Sharpened', { self: true }), crit(10, 20, { up: { id: 'scyther_sharp', label: 'Sharpened', pct: 30 } })] }),
      S('scyther-x-cutter', { type: 'Bug', cls: 'Physical', cost: 'GG', cd: 1, target: 'single-enemy', parts: [dmg(35, { pierce: true }), bonus(10, 'scyther_sharp', 'Sharpened', { self: true, pierce: true })] }),
      protect('scyther-double-team', 'Double Team'),
    ] },
  // ---------------------------------------------------------------- Eeveelutions
  { id: 'eevee', role: 'All-rounder', about: 'Swift Locks On to an enemy; Dig and Hidden Power hit the Locked On enemy harder.',
    skills: [
      S('eevee-swift', { type: 'Normal', cls: 'Special', cost: 'X', cd: 0, target: 'single-enemy', main: true, parts: [dmg(15, { pierce: true }), named('eevee_lock', 'Locked On', 'Locks On to the target')] }),
      S('eevee-dig', { type: 'Ground', cls: 'Physical', cost: 'GX', cd: 2, target: 'single-enemy', parts: [inv(1), dmg(25), bonus(10, 'eevee_lock', 'Locked On'), crit(10, 20)] }),
      S('eevee-hidden-power', { type: 'Normal', cls: 'Special', cost: 'XX', cd: 2, target: 'all-enemy', parts: [dmg(15, { who: 'all-enemy' }), bonus(15, 'eevee_lock', 'Locked On', { who: 'all-enemy' })] }),
      protect('eevee-protect'),
    ] },
  { id: 'jolteon', role: 'Fast damage', about: 'Pin Missile Paralyzes an enemy; Thunderbolt and Thunder Fang punish Paralyzed enemies.',
    skills: [
      S('jolteon-pin-missile', { type: 'Bug', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', main: true, parts: [dmg(15), named('jolteon_para', 'Paralyzed', 'Paralyzes the target'), crit(10, 25)] }),
      S('jolteon-thunderbolt', { type: 'Electric', cls: 'Special', cost: 'YX', cd: 0, target: 'single-enemy', parts: [dmg(30), bonus(10, 'jolteon_para', 'Paralyzed')] }),
      S('jolteon-thunder-fang', { type: 'Electric', cls: 'Physical', cost: 'GY', cd: 2, target: 'single-enemy', parts: [dmg(20), when(stun(1), 'jolteon_para', 'Paralyzed')] }),
      protect('jolteon-charge', 'Agility'),
    ] },
  { id: 'flareon', role: 'Damage over time', about: 'Fire Spin Burns an enemy; Fire Blast and Heating Up punish Burned enemies.',
    skills: [
      S('flareon-fire-spin', { type: 'Fire', cls: 'Special', cost: 'R', cd: 1, target: 'single-enemy', main: true, parts: [dmg(10), burn('flareon_burn', 10)] }),
      S('flareon-fire-blast', { type: 'Fire', cls: 'Special', cost: 'RX', cd: 2, target: 'single-enemy', parts: [dmg(30), bonus(15, 'flareon_burn', 'Burned'), crit(10, 20)] }),
      S('flareon-heating-up', { type: 'Fire', cls: 'Special', cost: 'RX', cd: 3, target: 'all-enemy', name: 'Heat Wave', parts: [dmg(10, { who: 'all-enemy' }), bonus(10, 'flareon_burn', 'Burned', { who: 'all-enemy' })] }),
      protect('flareon-double-team', 'Double Team'),
    ] },
  { id: 'vaporeon', role: 'Healer', about: 'Aqua Ring surrounds the team with water; Vaporeon hits harder and heals more while in its Aqua Ring.',
    skills: [
      S('vaporeon-sand-attack', { type: 'Water', cls: 'Strategic', cost: 'B', cd: 2, target: 'all-allies', name: 'Aqua Ring', main: true, parts: [mark(regen(10, 2, { who: 'all-allies' }), 'vaporeon_ring', 'Aqua Ring', 'Surrounds all allies with an Aqua Ring for 2 turns: they heal 10 each turn')] }),
      S('vaporeon-aurora-beam', { type: 'Ice', cls: 'Special', cost: 'B', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'vaporeon_ring', 'in its Aqua Ring', { self: true })] }),
      S('vaporeon-hydro-pump', { type: 'Water', cls: 'Special', cost: 'BX', cd: 1, target: 'single-enemy', parts: [dmg(30), bonus(10, 'vaporeon_ring', 'in its Aqua Ring', { self: true }), crit(10, 20)] }),
      S('vaporeon-acid-armor', { type: 'Poison', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', parts: [inv(1), when(heal(15), 'vaporeon_ring', 'in its Aqua Ring', { self: true })] }),
    ] },
  // ---------------------------------------------------------------- More Kanto
  { id: 'ekans', role: 'Poison', about: 'Toxic Poisons an enemy; Poison Fang and Wrap are stronger against Poisoned enemies.',
    evolve: { into: 'Arbok', face: 'assets/images/PokemonArena/ekans/arbokfp.jpg', status: 'ekans_arbok_evolution', tracker: 'ekans_evolution_tracker', passive: 'ekans-passive-evolution-arbok' },
    skills: [
      S('ekans-toxic', { type: 'Poison', cls: 'Special', cost: 'R', cd: 2, target: 'single-enemy', main: true, parts: [poison('ekans_poison', 10, 3)], evo: { id: 'arbok-toxic', parts: [poison('ekans_poison', 15, 3)] } }),
      S('ekans-poison-fang', { type: 'Poison', cls: 'Physical', cost: 'R', cd: 0, target: 'single-enemy', name: 'Poison Fang', parts: [dmg(20), bonus(10, 'ekans_poison', 'Poisoned'), crit(10, 20)], evo: { id: 'arbok-poison-fang', name: 'Poison Fang', parts: [dmg(25), bonus(10, 'ekans_poison', 'Poisoned'), crit(10, 25)] } }),
      S('ekans-crunch', { type: 'Normal', cls: 'Physical', cost: 'RX', cd: 3, target: 'single-enemy', name: 'Wrap', parts: [dmg(20), when(stun(1), 'ekans_poison', 'Poisoned')], evo: { id: 'arbok-crunch', name: 'Wrap', parts: [dmg(30), when(stun(1), 'ekans_poison', 'Poisoned')] } }),
      protect('ekans-shed-skin', 'Shed Skin'),
    ] },
  { id: 'machop', role: 'Bruiser', about: 'Bulk Up powers Machop up; its punches hit harder and crit more while Bulked Up.',
    evolve: { into: 'Machoke', face: 'assets/images/PokemonArena/machop/machokefp.png', status: 'machop_machoke_evolution', tracker: 'machop_evolution_tracker', passive: 'machop-passive-evolution-machoke' },
    skills: [
      S('machop-bulk-up', { type: 'Fighting', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', main: true, parts: [stanceOf('machop_bulk', 'Bulked Up', 2, 'Machop is Bulked Up for 2 turns and takes 10 less damage', reduce(10, 2).fx ? [reduce(10, 2)] : [])], evo: { id: 'machoke-bulk-up', parts: [stanceOf('machop_bulk', 'Bulked Up', 2, 'Machoke is Bulked Up for 2 turns and takes 15 less damage', [reduce(15, 2)])] } }),
      S('machop-brick-break', { type: 'Fighting', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20, { pierce: true }), bonus(10, 'machop_bulk', 'Bulked Up', { self: true, pierce: true })], evo: { id: 'machoke-brick-break', parts: [dmg(25, { pierce: true }), bonus(10, 'machop_bulk', 'Bulked Up', { self: true, pierce: true })] } }),
      S('machop-taunt', { type: 'Fighting', cls: 'Physical', cost: 'GX', cd: 2, target: 'single-enemy', name: 'Karate Chop', parts: [dmg(30), crit(15, 10, { up: { id: 'machop_bulk', label: 'Bulked Up', pct: 30 } })], evo: { id: 'machoke-taunt', name: 'Cross Chop', parts: [dmg(40), crit(15, 10, { up: { id: 'machop_bulk', label: 'Bulked Up', pct: 30 } })] } }),
      protect('machop-counter', 'Detect'),
    ] },
  { id: 'magikarp', role: 'Late bloomer', about: 'Splash makes Magikarp Determined; it fights a little better while Determined, and becomes a raging Gyarados.',
    evolve: { into: 'Gyarados', face: 'assets/images/PokemonArena/magikarp/gyaradosfp.png', status: 'magikarp_gyarados_evolution', tracker: 'magikarp_evolution_tracker', passive: 'magikarp-passive-evolution-gyarados' },
    skills: [
      S('magikarp-splash', { type: 'Water', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', main: true, parts: [inv(1), stanceOf('magikarp_rage', 'Determined', 2, 'is Determined for 2 turns')],
        evo: { id: 'gyarados-hyper-beam', name: 'Dragon Dance', type: 'Dragon', cls: 'Strategic', cost: 'X', cd: 3, parts: [inv(1), stanceOf('magikarp_rage', 'Raging', 2, 'is Raging for 2 turns')] } }),
      S('magikarp-tackle', { type: 'Normal', cls: 'Physical', cost: 'X', cd: 0, target: 'single-enemy', parts: [dmg(10), bonus(10, 'magikarp_rage', 'Determined', { self: true })], evo: { id: 'gyarados-dragon-rage', cost: 'GX', parts: [dmg(30), bonus(15, 'magikarp_rage', 'Raging', { self: true }), crit(10, 25)] } }),
      S('magikarp-flail', { type: 'Normal', cls: 'Physical', cost: 'X', cd: 1, target: 'single-enemy', parts: [dmg(15), bonus(5, 'magikarp_rage', 'Determined', { self: true }), crit(15, 30)], evo: { id: 'gyarados-hydro-pump', type: 'Water', cls: 'Special', target: 'all-enemy', cost: 'BXX', cd: 2, parts: [dmg(25, { who: 'all-enemy' }), bonus(10, 'magikarp_rage', 'Raging', { self: true, who: 'all-enemy' })] } }),
      S('magikarp-struggle', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 2, target: 'self', parts: [shield(20, 2)], evo: { id: 'gyarados-ice-fang', type: 'Ice', cls: 'Physical', target: 'single-enemy', cost: 'BX', cd: 3, parts: [dmg(25), when(stun(1), 'magikarp_rage', 'Raging', { self: true })] } }),
    ] },
  { id: 'mr-mime', role: 'Protector', about: 'Light Screen Screens the team; Mr. Mime\'s other skills get stronger while it is Screened.',
    skills: [
      S('mr-mime-light-screen', { type: 'Psychic', cls: 'Strategic', cost: 'B', cd: 2, target: 'all-allies', main: true, parts: [mark(shield(15, 2, { who: 'all-allies' }), 'mrmime_screen', 'Screened', 'Screens all allies for 2 turns: 15 destructible defense')] }),
      S('mr-mime-dazzling-gleam', { type: 'Fairy', cls: 'Special', cost: 'BX', cd: 1, target: 'all-enemy', parts: [dmg(15, { who: 'all-enemy' }), bonus(10, 'mrmime_screen', 'Screened', { self: true, who: 'all-enemy' })] }),
      S('mr-mime-forcefield', { type: 'Psychic', cls: 'Strategic', cost: 'X', cd: 2, target: 'self-or-single-ally', name: 'Barrier', parts: [reduce(10, 2, { who: 'ally' }), when(reduce(10, 2, { who: 'ally' }), 'mrmime_screen', 'Screened', { text: 'if that ally is Screened, it takes 20 less damage instead' })] }),
      protect('mr-mime-safeguard', 'Safeguard'),
    ] },
  { id: 'hitmonchan', role: 'Fast damage', about: 'Fire Punch Burns an enemy; Mega Punch and Thunder Punch punish Burned enemies.',
    skills: [
      S('hitmonchan-fire-punch', { type: 'Fire', cls: 'Physical', cost: 'GR', cd: 1, target: 'single-enemy', main: true, parts: [dmg(15), burn('hitmonchan_burn', 10)] }),
      S('hitmonchan-mega-punch', { type: 'Normal', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'hitmonchan_burn', 'Burned'), crit(10, 25)] }),
      S('hitmonchan-thunder-punch', { type: 'Electric', cls: 'Physical', cost: 'GY', cd: 2, target: 'single-enemy', parts: [dmg(20), when(stun(1), 'hitmonchan_burn', 'Burned')] }),
      protect('hitmonchan-ice-punch', 'Detect'),
    ] },
  { id: 'hitmonlee', role: 'Burst damage', about: 'Focus Energy Focuses Hitmonlee; its kicks hit harder and crit far more while Focused.',
    skills: [
      S('hitmonlee-focus-energy', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', main: true, parts: [stanceOf('hitmonlee_focus', 'Focused', 2, 'Hitmonlee is Focused for 2 turns')] }),
      S('hitmonlee-double-kick', { type: 'Fighting', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'hitmonlee_focus', 'Focused', { self: true })] }),
      S('hitmonlee-high-jump-kick', { type: 'Fighting', cls: 'Physical', cost: 'GG', cd: 2, target: 'single-enemy', parts: [dmg(40), dmg(10, { who: 'self', pierce: true }), crit(20, 15, { up: { id: 'hitmonlee_focus', label: 'Focused', pct: 50 } })] }),
      protect('hitmonlee-mega-kick', 'Detect'),
    ] },
  { id: 'magnemite', role: 'Area damage', about: 'Thunder Wave Paralyzes an enemy; Spark and Discharge hit Paralyzed enemies harder.',
    evolve: { into: 'Magneton', face: 'assets/images/PokemonArena/mangemite/magnetonfp.webp', status: 'magnemite_magneton_evolution', tracker: 'magnemite_evolution_tracker', passive: 'magnemite-passive-evolution-magneton' },
    skills: [
      S('magnemite-thunder-wave', { type: 'Electric', cls: 'Special', cost: 'Y', cd: 3, target: 'single-enemy', main: true, parts: [mark(stun(1), 'magnemite_para', 'Paralyzed', 'Paralyzes one enemy: stunned for 1 turn')], evo: { id: 'magneton-thunder-wave', parts: [dmg(10), mark(stun(1), 'magnemite_para', 'Paralyzed', 'paralyzes it: stunned for 1 turn')] } }),
      S('magnemite-spark', { type: 'Electric', cls: 'Physical', cost: 'Y', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'magnemite_para', 'Paralyzed')], evo: { id: 'magneton-spark', parts: [dmg(25), bonus(10, 'magnemite_para', 'Paralyzed'), crit(10, 20)] } }),
      S('magnemite-swift', { type: 'Normal', cls: 'Special', cost: 'YX', cd: 1, target: 'all-enemy', name: 'Discharge', parts: [dmg(15, { who: 'all-enemy' }), bonus(10, 'magnemite_para', 'Paralyzed', { who: 'all-enemy' })], evo: { id: 'magneton-flash-cannon', parts: [dmg(20, { who: 'all-enemy' }), bonus(15, 'magnemite_para', 'Paralyzed', { who: 'all-enemy' })] } }),
      protect('magnemite-magnet-rise', 'Magnet Rise'),
    ] },
  { id: 'onix', role: 'Tank', about: 'Harden turns Onix to stone; it hits back harder while Hardened.',
    skills: [
      S('onix-harden', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', main: true, parts: [mark(shield(30, 3), 'onix_hard', 'Hardened', 'Onix is Hardened for 3 turns: 30 destructible defense')] }),
      S('onix-rock-throw', { type: 'Rock', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'onix_hard', 'Hardened', { self: true })] }),
      S('onix-iron-tail', { type: 'Steel', cls: 'Physical', cost: 'GX', cd: 2, target: 'single-enemy', parts: [dmg(25), A(weaken(10, 2, { after: true })), when(stun(1), 'onix_hard', 'Hardened', { self: true })] }),
      S('onix-stealth-rock', { type: 'Rock', cls: 'Special', cost: 'XX', cd: 3, target: 'all-enemy', parts: [dmg(10, { who: 'all-enemy' }), A(dot(5, 3, { who: 'all-enemy' })), bonus(10, 'onix_hard', 'Hardened', { self: true, who: 'all-enemy' })] }),
    ] },
  { id: 'meowth', role: 'Energy thief', about: 'Pay Day steals energy and makes Meowth Lucky; its claws hit harder and crit more while Lucky.',
    evolve: { into: 'Persian', face: 'assets/images/PokemonArena/Meowth/persiannewfacepicture.png', status: 'meowth_persian_evolution', tracker: 'meowth_persian_evolution_tracker', passive: 'meowth-passive-evolution-persian' },
    skills: [
      S('meowth-pay-day', { type: 'Normal', cls: 'Physical', cost: 'X', cd: 3, target: 'single-enemy', main: true, parts: [dmg(10), drain(1), gain(1), stanceOf('meowth_lucky', 'Lucky', 2, 'Meowth is Lucky for 2 turns')], evo: { id: 'persian-pay-day', parts: [dmg(20), drain(1), gain(1), stanceOf('meowth_lucky', 'Lucky', 2, 'Persian is Lucky for 2 turns')] } }),
      S('meowth-fury-swipes', { type: 'Normal', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), crit(10, 15, { up: { id: 'meowth_lucky', label: 'Lucky', pct: 35 } })], evo: { id: 'persian-fury-swipes', parts: [dmg(25), crit(15, 15, { up: { id: 'meowth_lucky', label: 'Lucky', pct: 35 } })] } }),
      S('meowth-night-slash', { type: 'Dark', cls: 'Physical', cost: 'GX', cd: 2, target: 'single-enemy', parts: [dmg(25, { pierce: true }), bonus(15, 'meowth_lucky', 'Lucky', { self: true, pierce: true })], evo: { id: 'persian-night-slash', parts: [dmg(35, { pierce: true }), bonus(15, 'meowth_lucky', 'Lucky', { self: true, pierce: true })] } }),
      S('meowth-fake-out', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Feint', parts: [inv(1)], evo: { id: 'persian-fake-out', name: 'Feint', parts: [inv(1)] } }),
    ] },
  { id: 'clefairy', role: 'Support', about: 'Moonlight heals an ally and makes Clefairy Moonlit; its slaps hit harder while Moonlit, and Metronome casts a random surprise.',
    evolve: { into: 'Clefable', face: 'assets/images/PokemonArena/clefairy/clefablefp.webp', status: 'clefairy_clefable_evolution', tracker: 'clefairy_evolution_tracker', passive: 'clefairy-evolution-clefable' },
    skills: [
      S('clefairy-moonlight', { type: 'Fairy', cls: 'Strategic', cost: 'R', cd: 1, target: 'self-or-single-ally', main: true, parts: [heal(20, { who: 'ally' }), stanceOf('clefairy_moon', 'Moonlit', 2, 'Clefairy is Moonlit for 2 turns')], evo: { id: 'clefable-moonlight', parts: [heal(30, { who: 'ally' }), stanceOf('clefairy_moon', 'Moonlit', 2, 'Clefable is Moonlit for 2 turns')] } }),
      S('clefairy-double-slap', { type: 'Normal', cls: 'Physical', cost: 'X', cd: 0, target: 'single-enemy', parts: [dmg(15), bonus(15, 'clefairy_moon', 'Moonlit', { self: true })], evo: { id: 'clefable-double-slap', parts: [dmg(20), bonus(15, 'clefairy_moon', 'Moonlit', { self: true })] } }),
      S('clefairy-metronome', { type: 'Normal', cls: 'Special', cost: 'X', cd: 2, target: 'single-character', keepEffects: true }),
      S('clefairy-disarming-voice', { type: 'Fairy', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Protect', parts: [inv(1), when(heal(10), 'clefairy_moon', 'Moonlit', { self: true })], evo: { id: 'clefable-disarming-voice', name: 'Protect', parts: [inv(1), when(heal(15), 'clefairy_moon', 'Moonlit', { self: true })] } }),
    ] },
  { id: 'jigglypuff', role: 'Controller', about: 'Sing puts an enemy to Sleep; Pound and Wish are stronger after singing.',
    evolve: { into: 'Wigglytuff', face: 'assets/images/PokemonArena/jigglypuff/wigglytufffp.webp', status: 'jigglypuff_wigglytuff_evolution', tracker: 'jigglypuff_evolution_tracker', passive: 'jigglypuff-evolution-wigglytuff' },
    skills: [
      S('jigglypuff-sing', { type: 'Normal', cls: 'Special', cost: 'BX', cd: 3, target: 'single-enemy', main: true, parts: [mark(stun(1), 'jigglypuff_sleep', 'Asleep', 'Puts one enemy to Sleep: stunned for 1 turn'), stanceOf('jigglypuff_encore', 'Encore', 2, 'Jigglypuff gets an Encore for 2 turns')], evo: { id: 'wigglytuff-sing', parts: [mark(stun(2), 'jigglypuff_sleep', 'Asleep', 'Puts one enemy to Sleep: stunned for 2 turns'), stanceOf('jigglypuff_encore', 'Encore', 2, 'Wigglytuff gets an Encore for 2 turns')] } }),
      S('jigglypuff-humiliate', { type: 'Normal', cls: 'Physical', cost: 'X', cd: 0, target: 'single-enemy', name: 'Pound', parts: [dmg(20), bonus(15, 'jigglypuff_sleep', 'Asleep')], evo: { id: 'wigglytuff-humiliate', name: 'Pound', parts: [dmg(25), bonus(15, 'jigglypuff_sleep', 'Asleep')] } }),
      S('jigglypuff-wish', { type: 'Fairy', cls: 'Strategic', cost: 'X', cd: 2, target: 'self-or-single-ally', parts: [regen(10, 2, { who: 'ally' }), when(heal(10, { who: 'ally' }), 'jigglypuff_encore', 'on an Encore', { self: true })], evo: { id: 'wigglytuff-wish', parts: [regen(15, 2, { who: 'ally' }), when(heal(15, { who: 'ally' }), 'jigglypuff_encore', 'on an Encore', { self: true })] } }),
      S('jigglypuff-perish-song', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Protect', parts: [inv(1)], evo: { id: 'wigglytuff-perish-song', name: 'Protect', parts: [inv(1)] } }),
    ] },
  { id: 'beedrill', role: 'Assassin', about: 'Poison Sting Poisons an enemy; Twinneedle and Envenom punish Poisoned enemies, then it Mega Evolves.',
    evolve: { into: 'Mega Beedrill', face: 'assets/images/PokemonArena/beedrill/megafp.webp', status: 'beedrill_mega_evolution', tracker: 'beedrill_evolution_tracker', passive: 'beedrill-evolution-mega' },
    skills: [
      S('beedrill-poison-sting', { type: 'Poison', cls: 'Physical', cost: 'X', cd: 0, target: 'single-enemy', main: true, parts: [dmg(10), poison('beedrill_poison', 5, 2)], evo: { id: 'mega-beedrill-poison-sting', parts: [dmg(15), poison('beedrill_poison', 10, 2)] } }),
      S('beedrill-twinneedle', { type: 'Bug', cls: 'Physical', cost: 'GX', cd: 1, target: 'single-enemy', parts: [dmg(25), bonus(10, 'beedrill_poison', 'Poisoned'), crit(10, 25)], evo: { id: 'beedrill-twinneedle-mega', parts: [dmg(30), bonus(15, 'beedrill_poison', 'Poisoned'), crit(10, 30)] } }),
      S('beedrill-envenom', { type: 'Poison', cls: 'Special', cost: 'B', cd: 2, target: 'single-enemy', parts: [expose(5, 2), when(expose(10, 2), 'beedrill_poison', 'Poisoned', { text: 'if the target is Poisoned, it takes 15 more damage instead' })], evo: { id: 'mega-beedrill-fell-stinger', parts: [dmg(20, { pierce: true }), bonus(15, 'beedrill_poison', 'Poisoned', { pierce: true })] } }),
      S('beedrill-hive-swarm', { type: 'Bug', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', parts: [inv(1)], evo: { id: 'beedrill-hive-swarm-mega', parts: [inv(1)] } }),
    ] },
  // ---------------------------------------------------------------- Legends: the weather is the main skill
  { id: 'articuno', role: 'Controller', about: 'Blizzard brings a Snowstorm; Ice Beam and Sheer Cold are stronger in the snow.',
    skills: [
      S('articuno-blizzard', { type: 'Ice', cls: 'Special', cost: 'BX', cd: 3, target: 'all-enemy', main: true, parts: [dmg(15, { who: 'all-enemy' }), weather('snowstorm', 'a Snowstorm', 3, { Ice: 10 }), stanceOf('articuno_snow', 'Snowbound', 3, 'Articuno is Snowbound for 3 turns')] }),
      S('articuno-ice-beam', { type: 'Ice', cls: 'Special', cost: 'B', cd: 0, target: 'single-enemy', parts: [dmg(20), crit(10, 15, { up: { id: 'articuno_snow', label: 'Snowbound', pct: 25 } })] }),
      S('articuno-sheer-cold', { type: 'Ice', cls: 'Special', cost: 'BX', cd: 3, target: 'single-enemy', parts: [dmg(15), A(stun(1)), when(stun(2), 'articuno_snow', 'Snowbound', { self: true, text: 'while {name} is Snowbound, the stun lasts 2 turns' })] }),
      protect('articuno-snowstorm', 'Mist'),
    ] },
  { id: 'moltres', role: 'Area damage', about: 'Wildfire Burns everyone and starts a Wildfire; Heat Wave and Overheat punish Burned enemies.',
    skills: [
      S('moltres-fire-spin', { type: 'Fire', cls: 'Special', cost: 'RX', cd: 3, target: 'all-enemy', name: 'Wildfire', main: true, parts: [burn('moltres_burn', 5, 'all-enemy'), weather('wildfire', 'a Wildfire', 3, { Fire: 10 })] }),
      S('moltres-heat-wave', { type: 'Fire', cls: 'Special', cost: 'RX', cd: 1, target: 'all-enemy', parts: [dmg(15, { who: 'all-enemy' }), bonus(10, 'moltres_burn', 'Burned', { who: 'all-enemy' })] }),
      S('moltres-overheat', { type: 'Fire', cls: 'Special', cost: 'RRX', cd: 3, target: 'single-enemy', parts: [dmg(40), bonus(15, 'moltres_burn', 'Burned'), crit(15, 20)] }),
      protect('moltres-sunny-day', 'Roost'),
    ] },
  { id: 'zapdos', role: 'Burst damage', about: 'Thunderstorm Charges Zapdos up; its lightning hits harder and stuns while Charged.',
    skills: [
      S('zapdos-charge', { type: 'Electric', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', name: 'Thunderstorm', main: true, parts: [weather('thunderstorm', 'a Thunderstorm', 3, { Electric: 10 }), gain(1), stanceOf('zapdos_charged', 'Charged', 3, 'Zapdos is Charged for 3 turns')] }),
      S('zapdos-thunderbolt', { type: 'Electric', cls: 'Special', cost: 'Y', cd: 0, target: 'single-enemy', parts: [dmg(20), crit(10, 15, { up: { id: 'zapdos_charged', label: 'Charged', pct: 25 } })] }),
      S('zapdos-zap-cannon', { type: 'Electric', cls: 'Special', cost: 'YYX', cd: 3, target: 'single-enemy', parts: [dmg(35), when(stun(1), 'zapdos_charged', 'Charged', { self: true })] }),
      protect('zapdos-flight', 'Fly'),
    ] },
  { id: 'mew', role: 'Support', about: 'Pink Bubble shields an ally; Mew\'s psychic power and Life Dew are stronger for Bubbled allies.',
    skills: [
      S('mew-pink-bubble', { type: 'Psychic', cls: 'Strategic', cost: 'R', cd: 2, target: 'self-or-single-ally', main: true, parts: [mark(shield(25, 2, { who: 'ally' }), 'mew_bubble', 'Bubbled', 'Bubbles one ally for 2 turns: 25 destructible defense')] }),
      S('mew-psychic', { type: 'Psychic', cls: 'Special', cost: 'BX', cd: 0, target: 'single-enemy', parts: [dmg(25), bonus(10, 'mew_bubble', 'Bubbled', { self: true }), crit(10, 20)] }),
      S('mew-life-dew', { type: 'Water', cls: 'Strategic', cost: 'RX', cd: 2, target: 'all-allies', parts: [heal(10, { who: 'all-allies' }), when(heal(10, { who: 'all-allies' }), 'mew_bubble', 'Bubbled', { text: 'Bubbled allies heal 10 more' })] }),
      protect('mew-psychic-barrier', 'Psychic Barrier'),
    ] },
  { id: 'mewtwo', role: 'Burst damage', about: 'Psychic Mind Locks an enemy; Shadow Ball and Drain Punch tear through Mind Locked enemies.',
    skills: [
      S('mewtwo-psychic', { type: 'Psychic', cls: 'Special', cost: 'B', cd: 0, target: 'single-enemy', main: true, parts: [dmg(20), named('mewtwo_lock', 'Mind Locked', 'Mind Locks the target')] }),
      S('mewtwo-shadow-ball', { type: 'Ghost', cls: 'Special', cost: 'BR', cd: 2, target: 'single-enemy', parts: [dmg(35, { pierce: true }), bonus(15, 'mewtwo_lock', 'Mind Locked', { pierce: true }), crit(15, 20)] }),
      S('mewtwo-drain-punch', { type: 'Fighting', cls: 'Physical', cost: 'YX', cd: 1, target: 'single-enemy', parts: [dmg(25), heal(15), bonus(10, 'mewtwo_lock', 'Mind Locked')] }),
      protect('mewtwo-recover', 'Barrier'),
    ] },
  { id: 'dragonite', role: 'Tank', about: 'Dragon Dance makes Dragonite Dancing; it hits harder and takes less damage while Dancing.',
    skills: [
      S('dragonite-dragon-boost', { type: 'Dragon', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', name: 'Dragon Dance', main: true, parts: [stanceOf('dragonite_dance', 'Dancing', 2, 'Dragonite is Dancing for 2 turns and takes 10 less damage', [reduce(10, 2)])] }),
      S('dragonite-dragon-claw', { type: 'Dragon', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'dragonite_dance', 'Dancing', { self: true }), crit(10, 15, { up: { id: 'dragonite_dance', label: 'Dancing', pct: 25 } })] }),
      S('dragonite-draco-meteor', { type: 'Dragon', cls: 'Special', cost: 'BRX', cd: 3, target: 'all-enemy', parts: [dmg(25, { who: 'all-enemy' }), bonus(10, 'dragonite_dance', 'Dancing', { self: true, who: 'all-enemy' })] }),
      protect('dragonite-hyper-beam'),
    ] },
  // ---------------------------------------------------------------- Johto starters (evolve through ranked win missions; the evolved signature skill swaps in)
  { id: 'cyndaquil', role: 'Damage over time', about: 'Ember Burns an enemy; Tackle and Flame Wheel hit Burned enemies harder.',
    skills: [
      S('cyndaquil-aerial-flamethrower', { type: 'Fire', cls: 'Special', cost: 'R', cd: 1, target: 'single-enemy', name: 'Ember', main: true, parts: [dmg(10), burn('cyndaquil_burn', 10)] }),
      S('cyndaquil-aerial-tackle', { type: 'Normal', cls: 'Physical', cost: 'X', cd: 0, target: 'single-enemy', name: 'Tackle', parts: [dmg(15), bonus(10, 'cyndaquil_burn', 'Burned')] }),
      S('cyndaquil-cynda-smokescreen', { type: 'Normal', cls: 'Special', cost: 'X', cd: 3, target: 'all-enemy', name: 'Smokescreen', parts: [weaken(10, 1, { who: 'all-enemy' }), when(weaken(5, 1, { who: 'all-enemy' }), 'cyndaquil_burn', 'Burned', { text: 'Burned enemies deal 15 less damage instead' })] }),
      S('cyndaquil-skyward-leap', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Protect', parts: [inv(1)] }),
    ],
    extra: [
      S('cyndaquil-quilava-flame-wheel', { type: 'Fire', cls: 'Physical', cost: 'R', cd: 0, target: 'single-enemy', name: 'Flame Wheel', charName: 'Quilava', parts: [dmg(20), bonus(10, 'cyndaquil_burn', 'Burned'), crit(10, 20)] }),
      S('cyndaquil-typhlosion-flame-wheel', { type: 'Fire', cls: 'Physical', cost: 'R', cd: 0, target: 'single-enemy', name: 'Flame Wheel', charName: 'Typhlosion', parts: [dmg(25), bonus(15, 'cyndaquil_burn', 'Burned'), crit(10, 25)] }),
    ] },
  { id: 'chikorita', role: 'Support', about: 'Light Screen Screens the team; Razor Leaf and Synthesis are stronger while Screened.',
    skills: [
      S('chikorita-light-screen', { type: 'Psychic', cls: 'Strategic', cost: 'X', cd: 2, target: 'all-allies', main: true, parts: [mark(shield(10, 2, { who: 'all-allies' }), 'chikorita_screen', 'Screened', 'Screens all allies for 2 turns: 10 destructible defense')] }),
      S('chikorita-aerial-razor-leaf', { type: 'Grass', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', name: 'Razor Leaf', parts: [dmg(20), bonus(10, 'chikorita_screen', 'Screened', { self: true })] }),
      S('chikorita-chikorita-solar-beam', { type: 'Grass', cls: 'Strategic', cost: 'GX', cd: 2, target: 'self-or-single-ally', name: 'Synthesis', parts: [heal(20, { who: 'ally' }), when(heal(10, { who: 'ally' }), 'chikorita_screen', 'Screened', { text: 'if that ally is Screened, it heals 10 more' })] }),
      S('chikorita-vine-defense', { type: 'Grass', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Protect', parts: [inv(1)] }),
    ],
    extra: [
      S('chikorita-bayleaf-magical-leaf', { type: 'Grass', cls: 'Special', cost: 'G', cd: 0, target: 'single-enemy', name: 'Magical Leaf', charName: 'Bayleef', parts: [dmg(25, { pierce: true }), bonus(10, 'chikorita_screen', 'Screened', { self: true })] }),
      S('chikorita-meganium-magical-leaf', { type: 'Grass', cls: 'Special', cost: 'G', cd: 0, target: 'single-enemy', name: 'Magical Leaf', charName: 'Meganium', parts: [dmg(30, { pierce: true }), bonus(15, 'chikorita_screen', 'Screened', { self: true })] }),
    ] },
  { id: 'totodile', role: 'Bruiser', about: 'Scary Face Scares an enemy; Water Gun and Aqua Tail hit Scared enemies harder.',
    skills: [
      S('totodile-scary-face', { type: 'Normal', cls: 'Special', cost: 'X', cd: 2, target: 'single-enemy', main: true, parts: [mark(weaken(10, 2), 'totodile_scared', 'Scared', 'Scares one enemy for 2 turns: it deals 10 less damage')] }),
      S('totodile-aerial-water-gun', { type: 'Water', cls: 'Special', cost: 'B', cd: 0, target: 'single-enemy', name: 'Water Gun', parts: [dmg(20), bonus(10, 'totodile_scared', 'Scared')] }),
      S('totodile-aqua-tail', { type: 'Water', cls: 'Physical', cost: 'BX', cd: 1, target: 'single-enemy', parts: [dmg(25), bonus(15, 'totodile_scared', 'Scared'), crit(10, 20)] }),
      S('totodile-superpower', { type: 'Fighting', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Protect', parts: [inv(1)] }),
    ],
    extra: [ // these replace Scary Face, so they Scare too
      S('totodile-croconaw-bite', { type: 'Dark', cls: 'Physical', cost: 'X', cd: 2, target: 'single-enemy', name: 'Bite', charName: 'Croconaw', parts: [dmg(15), mark(weaken(10, 2), 'totodile_scared', 'Scared', 'Scares it for 2 turns: it deals 10 less damage')] }),
      S('totodile-feraligatr-dragon-claw', { type: 'Dragon', cls: 'Physical', cost: 'X', cd: 2, target: 'single-enemy', name: 'Crunch', charName: 'Feraligatr', parts: [dmg(20), mark(weaken(15, 2), 'totodile_scared', 'Scared', 'Scares it for 2 turns: it deals 15 less damage')] }),
    ] },
  { id: 'drowzee', role: 'Controller', about: 'Hypnosis puts an enemy to Sleep; Dream Eater and Nightmare feast on Sleeping enemies.',
    evolve: { into: 'Hypno', face: 'assets/images/PokemonArena/Drowzee/hypnofp.webp', status: 'hypno_evolution', tracker: 'drowzee_evolution_tracker', passive: 'drowzee-evolution' },
    skills: [
      S('drowzee-hypnosis', { type: 'Psychic', cls: 'Special', cost: 'YX', cd: 3, target: 'single-enemy', main: true, parts: [mark(stun(1), 'drowzee_sleep', 'Asleep', 'Puts one enemy to Sleep: stunned for 1 turn')], evo: { id: 'hypno-hypnosis', parts: [dmg(10), mark(stun(1), 'drowzee_sleep', 'Asleep', 'puts it to Sleep: stunned for 1 turn')] } }),
      S('drowzee-dream-eater', { type: 'Psychic', cls: 'Special', cost: 'B', cd: 0, target: 'single-enemy', parts: [dmg(15), heal(10), bonus(15, 'drowzee_sleep', 'Asleep')], evo: { id: 'hypno-dream-eater', parts: [dmg(20), heal(15), bonus(15, 'drowzee_sleep', 'Asleep')] } }),
      S('drowzee-nightmare', { type: 'Ghost', cls: 'Special', cost: 'Y', cd: 2, target: 'single-enemy', parts: [dot(10, 2), when(dot(10, 2), 'drowzee_sleep', 'Asleep', { text: 'if the target is Asleep, it takes 20 each turn instead' })], evo: { id: 'hypno-nightmare', parts: [dot(15, 2), when(dot(10, 2), 'drowzee_sleep', 'Asleep', { text: 'if the target is Asleep, it takes 25 each turn instead' })] } }),
      S('drowzee-disable', { type: 'Normal', cls: 'Strategic', cost: 'X', cd: 4, target: 'self', name: 'Protect', parts: [inv(1)], evo: { id: 'hypno-disable', name: 'Protect', parts: [inv(1)] } }),
    ] },
  { id: 'primeape', role: 'Berserker', about: 'Rage makes Primeape Raging; it hits harder and crits more while Raging.',
    skills: [
      S('primeape-rage-fist', { type: 'Ghost', cls: 'Strategic', cost: 'X', cd: 2, target: 'self', name: 'Rage', main: true, parts: [stanceOf('primeape_rage', 'Raging', 3, 'Primeape is Raging for 3 turns')] }),
      S('primeape-rock-smash', { type: 'Fighting', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'primeape_rage', 'Raging', { self: true })] }),
      S('primeape-close-combat', { type: 'Fighting', cls: 'Physical', cost: 'GX', cd: 1, target: 'single-enemy', parts: [dmg(35), expose(10, 1, { who: 'self' }), crit(15, 15, { up: { id: 'primeape_rage', label: 'Raging', pct: 35 } })] }),
      protect('primeape-knock-off', 'Detect'),
    ] },
  { id: 'marowak', role: 'Bruiser', about: 'Bone Guard readies Marowak\'s bone; its bone attacks are stronger while Bone Ready.',
    skills: [
      S('marowak-bone-guard', { type: 'Ground', cls: 'Strategic', cost: 'X', cd: 3, target: 'self', main: true, parts: [mark(shield(25, 2), 'marowak_bone', 'Bone Ready', 'Marowak is Bone Ready for 2 turns: 25 destructible defense')] }),
      S('marowak-bone-club', { type: 'Ground', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', parts: [dmg(20), bonus(10, 'marowak_bone', 'Bone Ready', { self: true }), crit(10, 20)] }),
      S('marowak-bonemerang', { type: 'Ground', cls: 'Physical', cost: 'GX', cd: 1, target: 'single-enemy', parts: [dmg(20), dmg(15, { who: 'random-enemy' }), bonus(10, 'marowak_bone', 'Bone Ready', { self: true })] }),
      S('marowak-bone-rush', { type: 'Ground', cls: 'Physical', cost: 'GX', cd: 3, target: 'single-enemy', parts: [dmg(20), when(stun(1), 'marowak_bone', 'Bone Ready', { self: true })] }),
    ] },
  { id: 'pinsir', role: 'Bruiser', about: 'Vice Grip Grips an enemy; X-Scissor and Seismic Toss punish Gripped enemies.',
    skills: [
      S('pinsir-vice-grip', { type: 'Normal', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', main: true, parts: [dmg(20), named('pinsir_grip', 'Gripped', 'Grips the target')] }),
      S('pinsir-x-scissor', { type: 'Bug', cls: 'Physical', cost: 'GX', cd: 1, target: 'single-enemy', parts: [dmg(25), bonus(15, 'pinsir_grip', 'Gripped'), crit(15, 20)] }),
      S('pinsir-seismic-toss', { type: 'Fighting', cls: 'Physical', cost: 'GX', cd: 3, target: 'single-enemy', name: 'Seismic Toss', parts: [dmg(20), when(stun(1), 'pinsir_grip', 'Gripped')] }),
      protect('pinsir-rock-tomb', 'Detect'),
    ] },
  { id: 'tauros', role: 'Bruiser', about: 'Horn Attack makes Tauros Enraged; Take-Down and Earthquake are stronger while Enraged.',
    skills: [
      S('tauros-horn-attack', { type: 'Normal', cls: 'Physical', cost: 'G', cd: 0, target: 'single-enemy', main: true, parts: [dmg(20), stanceOf('tauros_rage', 'Enraged', 2, 'Tauros is Enraged for 2 turns')] }),
      S('tauros-take-down', { type: 'Normal', cls: 'Physical', cost: 'GX', cd: 1, target: 'single-enemy', parts: [dmg(30), dmg(10, { who: 'self', pierce: true }), bonus(15, 'tauros_rage', 'Enraged', { self: true }), crit(10, 20)] }),
      S('tauros-earthquake', { type: 'Ground', cls: 'Physical', cost: 'GXX', cd: 3, target: 'all-enemy', parts: [dmg(20, { who: 'all-enemy' }), bonus(10, 'tauros_rage', 'Enraged', { self: true, who: 'all-enemy' })] }),
      protect('tauros-stampede'),
    ] },
];

// Every remaining skill (mostly the defensive button) also ties back to the main skill. Stance Pokemon get a small
// heal while in their stance; Pokemon whose main skill marks enemies get it if they used the main skill last turn.
const MAIN_NAMES = { charmander: 'Ember', squirtle: 'Withdraw', bulbasaur: 'Leech Seed', pikachu: 'Thundershock', butterfree: 'Sleep Powder', chansey: 'Softboil', koffing: 'Smog', zubat: 'Supersonic', gastly: 'Curse', abra: 'Calm Mind', krabby: 'Leer', scyther: 'Swords Dance', eevee: 'Swift', jolteon: 'Pin Missile', flareon: 'Fire Spin', vaporeon: 'Aqua Ring', ekans: 'Toxic', machop: 'Bulk Up', magikarp: 'Splash', 'mr-mime': 'Light Screen', hitmonchan: 'Fire Punch', hitmonlee: 'Focus Energy', magnemite: 'Thunder Wave', onix: 'Harden', meowth: 'Pay Day', clefairy: 'Moonlight', jigglypuff: 'Sing', beedrill: 'Poison Sting', articuno: 'Blizzard', moltres: 'Wildfire', zapdos: 'Thunderstorm', mew: 'Pink Bubble', mewtwo: 'Psychic', dragonite: 'Dragon Dance', cyndaquil: 'Ember', chikorita: 'Light Screen', totodile: 'Scary Face', drowzee: 'Hypnosis', primeape: 'Rage', marowak: 'Bone Guard', pinsir: 'Vice Grip', tauros: 'Horn Attack' };
const statusesIn = (parts) => parts.flatMap((p) => p.fx).filter((e) => e.type === 'apply_status' && e.fixedId);
const PHRASE = { 'In its shell': 'in its shell', Encore: 'on an Encore' };
const labelOf = (e) => { const l = e.metadata.tooltipText.split(/[:.]/)[0]; return PHRASE[l] ?? l; };
const USED = { totodile: 'Scared an enemy' };
function linkEverything(kits) {
  for (const k of kits) {
    const main = k.skills.find((s) => s.main);
    if (!main) throw new Error(`${k.id}: no main skill`);
    if (!MAIN_NAMES[k.id]) throw new Error(`${k.id}: no main skill name`);
    const forms = [{ key: 'base', parts: () => main.parts, n: 10 }];
    if (main.evo) forms.push({ key: 'evo', parts: () => main.evo.parts, n: 15 });
    for (const f of forms) {
      const parts = f.parts();
      f.ids = statusesIn(parts).map((e) => e.statusId);
      const st = statusesIn(parts).find((e) => e.scope === 'self');
      const mainName = f.key === 'evo' ? (main.evo.name ?? main.name ?? MAIN_NAMES[k.id]) : (main.name ?? MAIN_NAMES[k.id]);
      if (st) f.link = () => when(heal(f.n), st.statusId, labelOf(st), { self: true });
      else {
        const id = `${k.id}_used_main`;
        parts.push(tag(id, `Used ${mainName}`, 2, 'self', ''));
        f.ids.push(id);
        f.link = () => when(heal(f.n), id, `Used ${mainName}`, { self: true, text: `if {name} ${USED[k.id] ?? `used ${mainName}`} last turn, it also heals ${f.n}` });
        // Evolved versions that replace the main skill (Totodile's Bite/Crunch) count too.
        for (const x of k.extra ?? []) if (statusesIn(x.parts).some((e) => f.ids.includes(e.statusId))) x.parts.push(tag(id, `Used ${mainName}`, 2, 'self', ''));
      }
    }
    const linked = (parts, ids) => ids.some((id) => JSON.stringify(parts.map((p) => p.fx)).includes(`"${id}"`));
    for (const s of k.skills) {
      if (s.main || s.keepEffects) continue;
      const base = forms[0], evo = forms[1] ?? forms[0];
      if (!linked(s.parts, base.ids)) {
        if (s.target !== 'self') throw new Error(`${k.id}/${s.id}: not linked to the main skill`);
        s.parts = [...s.parts, base.link()];
      }
      if (s.evo && s.evo !== true && !linked(s.evo.parts, evo.ids)) {
        if ((s.evo.target ?? s.target) !== 'self') throw new Error(`${k.id}/${s.evo.id}: not linked to the main skill`);
        s.evo.parts = [...s.evo.parts, evo.link()];
      }
    }
  }
  return kits;
}

module.exports = linkEverything(KITS);
