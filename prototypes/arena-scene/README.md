# Admin full-body arena preview

Private entry points:
- `/arena-scene/` (opens Comic Arena)
- `/arena-scene/?arena=pokemon`

Every preview page and asset verifies the current session and database admin role.
The underlying `/prototypes/arena-scene/` directory is denied by the static server.
There is no public matchmaking option or demo registration.

The handler wraps the real `selection.html` and `ingame.html`. The existing
`scripts/script.js`, roster, skin catalogs, skill interactions, targeting APIs,
BattleFX, turn coordinator and battle bot still own gameplay. `scene.js` adapts
the existing full-body selection renders into a battlefield and proxies the real
skill buttons into a responsive command bar. Evolutions and equipped skins reuse
the same render catalog; an unavailable render falls back to its existing portrait.

Battlefield presentation (all in `scene.js` / `scene.css`):
- Each fighter stands on the floor at a foot position. Its render is trimmed to its visible
  pixels and sized from real height (`COMIC_SIZES`, `POKEMON_METRES`), with depth scaling,
  so Yoda is knee-high to the Hulk. Waist-up renders fade into the floor (`COMIC_CUT`) and
  flyers hover (`COMIC_FLYERS`, `POKEMON_FLYERS`). Add new characters to these tables.
- The invisible original portrait is the hitbox, exactly over the figure, so clicks,
  BattleFX sprites and damage numbers land on the character.
- Targets get a ground ring and an arrow over the head; nothing fades. The production
  yellow target boxes are hidden here.
- `BattleFX.cast/recoil/status/death/enter/victory` are wrapped: melee attackers dash to the
  target with afterimages and hop back, ranged attackers kick back, and the target's hit,
  damage number and health drop wait for the strike to land.

Preview matches use the regular PvP starting health, energy economy and skills.
The admin moves first; the bot uses its existing team builder and skill AI.
They have `scene-` IDs, `adminRenderPreview: true`, and `mode: pve`. Creation is
isolated from normal matchmaking maps. Normal match recovery and statistics omit
them. Completion exits before any rewards, history or mission progress writes.
Existing real matches and saved teams remain available after testing.

## Validation

```
npm run test:arena-scene
node prototypes/arena-scene/test/serve.cjs
# In another terminal; uses the real app, signed local fixture sessions, and bot engine:
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node prototypes/arena-scene/test/browser.mjs
```

The fixture server binds only to `127.0.0.1:4197`, uses in-memory collections and
an explicitly local test signing secret. Missing art is redirected to the public
live asset URL to support sparse checkouts. It never connects to the live database.
The fixture pages and test sources are not served by production.

Browser checks cover team selection and private launch, actual skill targeting,
energy spending, player/bot turns, reload, narrow layouts and reduced motion in
both arenas. Use `SCENE_BROWSER=webkit` to run the same checks with WebKit.
