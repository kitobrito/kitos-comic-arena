# Standalone build roadmap

Pokemon Unison is a separate game. It must not route, mirror, shadow, replay,
or mutate matches from the running Comic/Pokemon Arena application.

## Boundary

Everything executable belongs under `prototypes/pokemon-unison`:

- its own deterministic combat engine;
- its own authoritative match service and protocol;
- its own browser client;
- its own future persistence and account system;
- its own tests, replay files, and deployment configuration.

Existing artwork may be served read-only during local development. Production
server modules, MongoDB data, matches, accounts, and stored character overrides
are not runtime dependencies.

## Completed foundation

1. Deterministic seeded combat transitions.
2. Authoritative action and target validation.
3. Viewer-censored state serialization.
4. Private match creation and Player B invite joining.
5. Server-owned in-memory matches with private player tokens.
6. Revisioned polling and deterministic replay export.
7. A two-browser playable client and automated engine/API coverage.
8. A complete starter team: four base skills, evolution passives, and four
   replacement skills for Charmeleon, Wartortle, and Ivysaur.
9. Atomic standalone match persistence with hashed secrets and automatic
   browser-seat reconnection after server restart.
10. Private multi-action team-turn queuing, reserved energy, undo/pass/resolve,
    one public revision per turn, and deterministic turn-aware replays.
11. A persistent deterministic solo mode whose server-controlled Player B uses
    the same authoritative queue, validation, resolution, and replay pipeline.
12. Authoritative custom team selection backed by the standalone roster catalog.
13. A checked migration manifest covering all 46 current source characters and
    detecting character, name, skill-count, effect-vocabulary, and target-mode drift.
14. Pikachu's complete active kit and Static passive, implemented through reusable
    targeting reactions, conditional effects, cost overrides, cooldown control,
    starting passives, and health-loss primitives.
15. Complete reviewed ports for Butterfree, Zubat/Golbat, Chansey/Blissey, and
    Pidgey/Pidgeotto, with their reusable control, drain, revive, queue, and
    evolution mechanics.
16. Pokemon Trainer's complete eight-skill definition, weighted turn-start ball
    rotation, permanent capture/banish, copied active forms, limited uses,
    alternating stackable buffs, force evolution, and banish-safe revival.
17. Koffing/Weezing's complete active kit, owner-only Poison Gas packets,
    stackable source-turn Smog, Haze cleansing and effect suppression,
    Self-Destruct death aftershock, team evasion, and unique-skill evolution.
18. Gastly/Haunter's complete active kit, HP-loss and damage-dealt evolution,
    missing-HP stun scaling, permanent target-turn Curse packets, Spite damage
    modifiers, and Glare's first-use punishment.
19. Abra/Kadabra's complete active kit, target-anchored Future Sight expiry,
    flat outgoing Calm Mind buffs, source-turn duration tracking, dual-target
    Teleport protection, enemy-status cleansing, and Calm Mind evolution.
20. Krabby/Kingler's complete active kit, destructible Harden shield tracking,
    shield-gated turn-start evolution, stacked Metal Claw damage, active-only
    cooldown increases, Drenched costs and Physical vulnerability, and team Bubble.
21. Scyther's complete active kit, permanent Fury Cutter scaling, Swords Dance
    packet bonuses and piercing conversion, layered X-Cutter chance/repeat logic,
    and kill-refreshed deterministic Double Team evasion.
22. Eevee, Jolteon, Flareon, and Vaporeon's complete active kits, including
    independently seeded random targets, mixed ally/enemy effects, delayed
    cooldown penalties, targeting reactions, unpierceable reduction, tracked
    defense, source-bound damage-over-time, helpful-skill immunity, and team healing.
23. Ekans/Arbok's complete active kit, including independently doubling Badly
    Poison stacks, permanent stacking Poison Fang venom, affliction-only cleansing,
    delayed source-turn regeneration, Crunch vulnerability, threshold execution,
    evolution, and the full upgraded Arbok skill set.
24. Machop/Machoke's complete active kit, including defense destruction,
    shield-bound stackable Bulk Up bonuses, dual evolution routes, first-new-skill
    Counter cancellation and reflection, source-locked Taunt targeting, Physical
    damage scaling, non-Mental stun control, and the full upgraded Machoke kit.
25. Magikarp/Gyarados's complete active kit, including turn-start and Splash-driven
    evolution, conditional Struggle validation, source-turn Dragon Rage packets,
    temporary Hyper Beam affliction conversion, recovery lockout, full stun, and
    selected-target Hydro Pump splash damage.
26. Mr. Mime's complete active kit, including Dazzling Gleam screen charging,
    tracked outgoing-damage Barrier, team Shield, reciprocal screen discounts,
    Safeguard healing and Shield bonuses, extended screens, and stun reduction.
27. Hitmonchan's complete active kit, including piercing team pressure, target-turn
    affliction damage, cooldown paralysis, class-specific Physical stuns, temporary
    cooldown penalties, stackable Mega Punch setup, and bonus consumption.
28. Hitmonlee's complete active kit, including independent seeded critical rolls,
    Focus Energy chance bonuses, Double/Low Kick slot alternation, non-affliction
    damage suppression, and High Jump Kick's deterministic hit/crash branches.
29. Aerodactyl's complete active kit and Rock Head passive, including nonlethal
    recoil, actual-loss-to-Shield conversion, tracked Shield consumption, team
    Rock Slide rolls, Shield-scaled Stone Edge stun chance, and linked crit damage.
