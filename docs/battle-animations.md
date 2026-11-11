# Battle animations (Comic Arena and Pokemon Arena)

One engine animates every battle in both arenas: casts, hits, statuses, deaths, match start and match end.
It replaces the old Pokemon-only sprite bursts and the 15 hand-written death animations.

## 1. Architecture

```
assets/Animations/spritesheet/...        unTied Games Gigapack sheets (in the repo)
assets/images/PokemonArena/animations-used/<type>/frameNNNN.png   curated colour effects per Pokemon type
        |  scripts/build-battle-fx.py        (python3 scripts/build-battle-fx.py [--check])
        v
assets/data/battle-fx-manifest.json      every effect = ONE sheet + frame rectangles + fps
                                         (loose curated frames are packed into assets/images/battle-fx/<key>.png)
characters.js + pokemon-wave-2-live.js + assets/data/battle-fx-overrides.json
        |  scripts/build-battle-fx-characters.js   (node scripts/build-battle-fx-characters.js [--check])
        v
assets/data/battle-fx-characters.json    a profile for every character, battle form and skill:
                                         delivery, wind-up / travel / impact effects, kill recipe,
                                         lightsaber colours, laser colour
        |
scripts/battle-fx.js  (window.BattleFX)  the runtime engine, loaded by ingame.html before scripts/script.js
styles/battle-fx.css                     sprites, death stages, eye lasers
styles/status-fx.css                     persistent character status overlays
```

**Engine parts** (`scripts/battle-fx.js`):

| Part | What it does |
| --- | --- |
| AssetCache | Each sheet is loaded once and decoded (`Image.decode`), kept in an LRU of `MAX_SHEETS` (64). Both teams' sheets are preloaded when the first board arrives. |
| Ticker | One `requestAnimationFrame` loop drives every sprite. A frame index comes from elapsed time (`elapsed * fps`), so pacing never drifts, and the loop stops itself when nothing plays. No `setInterval`. |
| Sprites | Pooled `<div>`s on one fixed layer. Only `transform` and `background-position` change, so the browser composites them. At most `MAX_SPRITES` (32) at once. Projectiles fly with eased `translate3d`. |
| CardAnimator | A state machine per card (below), animated with the Web Animations API. Every move starts from the card's current pose, so an interrupted move blends instead of snapping. |
| DEATHS | 29 recipes that cut the victim's own portrait into tiles, strips or halves and animate them, each with its own stamp. |
| Eye lasers | Measured pupil positions for laser-eyed portraits: the eyes glow in the laser colour, then a beam fires from each eye. |

**Card state machine:**

```
idle -> entry | windup | recoil | victory | defeat
entry -> idle | windup | recoil | defeat
windup -> impact -> idle          (the attacker's lunge; melee lunges further)
recoil -> idle (or another recoil) (the target's flinch, scaled by the size of the hit; heals glow instead)
victory -> idle
defeat -> (terminal until reset at the next match)
```

**Events** (all called from `scripts/script.js`):

| Game moment | Call | Where |
| --- | --- | --- |
| First board of a match | `BattleFX.configure`, `reset`, `preload`, `enter` | `renderBoardHealth` |
| A confirmed skill hit (both players see it) | `BattleFX.cast({ actor, targets, characterId, skillId, skipTravel, key })` | `showConfirmedCombatEventFx` |
| Confirmed damage or healing | `BattleFX.recoil(card, delta, { affliction })` | `animateUnitImpact` |
| A buff or debuff with no bespoke effect | `BattleFX.status(card, harmful)` | `showConfirmedStatusChangeFx` |
| A character dies | `BattleFX.death(card, { killerId, skillId, kill, label, killerCard })` | `playCharacterDeathFx` |
| Laser-eye skills | `BattleFX.eyeLasers({ actor, targets, colour, empowered })` | `showDirectionalSkillFx` |
| Match over | `BattleFX.victory(winners)`, `BattleFX.defeat(losers)` | `applyMatchState` |

Skills that already draw a bespoke cast effect (`skillHasCustomCastFx`) keep it; the engine then adds only the
wind-up and impact (`skipTravel`). The server now sends `killedBySkillId` with `killedByCharacterId`
(`battleLogic.js`, `server.js`), so a death matches the move that caused it.

**Which death plays:** the killing skill's `kill`, else the killer's signature `kill`, else `shatter`
(the portrait rises and explodes into fading pieces). Highlights:

