#!/usr/bin/env node
'use strict';

// Builds assets/data/battle-fx-characters.json: the animation profile of EVERY character and
// EVERY skill (Comic Arena and Pokemon Arena), read by scripts/battle-fx.js.
//
//   node scripts/build-battle-fx-characters.js           # write
//   node scripts/build-battle-fx-characters.js --check   # exit 1 if the committed file is stale
//
// A skill's profile:
//   delivery  melee | projectile | area | support | self | passive   (how the move travels)
//   windup    effect played on the caster while it winds up (or null)
//   travel    effect that flies to the target for projectiles (or null)
//   impact    effect played on each target on contact
//   kill      the death animation this skill gives a character it finishes off
// Effects are keys of assets/data/battle-fx-manifest.json (scripts/build-battle-fx.py); every
// key used here is checked to exist, so nothing silently falls back to a default.
//
// Pokemon skills take their look from their move type. Comic skills take it from keywords in the
// skill (fire, laser, poison...) and otherwise from the character's signature element in
// assets/data/battle-fx-overrides.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'data', 'battle-fx-characters.json');
const characters = require(path.join(ROOT, 'characters.js'));
// The battle page also loads pokemon-wave-2-live.js, which adds any character not already listed.
const known = new Set(characters.map((c) => c.characterId || c.id));
require(path.join(ROOT, 'pokemon-wave-2-live.js')).forEach((c) => { if (!known.has(c.characterId || c.id)) characters.push(c); });
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'battle-fx-manifest.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'battle-fx-overrides.json'), 'utf8')).characters;

