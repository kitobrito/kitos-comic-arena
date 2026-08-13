# Mission port mapping

This records, one time, the mapping between production's mission catalog
(`server.js`'s `DEFAULT_MISSION_CATALOG` plus the `POKEMON_*_MISSION_ENTRY`
constants merged into it by `ensureRequiredMissionCatalogEntries`) and
`reference/mission-catalog.mjs`'s `MISSION_CATALOG`, so a future pass can see
at a glance what's ported, what's adapted, and what's deliberately deferred
without re-deriving it from `server.js` again.

## How production scopes a mission to the Pokemon arena

A mission belongs to the Pokemon arena only if its literal `arena` field is
`'pokemon'` — there is no inference from `reward_character` or naming.
`DEFAULT_MISSION_CATALOG`'s main array is 100% Comic-arena missions; every
Pokemon-arena mission lives in a separate `POKEMON_*_MISSION_ENTRY` constant
merged in afterward.

## Twelve characters that are never mission-gated

`pokemon-trainer`, `charmander`, `squirtle`, `bulbasaur`, `butterfree`,
`koffing`, `zubat`, `chansey`, `pidgey`, `abra`, `meowth`, `nincada` never
appear as a `reward_character` on any Pokemon-arena mission in production —
they're unlocked from account creation. No mission entries exist for them,
and none are needed here either.

## Ported (26 entries in `MISSION_CATALOG`)

Every entry below is a goal-based mission (`win_matches` /
`win_matches_same_team` / `win_streak_same_team` / `win_ladder_matches`)
transcribed with production's exact field values (missionId, title, goals,
character requirements, win counts, `unlock_point_cost`). Two adaptations,
both called out inline in `reference/mission-catalog.mjs`:

- **No ladder mode exists yet** in this prototype (only solo/private
  matches), so `mode_restriction` is not enforced — any match counts toward
  any mission, including the two production entries restricted to
  `['ladder']` (`pokemon-ladder-first-25-wins`) or requiring
  `win_ladder_matches` specifically. This is strictly more permissive than
  production, not less.
- **`pokemon-wave-2-dragonite`** requires teammate `gyarados` in production,
  which has no standalone `ROSTER` id here (Magikarp evolves in place under
  `magikarp`, the same pattern as `machop`/`machoke`). Remapped to
  `magikarp`.

## Deliberately not ported (documented, not silently dropped)

- **`eevee-evolution-path`, `gen2-starter-choice`**: both grant a *choice*
  between multiple reward characters (`reward_character_ids`) through a
  dedicated pick endpoint (`POST /api/profile/pokemon/starter` and its
  gen2/eevee equivalents in production), not a single `reward_character`
  grant on goal completion. The evaluation engine here only understands a
  single `reward_character`. Needs that pick endpoint built first.
- **`cyndaquil-evolve-{quilava,typhlosion}`,
  `chikorita-evolve-{bayleaf,meganium}`,
  `totodile-evolve-{croconaw,feraligatr}`** (6 entries): gated on
  `starter_character_id` (which Johto starter the player picked via the same
  missing endpoint above), and grant a `reward_skin_id` rather than a
  character — skins don't exist here until Phase 3.
- **`primeape-annihilape-week`**: a real-time-windowed event mission
  (`starts_at`/`ends_at`) granting a `reward_skin_id`. Needs both Phase 3
  (skins) and the event-window plumbing (`isMissionActiveAt`,
  `PRIMEAPE_EVENT_DURATION_MS`) production uses, which has no standalone
  equivalent yet.
- **`pikachu-starter-path`** *is* ported, but only via its goal
  (`win_matches` with Pidgey ×10) — production also lets a player pick
  Pikachu directly as one of four starters (`pikachu`, `charmander`,
  `bulbasaur`, `squirtle`), which auto-completes this mission's progress
  without checking the goal. That direct-pick endpoint isn't built here, so
  the goal is the only path to Pikachu in this prototype for now.

## Gate enforcement is not implemented yet

Mission completion correctly updates a player's
`profile.missions.unlockedCharacterIds` and `unlockPoints`, and reward skins
are recorded into `profile.skins.unlockedSkinIds` (ahead of Phase 3 actually
defining a skin catalog to interpret them against). **Team selection does
not yet check any of this** — `reference/roster.mjs`'s
`validateMatchTeams`/`validateTeamSelection` still allow any of the 46
ported characters regardless of a player's unlock state, matching today's
existing (pre-mission) behavior exactly. Wiring `matchService.create()`/
`join()` to reject a locked character for a linked account is a natural next
increment, deliberately deferred rather than risking a wide, undertested
change to the same validation path nearly every existing test exercises.