| Kill | Who | Stamp |
| --- | --- | --- |
| saber (one cut per blade, in its colour) | Vader, Maul, Sidious (red), Obi-Wan (blue), Yoda (green), Grievous (green, blue, violet, yellow) | SABERED |
| lucille (barbed-wire bat beats it to pulp) | Negan | LUCILLE'D |
| laser (beams from the killer's eyes, then the cut) | Homelander and Superman (red), Billy Butcher (yellow) | LASERED |
| burn (to ash, half blown away by a gust) | fire moves, Ghost Rider | TOASTY (Ghost Rider: JUDGED) |
| vines (wrap, squeeze, pop) | grass moves | STRANGLED |
| electrocute (fried black, then fades) | electric moves, Flash | FRIED |
| wave (washed away) | water moves, Aquaman | WASHED AWAY |
| dragon-claw (green claw, diagonal strips fall) | dragon moves | CLAWED |
| crush (flattened) | rock moves, Hulk, Force Choke | CRUSHED (Hulk: SMASHED) |
| fissure (shakes, splits down the middle) | ground moves | SWALLOWED |

The others: freeze, dissolve, warp, haunt, pummel, gust, swarm, shadow, slice, sparkle, riddled, boom, devour,
cocoon, drain, vanish, claw-triple (Wolverine), force-lightning (Sidious). Each has its own stamp.

## 2. Status overlays

Every persistent status (taunt, webbed, frozen, locked on, shark fins...) draws its **own layer** sized to the real
portrait (`--sfx-face`, measured each update, so phone and portrait layouts scale too). Before, about a dozen
shared the card's single `::before`/`::after`, so two at once hid each other. Layers fade in (`sfx-enter`) and
out (`sfx-leave`). Zones keep stacked statuses apart: tints over the face, rings around it, counters in the
corners, callouts above. Enemy-side text is flipped back (that side of the board is mirrored).

## 3. Adding or changing things

- **A new character or skill:** add it to `characters.js`, then `node scripts/build-battle-fx-characters.js`.
  Pokemon take their look from their move type. Comic characters take it from keywords in the skill
  (fire, laser, poison...) and otherwise from their element in `assets/data/battle-fx-overrides.json`.
  The build fails if any effect it names doesn't exist.
- **Pin a skill's look:** `"skills": { "<skill id>": "<element>" }` in the overrides file.
- **A signature kill:** `SIGNATURE_KILLS` (or `SABER_KILLERS`, `LASER_COLOURS`) in the character build script.
- **A new death recipe:** add it to `DEATHS` and `STAMPS` in `scripts/battle-fx.js`, and an element using it.
- **Eye lasers for a new portrait:** measure the pupil centres (fractions of the square image) and add the image
  file name to `EYES`.
- **New effect art:** drop it in the pack folders and run `python3 scripts/build-battle-fx.py`.
- Bump the `?v=` markers on `scripts/battle-fx.js`, `styles/battle-fx.css` and `styles/status-fx.css` in
  `ingame.html` when they change. `/scripts/battle-fx.js` is on the server's public scripts list; the build
  scripts are deliberately not.

The Stylized Projectiles pack in `assets/images/PokemonArena/animations` is a Unity build and can't be used on the web.

## 4. Verification checklist

- [x] `npm test`: `test/battle-animation-system.test.js` checks every sheet and frame exists, both catalogues
      match their sources, every character, battle form and skill has a profile with real effects and kills,
      the signature kills (sabers, Lucille, lasers, Pokemon types), the engine's loop/pool/cache rules, every
      hook in the game script, eye positions for the laser portraits, and that the server serves the engine.
- [x] Harness: all 29 death recipes run on a real card (player and mirrored enemy side) in 0.9 to 2.8 s with
      no errors, leave no stage behind, and the loop stops afterwards with no sprites alive.
- [x] State machine: casts go windup -> impact -> idle, hits recoil -> idle, defeat stays locked.
- [x] Live match on a local server (two players): cards enter, 21 sheets preload, casts and hits animate from
      confirmed events, a kill plays its death and stamp, no page errors.
- [x] Every status overlay screenshotted on a card, alone and with the new layer system.
- [x] Eye lasers: the glow sits on each pupil for Homelander, Superman and Butcher on both sides of the board.
- [ ] On a phone (portrait and landscape): watch a full match and confirm overlays scale with the portraits.
- [ ] Battle options: turning off "Skill animations" and "Death animations" stops casts and deaths.

## 5. Art that would make it better

The engine draws everything with code and the existing packs today. These pieces of art would be a big upgrade
(transparent PNG, roughly 512 px on the long side unless noted):

1. **Lucille:** "A baseball bat wrapped in rusty barbed wire, side view, hand-painted comic style, wood grain,
   black grip tape on the handle, a few dried blood flecks, transparent background, bat pointing straight up."
2. **Lightsaber blade and hilt:** "A single glowing lightsaber blade, white-hot core with a soft coloured glow,
   horizontal, transparent background" (one each in red, blue, green, violet, yellow) plus "a metal lightsaber
   hilt, side view, transparent background".
3. **Dragon claw slash:** "Three parallel claw slash marks made of green energy, diagonal, glowing edges,
   transparent background, comic style."
4. **Vines:** "Thorny green vines curling in an S shape with small leaves, side view, transparent background,
   tileable along its length."
5. **Ash and embers:** "A sprite sheet of 8 frames of black ash flakes and orange embers drifting and breaking up,
   transparent background, 128 x 128 per frame."
6. **Water wave:** "A cresting cartoon ocean wave, side view, white foam on top, transparent background, wide format."
7. **Bullet holes and cracks:** "Three bullet-hole decals with cracked edges, and three crack decals,
   transparent background, comic style."
8. **Symbiote jaws:** "Black symbiote jaws with long white teeth seen from the front, top and bottom halves as
   separate pieces, transparent background."