// ---- Elements: the effects and the kill style of each look ---------------------------------
// windup / travel / impact are manifest keys; kill is a death recipe in battle-fx.js (DEATHS).
const ELEMENTS = {
    // Pokemon move types
    normal: { windup: null, travel: 'type/normal', impact: 'type/normal', kill: 'shatter' },
    fire: { windup: 'type/fire', travel: 'type/fire', impact: 'explosions/epic_explosion_001', kill: 'burn' },
    water: { windup: null, travel: 'type/water', impact: 'type/water', kill: 'wave' },
    electric: { windup: 'sci-fi/scifi_charge_up_001', travel: 'type/electric', impact: 'type/electric', kill: 'electrocute' },
    grass: { windup: null, travel: 'type/grass', impact: 'type/grass', kill: 'vines' },
    ice: { windup: null, travel: 'type/ice', impact: 'type/ice', kill: 'freeze' },
    fighting: { windup: null, travel: null, impact: 'type/fighting', kill: 'pummel' },
    poison: { windup: null, travel: 'type/poison', impact: 'type/poison', kill: 'dissolve' },
    ground: { windup: null, travel: null, impact: 'type/ground', kill: 'fissure' },
    flying: { windup: null, travel: 'type/flying', impact: 'type/flying', kill: 'gust' },
    psychic: { windup: 'sci-fi/scifi_warp_001', travel: 'type/psychic', impact: 'type/psychic', kill: 'warp' },
    bug: { windup: null, travel: 'type/bug', impact: 'type/bug', kill: 'swarm' },
    rock: { windup: null, travel: 'type/rock', impact: 'type/rock', kill: 'crush' },
    ghost: { windup: null, travel: 'type/ghost', impact: 'type/ghost', kill: 'haunt' },
    dragon: { windup: null, travel: 'type/dragon', impact: 'type/dragon', kill: 'dragon-claw' },
    dark: { windup: null, travel: 'type/dark', impact: 'type/dark', kill: 'shadow' },
    steel: { windup: null, travel: 'type/steel', impact: 'type/steel', kill: 'slice' },
    fairy: { windup: null, travel: 'type/fairy', impact: 'type/fairy', kill: 'sparkle' },
    // Comic signatures
    strike: { windup: null, travel: null, impact: 'impacts/directional_impact_002', kill: 'shatter' },
    blunt: { windup: null, travel: null, impact: 'impacts/symmetrical_impact_003', kill: 'crush' },
    smash: { windup: null, travel: null, impact: 'impacts/symmetrical_impact_006', kill: 'crush' },
    blade: { windup: null, travel: null, impact: 'splatters/directional_splatter_001', kill: 'slice' },
    blood: { windup: null, travel: null, impact: 'splatters/burst_splatter_001', kill: 'devour' },
    gunfire: { windup: 'sci-fi/scifi_muzzle_flash_001', travel: 'impacts/directional_impact_004', impact: 'impacts/directional_impact_004', kill: 'riddled' },
    laser: { windup: 'sci-fi/scifi_charge_up_001', travel: 'impacts/directional_impact_004', impact: 'explosions/stylized_explosion_001', kill: 'laser' },
    solar: { windup: 'magic-bursts/round_light_burst_001', travel: 'impacts/directional_impact_004', impact: 'explosions/epic_explosion_002', kill: 'laser' },
    repulsor: { windup: 'sci-fi/scifi_charge_up_001', travel: 'impacts/directional_impact_001', impact: 'impacts/symmetrical_impact_002', kill: 'boom' },
    gadget: { windup: null, travel: 'impacts/directional_impact_002', impact: 'sci-fi/scifi_spark_burst_001', kill: 'shatter' },
    explosive: { windup: null, travel: 'explosions/symmetrical_explosion_001', impact: 'explosions/epic_explosion_002', kill: 'boom' },
    lightning: { windup: 'sci-fi/scifi_charge_up_001', travel: 'lightning/lightning_burst_001', impact: 'lightning/lightning_strike_001', kill: 'electrocute' },
    hellfire: { windup: 'type/fire', travel: 'type/fire', impact: 'explosions/epic_explosion_001', kill: 'burn' },
    ice: { windup: null, travel: 'type/ice', impact: 'type/ice', kill: 'freeze' },
    toxin: { windup: null, travel: 'type/poison', impact: 'fantasy-spells/spell_poison_001', kill: 'dissolve' },
    acid: { windup: null, travel: 'type/poison', impact: 'fantasy-spells/spell_poison_001', kill: 'dissolve' },
    arcane: { windup: 'sci-fi/scifi_warp_003', travel: 'magic-bursts/round_sparkle_burst_001', impact: 'sci-fi/scifi_warp_003', kill: 'warp' },
    portal: { windup: 'sci-fi/scifi_warp_003', travel: null, impact: 'sci-fi/scifi_warp_003', kill: 'warp' },
    illusion: { windup: 'smoke-bursts/directional_smoke_burst_001', travel: 'magic-bursts/round_sparkle_burst_002', impact: 'sci-fi/scifi_warp_001', kill: 'warp' },
    willpower: { windup: 'sci-fi/scifi_warp_001', travel: 'magic-bursts/round_sparkle_burst_002', impact: 'impacts/symmetrical_impact_001', kill: 'sparkle' },
    hope: { windup: 'magic-bursts/round_sparkle_burst_001', travel: 'magic-bursts/round_sparkle_burst_001', impact: 'magic-bursts/round_light_burst_001', kill: 'sparkle' },
    divine: { windup: 'magic-bursts/round_light_burst_001', travel: 'magic-bursts/round_light_burst_001', impact: 'impacts/symmetrical_impact_001', kill: 'sparkle' },
    fear: { windup: 'fantasy-spells/spell_death_001', travel: 'magic-bursts/round_light_burst_001', impact: 'fantasy-spells/spell_death_001', kill: 'shadow' },
    rage: { windup: 'fantasy-spells/spell_attack_up_001', travel: 'splatters/directional_splatter_001', impact: 'splatters/burst_splatter_001', kill: 'burn' },
    shadow: { windup: 'smoke-bursts/stylized_skull_smoke_burst_001', travel: 'type/dark', impact: 'fantasy-spells/spell_death_001', kill: 'shadow' },
    'dark-force': { windup: 'fantasy-spells/spell_death_001', travel: 'lightning/lightning_burst_002', impact: 'lightning/lightning_strike_001', kill: 'force-lightning' },
    'force-choke': { windup: 'fantasy-spells/spell_death_001', travel: null, impact: 'fantasy-spells/spell_death_001', kill: 'crush' },
    force: { windup: 'magic-bursts/round_light_burst_001', travel: 'smoke-bursts/directional_smoke_burst_001', impact: 'impacts/symmetrical_impact_002', kill: 'gust' },
    symbiote: { windup: null, travel: 'type/dark', impact: 'splatters/burst_splatter_001', kill: 'devour' },
    web: { windup: null, travel: 'impacts/directional_impact_002', impact: 'impacts/symmetrical_impact_004', kill: 'cocoon' },
    sand: { windup: null, travel: 'smoke-bursts/symmetrical_smoke_burst_001', impact: 'smoke-bursts/symmetrical_smoke_burst_001', kill: 'gust' },
    drain: { windup: 'fantasy-spells/spell_absorb_001', travel: null, impact: 'fantasy-spells/spell_absorb_001', kill: 'drain' },
    'fourth-wall': { windup: 'symbols/symbol_wow_text_001', travel: null, impact: 'symbols/symbol_alert_text_001', kill: 'shatter' },
};

