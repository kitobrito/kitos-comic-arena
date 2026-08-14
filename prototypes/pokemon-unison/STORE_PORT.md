# Store port mapping

Companion to [MISSION_PORT.md](./MISSION_PORT.md) and
[SKIN_PORT.md](./SKIN_PORT.md): what production's unlock-points store
(`server.js`'s `UNLOCK_POINT_STORE_PACKAGES`, PayPal order create/capture,
and the points-based character-purchase endpoint) maps to here.

## Ported

- **Point packages** (`reference/store-catalog.mjs`): the 3 Pokemon-arena
  packages verbatim (750/$5, 1,500/$10, 3,000/$20). Comic-arena packages
  aren't relevant to this prototype and weren't ported.
- **Real PayPal integration** (`reference/paypal-client.mjs`): the actual
  PayPal REST v2 OAuth client-credentials flow, order creation, and order
  capture — same endpoints, same request shape (`custom_id` encoding
  `{playerId, packageId}`, `experience_context` for the approval redirect) as
  production. Gated by `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` — but,
  unlike production, also by a prototype-specific
  `POKEMON_UNISON_ENABLE_PAYPAL=true` opt-in that must be set independently.
  This prototype can run inside the same process as the production app
  (`server.js`'s `POKEMON_UNISON_PREVIEW_PATH` mount), which already
  provisions real, live PayPal credentials as process-level env vars — the
  same variables this client reads. Without the extra opt-in, deploying this
  prototype anywhere production's real credentials are already configured
  would silently arm real payment processing, letting a real customer
  complete a real charge against the live merchant account for a currency
  that only exists in this prototype's own disconnected player profiles.
  `GET /api/store` reports `paypalAvailable: false` and the create-order/
  capture endpoints return 503 until *both* gates are satisfied. No
  credentials are available in this environment, so this has been verified
  against a mocked PayPal response (see `test/paypal-client.test.mjs`,
  `test/store-service.test.mjs`), not a real sandbox transaction — that
  verification is on whoever adds real credentials.
- **Idempotent capture**: a purchase record is persisted at `status:
  'created'` when an order is created and flipped to `status: 'granted'`
  only once capture succeeds (`reference/purchase-storage.mjs`, keyed by
  `provider:orderId`, atomic JSON writes mirroring the existing
  match/player-storage pattern). A repeated capture call for an
  already-granted order returns `alreadyGranted: true` without re-crediting
  points — this is production's exact behavior, including production's own
  minor quirk of not checking that the *caller* owns an already-granted
  order before returning that shortcut (harmless: it returns the caller's
  own current profile either way, never someone else's).
- **Points-based character purchase** (`POST
  /api/store/characters/:characterId/purchase`): spends unlock points to buy
  a mission-locked character outright, bypassing its goals — mirrors
  production's `POST /api/missions/unlock-points/purchase` exactly,
  including the cost derivation (`resolveMissionUnlockPointCost`/
  `getMissionUnlockPointCostForRank`, already built in Phase 2's
  `reference/mission-catalog.mjs` since production shares this function
  between the mission-purchase and skin-purchase flows).

## Not ported

- **Comic-arena packages and the `eevee-evolution-path`
  special-cost case** — out of scope (no comic-arena or Eevee-choice
  mechanic exists here).
- **A client storefront UI** — like missions and skins, this phase is
  API-complete with no browser-side shopping panel yet.
