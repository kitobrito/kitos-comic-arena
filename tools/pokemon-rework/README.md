# Pokemon Arena roster rework (V.4.0)

## Audit (before)
- 56 Pokemon used **260 different special rules** (status metadata keys) and about **40 one-off effect types** written for a single skill.
- Average skill description: 25-50 words; Pokemon Trainer, Meowth, Onix, Bulbasaur and Scyther averaged 32-49 words per skill.
- Many kits chained conditions ("if the target is affected by X, Y lasts 2 turns instead"), hidden trackers, random chances and
  evolution triggers that were different for every Pokemon (heal 75 HP, steal 50 HP, use two skills, three Fury Swipes...).

## Design rules (after)
- Four skills: one or two attacks, one utility skill, one way to protect itself (usually 1 turn of invulnerability, cooldown 4).
- Only a dozen effects, all from `dsl.js`: damage, piercing damage, damage over time, stun, invulnerability, destructible defense,
  damage reduction, damage boost, weaken, "takes more damage", heal, heal over time, energy steal/gain, cleanse.
- Costs of 1-3 energy, cooldowns of 0-4, numbers on a 5-point grid.
- Evolution: every evolving Pokemon evolves at the start of its **4th turn** and its skills get stronger. Rare Candy still works.
  Gen 2 starters keep evolving through their ranked win missions (their evolved signature skill swaps in).
- Descriptions are generated from the effects, so they always match what the skill does.
- Skill ids and art are kept, so missions, animations, skins and match history keep working.
- Pidgey keeps its kit but also evolves on turn 4. The birds summon simple weather (3 rounds, +10 to their type) that changes the arena background.
- Left unchanged: community characters (Ditto, Scraggy, Dragapult, Nincada/Ninjask/Shedinja, Darkrai, Aegislash), and
  Aerodactyl (reworked recently), Pokemon Trainer (only Rare Candy was pointed at the new evolutions) and Lance.

## Files
- `kits.js`: every reworked kit. `dsl.js`: the effect vocabulary. `KITS.txt`: every kit, written out.
- `build.js`: writes the kits into `characters.js` and `pokemonReworkData.js` (move types, reworked ids). Re-run after editing
  `kits.js`: `git checkout main -- characters.js && node tools/pokemon-rework/build.js`, then
  `node scripts/build-battle-fx-characters.js`.
- Tests: `test/pokemon-arena-rework.test.js` (every skill cast in the engine), `tools/pokemon-rework/probe.test.js` (the effects).
- News post: `node sync_pokemon_arena_rework_news.js` (run once after deploying).

## Combos (one main skill per Pokemon)

Every kit marks exactly one skill `main: true`. The main skill puts a named mark on enemies (`mark`/`tag` with a
fixed status id such as `charmander_burn`) or a stance on the Pokemon itself. Every other skill references it:

- `bonus(n, id, label, { self, who, pierce })`: extra damage to marked enemies (or while the Pokemon has the stance).
- `when(part, id, label, { self, text })`: any effect that only happens if the target is marked / while in the stance.
- `crit(n, pct, { up: { id, label, pct } })`: a chance to crit for +n piercing damage, higher while in a stance.

`linkEverything` at the bottom of `kits.js` connects whatever is left (usually the defensive skill): stance Pokemon
heal a little while in their stance; the others heal if they used the main skill last turn. It throws if an attack
is not connected. Avoid putting a mark and its own payoff in the same skill: the engine applies the mark first.

The build starts from the pre-rework `characters.js` (commit 7436989, override with `BASE_REV`), so any Pokemon can
be put back exactly as it was by removing it from `kits.js` and rebuilding. Blaziken was put back this way.
