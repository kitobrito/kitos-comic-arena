# Skin port mapping

Companion to [MISSION_PORT.md](./MISSION_PORT.md), same purpose: record once
what production's skin system (`POKEMON_SKIN_CATALOG`,
`POKEMON_GEN2_EVOLUTION_SKIN_CATALOG`, and the Primeape event skin in
`server.js`) maps to in `reference/skin-catalog.mjs`'s `SKIN_CATALOG`, so a
later pass doesn't have to re-derive it.

## Ported: all 23 production Pokemon-arena skins

Every skin in production's served Pokemon-arena catalog has a `characterId`
that's already in `ROSTER` — nothing was skipped for being out of roster
scope. All 23 are in `SKIN_CATALOG` with their real `skinId`, `characterId`,
`name`, `description`, and `unlockPointCost`.

## What's deliberately not reproduced

- **Art** (`previewFacePicture`, `skillImageOverridesBySkillId`,
  `statusFacePictureOverridesByStatusId`) — this prototype has never ported
  reskinned art for any character; skin *art* is out of scope the same way
  base-roster art already was. Only mechanically/textually meaningful fields
  are kept.
- **`skillOverridesBySkillId` text for the 5 evolution-branch skins**
  (`bulbasaur-{mega,gigantamax}-venusaur`, `squirtle-{mega,gigantamax}-blastoise`,
  `charmander-gigantamax-charizard`) — production generates these skill
  name/description renames dynamically at server startup from live
  `characters.js` text via `buildStagedPokemonEvolutionSkin()`, so there's no
  literal source value to transcribe. `charmander-charizard-legendary` is the
  one skin with genuinely literal, static override text in production, and
  that text is reproduced in full.
- **`purchaseAvailableAt` for `primeape-annihilape-evolution`** — production
  computes this from a live, mutable release-event window
  (`getPrimeapeReleaseWindow()`). No event-window mechanic exists here, so
  this skin is simply always purchasable — a difference from production only
  during its real release week, never a regression.

## Battle-affecting type overrides: data ported, engine hook NOT wired yet

Six skins (`charmander-charizard-legendary`, `charmander-gigantamax-charizard`,
`bulbasaur-mega-venusaur`, `bulbasaur-gigantamax-venusaur`,
`squirtle-mega-blastoise`, `squirtle-gigantamax-blastoise`) change a
Pokemon's actual battle type in production — not just cosmetic. That data is
captured in `SKIN_CATALOG` (`patch.pokemonTypes`) and mirrored standalone in
`SKIN_TYPE_OVERRIDES` (`resolveSkinTypeOverride(skinId)`), matching
production's `POKEMON_SKIN_TYPE_OVERRIDES`/`getPokemonSkinTypeOverride`.

**It is not applied to battles.** Production resolves the equipped skin
*live*, inside battle-logic itself, on every relevant calculation
(`getPlayerEquippedSkinId` in `battleLogic.js`). Doing that here would mean
the pure, deterministic `reference/engine.mjs` reaching out to live account
state mid-combat — a real architectural boundary this prototype has held
throughout (see README's "Important prototype decisions"). The right
standalone equivalent is to capture each side's equipped-skin type override
once, at match creation/join (when each seat's linked account, if any, is
already known), via a small setup-time engine function — not a live lookup
during damage resolution. That function doesn't exist yet; wiring it in is
the next natural increment for this file, tracked here rather than silently
dropped.

## Purchase/equip system: fully ported and tested

`reference/skin-service.mjs` ports production's unlock/equip logic exactly
(`server.js`'s `POST /api/skins/unlock` and `POST /api/skins/equip`):
insufficient-points and already-unlocked rejection, `missionRewardOnly`
skins blocked from direct purchase but equippable once granted another way,
and equip validating the skin belongs to the requested character and is
already unlocked. `GET /api/skins` serves the catalog plus (when
authenticated) the caller's own unlock/equip state — mirroring
`GET /api/missions`'s shape from Phase 2.
