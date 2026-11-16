# Pokémon Campaign: admin preview

Open `/pokemon-campaign/` while signed in to the existing site as an administrator.
The live session and current database role are verified for every page, module and
asset. Anonymous requests return 401, regular accounts return 403, and direct
`/prototypes/pokemon-campaign/` source URLs return 404. The preview is not in the
public demo catalog. Campaign progress is saved in this browser under the signed-in
account's username and does not award competitive ranks, unlocks or currency.

## Play

Choose Mudkip, Treecko or Torchic. All start at 50 HP with their specified 25-damage,
1-Random move. Select a move, choose a highlighted target, then resolve the turn.
The first trainer has a 50-HP Zigzagoon with 20-damage Tackle (1 Random). Empty
turns are disabled in this lesson. Every starter wins in two hits at 30 HP.

The first win gives +10 max HP, the specified second starter move, one Talent Point,
and a choice of Slugma, Pineco or Swinub. A victory in the first two-member battle
opens the choice of Zangoose or Seviper. Every new recruit starts at 50 HP with
one move. Camp restores the team before each battle.

Seven encounters introduce coordinated damage, affliction stacks, healing, control
and opposing team combinations. Only the first battle guarantees victory. Opponents
use the same energy, cooldown, targeting and one-action-per-Pokémon rules. Inspect
their moves before a fight or tap an enemy when not targeting a move. Losses can
be retried or followed by a return to camp to change the build.

## Growth, move choices and talents

Each first-clear victory gives participating teammates +10 max HP, capped at 100.
Fainted teammates still participated. Recruits join at different stages, so they
reach the cap at different times. By the seventh victory all three are at 100 HP.
There is no further HP growth. Replaying or retrying cannot farm growth or points.

Each Pokémon learns its second move after its first victory. Its third slot unlocks
after three victories with the team and its fourth after five. Each of those last
two slots offers two different moves. Only one alternative fits each slot, for a
maximum of four active moves. Choices can be changed at camp.

Each first-clear victory awards one shared Talent Point. Talents belong to individual
moves: +5 primary power, 20% critical chance (double damage), 15% Burn chance for
Fire attacks, 10% Stun chance for other damaging moves, shorter cooldowns, or extra
Shield for utility moves. Available upgrades depend on the move. Mix upgrades across
moves and Pokémon; there are no specialization locks. Refund all talents at camp.
Changing a move refunds talents attached to its discarded alternative.

The designer-specified starter and second-member moves are in `roster.mjs`.
Pineco's increasing Needle Spit damage persists during its current battle. Slugma's
permanent Magma affliction stacks on the affected enemy during its current battle.
Turn-start damage, type effectiveness, piercing, shields, misses, cooldowns and
seeded chance reuse the Pokémon Unison battle engine. Campaign scenario definitions
are attached to those units and never registered in the existing competitive roster.

## Validation

```
npm run test:campaign
node --test prototypes/pokemon-unison/test/engine.test.mjs prototypes/pokemon-unison/test/*port.test.mjs
node prototypes/pokemon-campaign/test/serve.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node prototypes/pokemon-campaign/test/browser.mjs
```

The local test server binds to 127.0.0.1 and uses a fixture cookie solely for automated
browser checks. The production server always verifies its real signed session and
current database role. Browser tests cover desktop and phone layouts, opening damage,
rewards, talents, persistence, targeting and access denial. `MENU_BROWSER=webkit`
selects WebKit. `REDUCED_MOTION=1` checks the operating system motion preference.
Screenshots go into ignored `test-output/`.

## Art

Full-body official illustrations matching the supplied references are stored locally
as transparent PNGs. Mudkip, Torchic, Zigzagoon, Slugma, Pineco, Swinub, Zangoose,
Seviper, Lotad and Wurmple come from the PokeAPI official-artwork image collection:
https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/other/official-artwork

Treecko's supplied ORAS pose uses the transparent version at:
https://media.pokemoncentral.it/wiki/b/bb/Artwork0252_ROZA.png

Poochyena is a background-removed cutout of the user-supplied reference. The original
generated cutout is retained in the workspace; the campaign uses a copy. The route
background is an SVG built for this mode. Character art remains owned by its
respective rights holders.