30. Magnemite/Magneton's complete active kit, including Magnet Rise Physical
    immunity and packet bonuses, window-bound two-skill evolution, harmful-skill
    stun and cooldown paralysis, stackable target-side piercing vulnerability,
    repeated team Spark packets, upgraded team Thunder Wave, and deterministic
    replay of both evolution orders.
31. Onix's complete active kit and Sturdy passive, including one-time lethal
    survival and execute immunity, permanent Iron Tail reduction, Rock Throw's
    one-use armor bonus, first-use Stealth Rock cooldown and damage penalties,
    stacking expiration damage, team taunts, tracked Harden Shield, and capped
    flat unpierceable reduction.
32. Meowth/Persian's complete active kits and evolution passive, including actual-color
    Pay Day theft and Night Slash cost replacement, extendable typed Fury Swipes
    packets, source-specific Fake Out target history, initial-HP Night Slash branches,
    three-extension evolution with healing and slot cooldown transfer, and Persian's
    one-time reactive theft from each other enemy's newly used harmful skill.
33. Clefairy/Clefable's complete active kits and evolution passive, including seeded
    relation-aware Metronome copies, actual-healing evolution progress, consecutive
    60/40/20/0-percent Moonlight steps and affliction cleansing, source-turn-start
    Double Slap follow-ups, accuracy/evasion cleansing and prevention, and Rare Candy.
34. Jigglypuff/Wigglytuff's complete active kits and evolution passive, including
    source-bound Perish Song countdowns and instant defeat, once-per-turn countdown
    acceleration, team Sing stuns, delayed Wish healing and target hooks, seeded
    Humiliate energy, deterministic evolution on execution, and Rare Candy.
35. Beedrill/Mega Beedrill's complete active kits and evolution passive, including
    permanent stacking Poison Sting damage, conditional Envenom bursts and blind,
    two-use evolution with healing and flat unpierceable reduction, packet-based
    Hive Swarm protection and stun immunity, Hive Sting replacement, scaled Fell
    Stinger with survivor-only permanent blind, Rare Candy, and seeded replays.
36. Articuno, Moltres, and Zapdos's complete active kits, including escalating
    Sheer Cold, class-specific stuns and cooldown paralysis, Heat generation and
    degrading Overheat costs, source-team harmful-skill traps, Charge discounts,
    Thunderbolt detonation and Zap Cannon acceleration, and Flight protection.
37. Replaced abbreviated standalone skill summaries with the exact full current
    Comic Arena descriptions for all 216 ported skill definitions and added a
    parity gate against `characters.js`.
38. Ported the remaining 12 characters (Mew, Mewtwo, Dragonite, Cyndaquil,
    Chikorita, Totodile, Aegislash, Ditto, Scraggy, Dragapult, Nincada, and
    Primeape), completing the full 46-character checked roster
    (`migration/roster-manifest.json`: 46/46 `ported-full`, 0 `not-started`).
39. Added standalone player accounts: registration, login, HS256-signed
    persistent sessions, and scrypt password hashing, backed by atomic
    per-player JSON storage (`reference/player-service.mjs`,
    `reference/player-storage.mjs`, `reference/password-hashing.mjs`). The
    account/profile schema mirrors production's field names for the
    mission/skin/currency data it doesn't populate yet, so those phases can
    attach without renaming anything.
40. Linked matches to accounts (`matchService.create()`/`join()` accept an
    optional `playerId`; matches call an injected `onMatchComplete` hook
    exactly once, the first time `game.winner` is set) and ported the
    goal-based mission system on top: 26 production Pokemon-arena missions
    (`reference/mission-catalog.mjs`), a pure evaluation engine matching
    production's post-match evaluation loop, a `GET /api/missions` endpoint,
    and a `reference/mission-service.mjs` bridge that updates
    `profile.missions`/`profile.skins` when a linked account wins. See
    [MISSION_PORT.md](./MISSION_PORT.md) for exactly what was ported, adapted,
    or deliberately deferred (starter/evolution-choice missions, the
    real-time-windowed Primeape event, and — notably — team-selection gate
    enforcement, which is tracked but not yet blocked on unlock state).
41. Ported the character-skin system: all 23 production Pokemon-arena skins
    (`reference/skin-catalog.mjs`), unlock/equip logic matching production's
    endpoints exactly (`reference/skin-service.mjs`,
    `GET /api/skins`/`POST /api/skins/unlock`/`POST /api/skins/equip`), and
    the six battle-affecting type-override skins captured as data
    (`SKIN_TYPE_OVERRIDES`) though not yet wired into the battle engine. See
    [SKIN_PORT.md](./SKIN_PORT.md).

## Next milestones

1. Move the executable engine boundary from the JavaScript oracle to Haskell.
2. Compile the Elm battle client against protocol v2.
3. ~~Add standalone accounts, teams, and progression.~~ Accounts, match
   linking, and mission progression are done (#39, #40).
4. Add matchmaking, reconnect windows, and turn timers.
5. ~~Port the remaining roster in reviewed content batches.~~ Done — 46/46
   characters fully ported (#38).
6. ~~Add skins.~~ Done (#41). Remaining: enforce mission-based character
   unlocks in team selection, wire the six skin type-overrides into the
   battle engine at match setup, add a client UI for missions/skins, then a
   real store (PayPal) on top of the same accounts foundation, plus admin
   tools.

## Rules for future porting

- Port reviewed character definitions; do not import production modules at runtime.
- Preserve deterministic replays for every new mechanic.
- Validate every action on the standalone server.
- Serialize state separately for each viewer before sending it.
- Add regression tests for every ported skill and passive.
- Copy each skill's complete production description and keep description parity
  green; abbreviated prototype summaries are not acceptable player-facing text.
- Keep the running game and all user overrides unchanged.
