# Starter team port notes

This content pass was reviewed against the local `characters.js` definitions on
2026-07-31. It copies behavior into standalone data; it does not import that file
at runtime and does not modify it.

## Included

- Charmander: Ember, Scratch, Flamethrower, Rage, evolution progress, permanent
  Rage bonuses, Charmeleon, and all four Charmeleon replacement skills.
- Squirtle: Water Gun, Withdraw, Bubble, Rapid Spin, Guard Break, cleanse/block
  evolution progress, Wartortle, and all four Wartortle replacement skills.
- Bulbasaur: Leech Seed, Vine Whip, Razor Leaf, Solar Beam, Sun generation,
  Sun-based critical chance and cost reduction, Ivysaur, and all four Ivysaur
  replacement skills.
- Ten-HP evolution healing, form portraits, form typing, skill replacement, and
  cooldown transfer between corresponding skill slots.

## Intentional standalone adaptations

The standalone engine now queues up to one action for each living Pokemon and
resolves those actions in player-selected order as one team turn. Energy is
reserved while planning. Bulbasaur's "did not use a new skill" passive gains one
Sun when Bulbasaur is absent from the resolved queue; Leech Seed can separately
generate Sun through its periodic drain.

Effect durations are stored as deterministic team-turn counts. Values covering
multiple target turns are translated to the equivalent alternating-team-turn span.

The default Charmander-to-Charmeleon combat progression is included. Cosmetic
Mega Charizard X/Y skin branches and their duplicate skill identifiers are not
part of this default-form content pass.

## Override status

The read-only effective-override lookup could not reach the configured MongoDB
SRV endpoint (`ECONNREFUSED`). This pass therefore uses the current local
canonical definitions and does not claim to include unpublished database-only
overrides. No override source or database record was changed.

## Opponent-team progress

Pikachu is now a complete reviewed port: Thundershock, Volt Tackle, Thunder,
Agility, and the starting Static passive. Static targeting retaliation, marks,
conditional Thunder bonuses, cooldown paralysis, cooldown increases, and the
temporary Thunder cost override are enforced by generic engine primitives.
Zubat/Golbat and Chansey/Blissey are now complete reviewed ports and are tracked
as `ported-full` in `migration/roster-manifest.json`.
