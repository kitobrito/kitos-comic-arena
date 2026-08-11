# Prototype protocol v1

## Standalone match session

The standalone HTTP service owns all match state:

- `POST /api/matches` creates Player A and returns a private token plus invite;
- `GET /api/roster` returns safe selection metadata for every playable standalone character;
- `POST /api/matches/:id/join` consumes the invite and creates Player B;
- `GET /api/matches/:id/state` returns only the authenticated player's view;
- `POST /api/matches/:id/queue` appends one validated action to the private turn queue;
- `DELETE /api/matches/:id/queue` removes the most recently queued action;
- `POST /api/matches/:id/resolve` resolves the queue in order as one team turn;
- `POST /api/matches/:id/actions` remains a single-action compatibility route;
- `GET /api/matches/:id/replay` exports the deterministic transcript.

Player tokens are sent as `Authorization: Bearer <token>`. A client-provided
`player` field is ignored; identity always comes from the authenticated seat.
Queue edits increment only the acting player's `queueRevision`. Resolving the
team turn increments the public match `revision` once. The opposing player sees
neither queued actions nor the private queue revision before resolution.

Passing `{ "opponent": "bot" }` to match creation instead reserves Player B for
the deterministic Training Bot. A solo response has `mode: "solo"`, contains no
invite secret or path, and is immediately playable. After Player A resolves, the
service selects Player B actions from the same queue-aware legal-action list and
resolves that queue synchronously. The public revision therefore advances once
for the human turn and once for the bot turn.

Match creation may include `teams.A` and `teams.B`. Each authoritative team must
contain exactly three unique identifiers from `/api/roster`; unknown, duplicate,
partial, or oversized selections are rejected before match state is created.

## Durable standalone state

Direct server launches persist one versioned JSON snapshot per match. Writes use
a temporary file followed by an atomic rename. A restart reloads the match game
state, public revision, unfinished private queue, queue revision, joined seats,
replay transcript, and SHA-256 digests of the high-entropy player/invite secrets.
Raw secrets are never stored in match files.

The browser retains its own seat token in per-tab session storage and polls the
same authenticated state endpoint after reconnection. A successful poll clears
any temporary connection error left by the outage.

The protocol has two authoritative engine messages plus a private queue envelope.

## Client action

```json
{
  "player": "A",
  "actorSlot": 0,
  "skillId": "charmander-flamethrower",
  "targetPlayer": "B",
  "targetSlot": 1,
  "randomEnergy": ["genjutsu"]
}
```

`randomEnergy` records the exact concrete energy selected for each effective
Random cost, after fixed costs and earlier queued reservations. Protocol keys
remain `taijutsu`, `ninjutsu`, `bloodline`, and `genjutsu`; the player-facing UI
labels and colors them Green, Blue, Red, and Yellow. The field may be omitted or
empty only when the effective skill cost contains no Random slots.

The server must reject the message unless:

- `player` is the current player;
- the actor exists and is alive;
- the skill belongs to the actor's active species/form;
- the skill is affordable and off cooldown;
- every Random slot has exactly one valid, available concrete energy choice;
- actor statuses permit its use;
- the target exists, is alive, and matches the target mode.

Client-provided damage, status data, cost, cooldown, species, HP, or random
outcomes are never accepted. The selected Random-cost payment is a player
choice, not an outcome, and is validated against the authoritative pool.

Each queued action is validated against a planning copy of the authoritative
state. The planning copy reserves energy already committed by earlier actions,
and each Pokemon may appear as an actor at most once in the team turn. An empty
queue is legal and resolves as a pass. If an earlier action defeats a later
action's target, the later action is recorded as skipped and the turn still
finishes deterministically.

## Private queue envelope

The active player receives `pendingTurn.actions` and a `queueRevision`. The
opponent receives an empty action list, `pendingTurn.hidden: true`, and queue
revision zero. Legal actions returned to the active player already account for
reserved energy and actors that have queued an action.

## Viewer state

The engine produces one state per viewer:

```json
{
  "protocolVersion": 1,
  "turnNumber": 0,
  "currentPlayer": "A",
  "winner": null,
  "viewer": "A",
  "teams": {
    "A": [],
    "B": []
  },
  "energy": {
    "A": {
      "taijutsu": 2,
      "ninjutsu": 2,
      "bloodline": 2,
      "genjutsu": 2
    },
    "B": {
      "total": 8
    }
  },
  "legalActions": [],
  "recentEvents": []
}
```

For an enemy team the serializer removes:

- exact cooldown maps;
- hidden/invisible statuses;
- status source information;
- exact energy colors.

The production protocol can later replace whole-state messages with revisioned
patches. Patch transport must not weaken viewer censorship or validation.

## Replay

```json
{
  "protocolVersion": 1,
  "seed": 1592594996,
  "teams": {
    "A": ["charmander", "squirtle", "bulbasaur"],
    "B": ["pikachu", "zubat", "chansey"]
  },
  "startingPlayer": "A",
  "turns": [],
  "actions": []
}
```

A turn-aware replay stops at the first invalid queued turn and reports its
one-based index. The flat `actions` field remains in exports for inspection and
legacy single-action replay compatibility.
Replays are inputs to the engine, never trusted snapshots of match state.
