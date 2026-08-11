# Pokemon Unison standalone

This is a separate game built from the isolated Haskell/Elm-inspired vertical
slice. It does not replace, connect to, import into, or modify the production game.
The current `characters.js`, `battleLogic.js`, account data, assets, and local
overrides remain authoritative and untouched.

## What is implemented

- thirty-one fully ported playable characters: Pokemon Trainer, Charmander, Squirtle,
  Bulbasaur, Pikachu, Butterfree, Koffing, Gastly, Abra, Krabby, Scyther, Eevee,
  Jolteon, Flareon, Vaporeon, Ekans, Machop, Magikarp, Mr. Mime, Hitmonchan,
  Hitmonlee, Aerodactyl, Magnemite, Onix, Meowth, Clefairy, Jigglypuff, Beedrill,
  Zubat, Chansey, and Pidgey
- all four production-inspired skill slots and evolution passives for Charmander,
  Squirtle, and Bulbasaur
- the Charmeleon, Wartortle, and Ivysaur replacement skill sets
- every active base/evolved skill and reviewed passive for the thirty-one-character roster
- Pokemon Trainer's weighted turn-start Ball Cycle, four capture balls, permanent
  banish and copied forms, two-use Potion, alternating stackable X-Stats, Rare
  Candy force-evolution, and banish-safe Revive
- authoritative actor, target, turn, energy, cooldown, and stun validation
- seeded deterministic chance and random-target selection
- immutable action transitions and replay export/import
- the production 18-type effectiveness table with no STAB, capped flat modifiers,
  immunity as double resistance, one adjustment per target per cast, and a five-damage floor
- normal, piercing, and affliction damage
- shields, healing, health drain, periodic effects, guards, invulnerability,
  healing prevention, hidden statuses, and victory detection
- viewer-scoped state that hides enemy cooldowns, exact energy, and invisible
  statuses
- a standalone authoritative match service with private player tokens
- private match creation, invite joining, revisioned polling, and replay export
- immediate solo matches against a deterministic server-controlled Player B
- authoritative three-Pokemon team selection from the currently ported roster
- private multi-action team-turn queues with one action per living Pokemon,
  explicit color selection for Random costs, exact energy reservation, undo,
  explicit pass/resolve, and deterministic ordering
- portrait-side skill selection, whole-card portrait/name/skill-area targeting, colored-square skill costs,
  source-skill effect icons with hover/tap descriptions, continuous health-color
  blending, Shield/Barrier tracks, Bulbasaur Sun pips, and animated Burn/paralysis overlays
- atomic standalone match persistence and automatic browser reconnection after
  a server restart
- a playable zero-install two-browser client
- an initial Haskell model/engine skeleton and Elm viewer/port boundary
- regression tests for determinism, queue privacy and restart recovery, targeting,
  status expiry, replay rejection, type effectiveness, and safe asset serving
- a checked 46-character migration manifest and source-drift coverage report

This is deliberately an expanding standalone slice, not a content-complete port. Complex
production mechanics such as additional evolution branches, skins, missions,
matchmaking, accounts, progression, payments, and all remaining Pokémon stay in the
existing application until a later migration phase is justified.

## Run it now

The workspace includes a bundled Node runtime even though `node` is not on the
PowerShell `PATH`.

From the repository root:

```powershell
& 'C:\Users\kienan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' prototypes/pokemon-unison/reference/server.mjs
```

Open:

```text
http://127.0.0.1:4173
```

The standalone server owns match state and uses the same pure reference engine
used by the tests. Choose **Play solo vs bot** for an immediate match in one
browser, or create a private match and open its Player B invite in another
window. The bot plans through the same authoritative legal-action queue as a
human. Artwork is served read-only from the existing repository `assets` folder
through a path-confined route.

Match snapshots are stored under `runtime-data/matches` inside this standalone
project. That directory is ignored by Git. Player tokens and invite codes are
kept in browser session storage; only their cryptographic digests are written to
the match files. Set `POKEMON_UNISON_DATA_DIR` to use a different standalone
storage location.

## Run the tests

```powershell
Set-Location prototypes/pokemon-unison
& 'C:\Users\kienan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test test/*.test.mjs
```

## Check full-roster migration coverage

```powershell
& 'C:\Users\kienan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' prototypes/pokemon-unison/scripts/roster-parity.mjs
```

The report reads the current local `characters.js` as build-time migration input;
the standalone game does not load it at runtime. The current checked baseline is
46 source characters: thirty-one fully ported and 15 not yet
started. Any source character, name, or skill-definition drift fails the parity
regression until the manifest is reviewed.

## Haskell and Elm

The intended destination is:

```text
untrusted action
      |
      v
Haskell parser + validator
      |
      v
pure deterministic transition
      |
      +----> replay/event transcript
      |
      v
viewer-scoped serializer
      |
      v
Elm model/update/view
```

The relevant source is:

- `haskell/src/Pokemon/Model.hs`
- `haskell/src/Pokemon/Roster.hs`
- `haskell/src/Pokemon/Engine.hs`
- `haskell/test/Main.hs`
- `elm/src/Main.elm`

Stack, GHC, and Elm are not installed in the current workspace, so those sources
cannot be compiled here yet. The tested JavaScript implementation under
`reference/` is the executable behavioral oracle. The Haskell and Elm skeletons
still cover the protocol-v1 core; forms, passive counters, and the expanded
effect vocabulary must be added before they can replace the oracle.
When the toolchains are installed:

```text
cd haskell
stack test

cd ../elm
npm install
npm run build
```

## Important prototype decisions

1. The standalone server and engine own truth. The client can only submit an
   action using its private player token and render a censored state.
2. Randomness is state. A seed and ordered team-turn transcript reproduce the
   match.
3. Target legality is computed and revalidated server-side.
4. Viewer serialization happens before network output.
5. Current artwork and identifiers are referenced, not duplicated.
6. This game does not read the production server, database, match collection,
   `battleLogic.js`, `characters.js`, or stored overrides at runtime.
7. Solo bots are deterministic participants in the standalone service; they do
   not call or reuse the production game's battle-bot implementation.

See [MIGRATION.md](./MIGRATION.md) for the next checkpoint and
[PROTOCOL.md](./PROTOCOL.md) for the boundary between the engine and client.
The reviewed starter mappings and known adaptations are recorded in
[STARTER_PORT.md](./STARTER_PORT.md).