// Skill keywords that override the character's element (checked against the name, then text).
const KEYWORDS = [
    [/\b(lightsaber|saber)\b/i, 'blade'],
    [/\b(hellfire|fire|flame|burn|blaze|inferno|ember|scorch)\w*/i, 'hellfire'],
    [/\b(frost|ice|freez|blizzard|cold)\w*/i, 'ice'],
    [/\b(lightning|thunder|electr|shock|volt|spark)\w*/i, 'lightning'],
    [/\b(laser|beam|eye ?beam|heat vision)\w*/i, 'laser'],
    [/\b(poison|toxi|venom|acid|neurotoxin|smog)\w*/i, 'toxin'],
    [/\b(bomb|grenade|explo|missile|rocket|detonat)\w*/i, 'explosive'],
    [/\b(shot|shoot|gun|rifle|pistol|revolver|bullet|sniper|smartgun|buckshot|blaster)\w*/i, 'gunfire'],
    [/\b(wave|tidal|tide|water|sea)\b/i, 'water'],
    [/\b(claw|slash|blade|sword|katana|cut|slice|hack|knife|spear|shuriken)\w*/i, 'blade'],
    [/\b(bite|devour|blood|bleed|tear|rip)\w*/i, 'blood'],
    [/\b(portal|teleport|dimension|warp)\w*/i, 'portal'],
];

const POKEMON_TYPES = new Set(Object.keys(ELEMENTS).slice(0, 18));
const lower = (s) => String(s || '').toLowerCase();
const hasClass = (skill, c) => (skill.classes || []).some((x) => lower(x) === c);
const isPokemon = (ch) => lower(ch.arena) === 'pokemon' || lower(ch.universe) === 'pokemon';

// Lightsaber kills: each wielder's own blade colours (the 'saber' death recipe draws one cut per colour).
const SABER_KILLERS = {
    'darth-vader': ['red'],
    'darth-maul': ['red', 'red'],
    'darth-sidious': ['red'],
    'obi-wan-kenobi': ['blue'],
    'grand-master-yoda': ['green'],
    'general-grievous': ['green', 'blue', 'violet', 'yellow'],
};
// Signature kills that aren't decided by element (the character's own trademark finish).
const SIGNATURE_KILLS = {
    'the-hulk': 'crush', negan: 'lucille', wolverine: 'claw-triple', carnage: 'devour', venom: 'devour',
    'the-flash-barry-allen': 'electrocute', 'ghost-rider': 'burn', batman: 'vanish', 'boba-fett': 'riddled',
    'predator-stalker': 'riddled', 'darth-sidious': 'force-lightning', deadpool: 'slice',
};

function effects(skill) { return Array.isArray(skill.effects) ? skill.effects : []; }
function isHarmful(skill) {
    return effects(skill).some((e) => e.type === 'damage' || e.type === 'health_steal_damage' || e.type === 'execute_below_hp'
        || e.type === 'drain_chakra' || (e.type === 'apply_status' && e.metadata?.harmful));
}
function heals(skill) { return effects(skill).some((e) => e.type === 'heal' || e.metadata?.healOnApplyFlat || e.metadata?.turnEndHealFlat); }
function shields(skill) {
    return effects(skill).some((e) => e.metadata && (e.metadata.invulnerable || e.metadata.destructibleDefensePoints || e.metadata.damageReductionFlat
        || e.metadata.damageReductionPercent || e.metadata.unpierceableDamageReductionPercent));
}

function deliveryOf(skill) {
    if (hasClass(skill, 'passive')) return 'passive';
    const target = lower(skill.target);
    const harmful = isHarmful(skill);
    if (!harmful) return target === 'self' || target === '' ? 'self' : 'support';
    if (target.includes('all-enem') || target === 'other-enemies' || effects(skill).some((e) => e.scope === 'all-enemy')) return 'area';
    if (target === 'self') return 'self';
    if (hasClass(skill, 'melee') || (hasClass(skill, 'physical') && !hasClass(skill, 'ranged') && !hasClass(skill, 'special'))) return 'melee';
    return 'projectile';
}

function elementOf(ch, skill) {
    const id = ch.characterId || ch.id;
    const pinned = overrides[id]?.skills?.[skill.id];
    if (pinned) return pinned;
    // Lightsaber wielders swing their saber in melee (Force powers keep their own look).
    if (SABER_KILLERS[id] && deliveryOf(skill) === 'melee' && !/\b(force|lightning)\b/i.test(skill.name || '')) return 'blade';
    if (isPokemon(ch)) {
        const t = (skill.classes || []).map(lower).find((c) => POKEMON_TYPES.has(c));
        if (t) return t;
        return lower((ch.pokemonTypes || [])[0]) || 'normal';
    }
    const name = skill.name || '';
    const text = skill.skilldescription || skill.description || '';
    for (const [re, el] of KEYWORDS) if (re.test(name)) return el;
    const own = overrides[id]?.element;
    // A melee or physical move by an energy-themed hero still reads as a strike, unless the text says otherwise.
    for (const [re, el] of KEYWORDS) if (re.test(text) && !(el === 'water' && own !== 'water')) return el;
    if (own) return own;
    return hasClass(skill, 'physical') ? 'strike' : 'arcane';
}

