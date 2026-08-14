# Pokemon Unison standalone

This is a separate game built from the isolated Haskell/Elm-inspired vertical
slice. It does not replace, connect to, import into, or modify the production game.
The current `characters.js`, `battleLogic.js`, account data, assets, and local
overrides remain authoritative and untouched.

## What is implemented

- all 46 currently-scoped playable characters, fully ported (see
  `migration/roster-manifest.json` for the checked list)
- all four production-inspired skill slots and evolution passives for Charmander,
  Squirtle, and Bulbasaur
- the Charmeleon, Wartortle, and Ivysaur replacement skill sets
- every active base/evolved skill and reviewed passive for the thirty-four-character roster
- exact full current Comic Arena descriptions for all 216 standalone skill definitions,
  protected by an automated source-parity test
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
- standalone player accounts: registration, login, and persistent HS256-signed
  sessions, hashed with scrypt (not bcrypt — see "Dependencies" below), backed
  by atomic per-player JSON storage that survives a server restart
- matches optionally linked to a signed-in account, and 26 of production's
  goal-based Pokemon-arena missions (win/streak/same-team goals, prerequisite
  chains, unlock-point and character rewards) evaluated automatically after
  every match a linked account wins, exposed at `GET /api/missions`; see
  [MISSION_PORT.md](./MISSION_PORT.md) for exactly what was ported vs.
  deliberately deferred
- all 23 production Pokemon-arena character skins, with unlock/equip
  purchase logic matching production exactly (insufficient-points and
  duplicate-unlock rejection, mission-reward-only skins, per-character
  equip validation) at `GET /api/skins`, `POST /api/skins/unlock`, and
  `POST /api/skins/equip`; see [SKIN_PORT.md](./SKIN_PORT.md) for what's
  ported vs. deferred (skin art, and wiring the six battle-affecting
  type-override skins into the engine)
- an unlock-points store with a real PayPal integration (order create and
  capture against PayPal's actual REST v2 API, idempotent on repeated
  capture, gated by `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` — reports
  unavailable rather than faking a purchase when unset) at `GET /api/store`,
  `POST /api/store/paypal/create-order`, `POST /api/store/paypal/capture`,
  and a points-based direct character purchase at
  `POST /api/store/characters/:characterId/purchase`; see
  [STORE_PORT.md](./STORE_PORT.md)
- mission-based character-unlock **enforcement**: a signed-in account
  creating a match cannot select a mission-locked character it hasn't
  unlocked (`POST /api/matches` returns 403), while anonymous play remains
  fully open; see MISSION_PORT.md's "Gate enforcement" section for the two
  deliberate scope limits (anonymous play is exempt by design, and only the
  match creator's own team is checked)

This is deliberately an expanding standalone slice, not a content-complete port. Complex
production mechanics such as additional evolution branches, matchmaking, and
progression stay in the existing application until their own migration phase
is built out here. A client UI for missions/skins/the store is also still to
come — see MISSION_PORT.md, SKIN_PORT.md, STORE_PORT.md, and MIGRATION.md's
"Next milestones".

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

Match snapshots are stored under `runtime-data/matches`, player accounts
under `runtime-data/players`, and PayPal purchase records under
`runtime-data/purchases`, inside this standalone project. That directory is
ignored by Git. Match tokens and invite codes are kept in browser session
storage; only their cryptographic digests are written to the match files.
Persistent player session tokens are kept in browser `localStorage` (separate
from the per-match session storage) and are never written to disk — only the
scrypt password hash is. Set `POKEMON_UNISON_DATA_DIR` to use a different
standalone storage root (it now holds `matches/`, `players/`, and
`purchases/` subdirectories).

### PayPal

The store is fully wired to PayPal's real REST v2 API, but dormant by
default. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (from a PayPal
developer app) to enable it; `PAYPAL_ENV=live` switches from the sandbox API
to the live one (sandbox is the default). Until those are set,
`GET /api/store` reports `paypalAvailable: false` and the order
create/capture endpoints return `503`, matching production's own
`isPayPalConfigured()` gate exactly. `POKEMON_UNISON_PUBLIC_URL` overrides
the return/cancel URLs PayPal redirects back to after checkout (defaults to
the request's own `Host` header).

### Dependencies

This prototype has no `npm install` step: it runs on Node's built-ins only
(`node:http`, `node:fs`, `node:crypto`, `node:test`). Player passwords are
hashed with `node:crypto`'s `scrypt` and sessions are signed HS256 tokens
built directly on `node:crypto`'s HMAC — the same algorithm family
production's `bcryptjs`/`jsonwebtoken` use, implemented without adding those
packages, since no npm registry is reachable in this workspace. If that
changes, `reference/password-hashing.mjs` and the token helpers in
`reference/player-service.mjs` are the two places to swap in the real
libraries.

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
46 source characters, all fully ported. Any source character, name, or
skill-definition drift fails the parity regression until the manifest is
reviewed.

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
8. Standalone player accounts are entirely local to this prototype (no
   connection to production's MongoDB `users` collection). The account/profile
   schema deliberately mirrors production's field names for the parts being
   ported (`unlockPoints`, `unlockedCharacterIds`, `progressByMissionId`,
   `unlockedSkinIds`, `equippedSkinByCharacterId`) so future mission/skin/store
   phases can build directly on it.
9. The store is real PayPal integration code, not a simulation — but I never
   execute a real transaction on your behalf. It stays dormant (503) until
   you supply real `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`, and testing an
   actual sandbox purchase end-to-end is on you.

See [MIGRATION.md](./MIGRATION.md) for the next checkpoint and
[PROTOCOL.md](./PROTOCOL.md) for the boundary between the engine and client.
The reviewed starter mappings and known adaptations are recorded in
[STARTER_PORT.md](./STARTER_PORT.md), the mission-catalog port mapping in
[MISSION_PORT.md](./MISSION_PORT.md), the skin-catalog port mapping in
[SKIN_PORT.md](./SKIN_PORT.md), and the store port mapping in
[STORE_PORT.md](./STORE_PORT.md).