function profileOf(ch, skill) {
    const delivery = deliveryOf(skill);
    const id = ch.characterId || ch.id;
    if (delivery === 'passive') return { delivery, windup: null, travel: null, impact: null, kill: null };
    const element = elementOf(ch, skill);
    const look = ELEMENTS[element];
    if (!look) throw new Error(`${id}/${skill.id}: unknown element "${element}"`);
    if (delivery === 'self' || delivery === 'support') {
        const impact = heals(skill) ? 'fantasy-spells/spell_heal_001'
            : shields(skill) ? 'fantasy-spells/spell_defense_up_001'
            : isPokemon(ch) ? 'type/buffApply' : 'fantasy-spells/spell_attack_up_001';
        return { delivery, element, windup: look.windup, travel: null, impact, kill: null };
    }
    const saber = SABER_KILLERS[id] && element === 'blade' ? { kill: 'saber', sabers: SABER_KILLERS[id] } : null;
    return {
        delivery, element,
        windup: look.windup,
        travel: delivery === 'projectile' ? (look.travel || look.impact) : null,
        impact: look.impact,
        kill: saber ? 'saber' : (isPokemon(ch) ? look.kill : (SIGNATURE_KILLS[id] && element === (overrides[id]?.element) ? SIGNATURE_KILLS[id] : look.kill)),
        ...(saber ? { sabers: saber.sabers } : {}),
    };
}

// Laser kills in the shooter's own colour (the 'laser' death recipe's beam and burn).
const LASER_COLOURS = { 'billy-butcher': 'yellow', homelander: 'red', superman: 'red' };

function build() {
    const out = { version: 1, characters: {} };
    // Battle forms (Ninjask, Shedinja, Lance's Pokemon...) are characters in their own right mid-battle.
    const everyone = characters.flatMap((ch) => [ch, ...(ch.battleForms || []).map((f) => ({ arena: ch.arena, ...f }))]);
    for (const ch of everyone) {
        const id = ch.characterId || ch.id;
        const pokemon = isPokemon(ch);
        const primary = pokemon ? lower((ch.pokemonTypes || [])[0]) || 'normal' : (overrides[id]?.element || 'strike');
        const look = ELEMENTS[primary];
        if (!look) throw new Error(`${id}: unknown element "${primary}"`);
        const skills = {};
        for (const skill of ch.skills || []) skills[skill.id] = profileOf(ch, skill);
        out.characters[id] = {
            arena: pokemon ? 'pokemon' : 'comic',
            element: primary,
            // States the engine plays on this character's card.
            entry: pokemon ? `type/${primary}` : (look.windup || 'magic-bursts/round_light_burst_001'),
            victory: 'magic-bursts/round_sparkle_burst_001',
            defeat: pokemon ? 'type/faint' : 'smoke-bursts/symmetrical_smoke_burst_001',
            // The kill this character's finishing blows use when the killing skill isn't known.
            kill: SABER_KILLERS[id] ? 'saber' : (SIGNATURE_KILLS[id] || look.kill),
            ...(SABER_KILLERS[id] ? { sabers: SABER_KILLERS[id] } : {}),
            ...(LASER_COLOURS[id] ? { laser: LASER_COLOURS[id] } : {}),
            skills,
        };
    }
    // Every effect named anywhere must exist in the manifest.
    const missing = new Set();
    const check = (key) => { if (key && !manifest.effects[key]) missing.add(key); };
    Object.values(ELEMENTS).forEach((e) => [e.windup, e.travel, e.impact].forEach(check));
    for (const c of Object.values(out.characters)) {
        [c.entry, c.victory, c.defeat].forEach(check);
        Object.values(c.skills).forEach((s) => [s.windup, s.travel, s.impact].forEach(check));
    }
    if (missing.size) throw new Error(`effects missing from battle-fx-manifest.json: ${[...missing].join(', ')}`);
    return out;
}

const text = `${JSON.stringify(build(), null, 1)}\n`;
if (process.argv.includes('--check')) {
    const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text;
    console.log(same ? 'battle-fx-characters.json is up to date' : 'battle-fx-characters.json is STALE: run node scripts/build-battle-fx-characters.js');
    process.exit(same ? 0 : 1);
}
fs.writeFileSync(OUT, text);
const data = JSON.parse(text);
const skillCount = Object.values(data.characters).reduce((n, c) => n + Object.keys(c.skills).length, 0);
console.log(`wrote ${Object.keys(data.characters).length} characters, ${skillCount} skills to ${path.relative(ROOT, OUT)}`);
