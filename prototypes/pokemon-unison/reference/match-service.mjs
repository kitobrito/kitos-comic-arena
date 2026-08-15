import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import {
    applyAction,
    createGame,
    exportReplay,
    legalQueuedActions,
    remainingQueuedEnergy,
    resolveQueuedTurn,
    validateAction,
    validateQueuedAction,
    viewerState,
} from './engine.mjs';
import { createMemoryMatchStorage } from './match-storage.mjs';
import { validateTeamOwnership } from './mission-catalog.mjs';
import { DEFAULT_TEAMS, ROSTER_CATALOG, validateMatchTeams } from './roster.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

// Server-authoritative per-team-turn clock. Applies once both seats are
// filled (real opponent or bot) and resets whenever a team turn actually
// resolves - queueing/undoing individual actions does not reset it, since
// the budget is for submitting the whole team's turn, not each action.
export const TURN_TIMEOUT_MS = 60_000;

export class MatchServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'MatchServiceError';
        this.status = status;
        this.code = code;
    }
}

function makeSecret(bytes = 24) {
    return randomBytes(bytes).toString('base64url');
}

function digestSecret(secret) {
    return createHash('sha256').update(String(secret)).digest('hex');
}

function secretsEqual(storedDigest, candidate) {
    if (!storedDigest || !candidate) return false;
    const candidateDigest = digestSecret(candidate);
    const left = Buffer.from(storedDigest, 'hex');
    const right = Buffer.from(candidateDigest, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
}

function requireMatch(matches, matchId) {
    const match = matches.get(matchId);
    if (!match) {
        throw new MatchServiceError(404, 'match_not_found', 'That match does not exist.');
    }
    return match;
}

function authenticate(match, token) {
    if (!token) {
        throw new MatchServiceError(401, 'missing_token', 'A player token is required.');
    }
    const player = secretsEqual(match.tokenDigests.A, token)
        ? 'A'
        : secretsEqual(match.tokenDigests.B, token)
          ? 'B'
          : null;
    if (!player) {
        throw new MatchServiceError(403, 'invalid_token', 'That player token is not valid for this match.');
    }
    return player;
}

function publicMatch(match, player, now) {
    const state = viewerState(match.game, player);
    const ownsPendingTurn = player === match.game.currentPlayer;
    state.legalActions = match.joined.B && ownsPendingTurn
        ? legalQueuedActions(match.game, match.pendingActions)
        : [];
    state.availableEnergy = ownsPendingTurn
        ? remainingQueuedEnergy(match.game, match.pendingActions) ?? clone(state.energy[player])
        : null;
    const turnSecondsRemaining = match.joined.B && !match.game.winner && Number.isFinite(match.turnStartedAt)
        ? Math.max(0, Math.ceil((TURN_TIMEOUT_MS - (now() - match.turnStartedAt)) / 1000))
        : null;
    return {
        matchId: match.id,
        revision: match.revision,
        queueRevision: ownsPendingTurn ? match.queueRevision : 0,
        player,
        mode: match.mode,
        // A bot-filled queue match reports as a human opponent on purpose -
        // see queue-service.mjs's fallback - so it's indistinguishable from
        // a real matched player client-side.
        opponent: match.opponentDisplay
            ? { type: 'human', name: match.opponentDisplay.name, avatarUrl: match.opponentDisplay.avatarUrl }
            : match.botPlayer
              ? { type: 'bot', player: match.botPlayer, name: 'Training Bot' }
              : { type: 'human' },
        waitingForOpponent: !match.joined.B,
        turnSecondsRemaining,
        turnTimeoutSeconds: TURN_TIMEOUT_MS / 1000,
        pendingTurn: {
            actions: ownsPendingTurn ? clone(match.pendingActions) : [],
            hidden: !ownsPendingTurn,
        },
        state,
    };
}

function validStoredMatch(match) {
    return Boolean(
        match &&
        typeof match.id === 'string' &&
        Number.isInteger(match.revision) &&
        match.game &&
        match.joined &&
        match.tokenDigests?.A &&
        (match.inviteDigest || match.botPlayer === 'B' || match.tokenDigests?.B)
    );
}

function deriveLegacyMode(match) {
    if (match.botPlayer === 'B') return 'solo';
    return 'private';
}

export function planDeterministicBotTurn(game) {
    const queuedActions = [];
    const teamSize = game.teams[game.currentPlayer]?.length ?? 0;
    while (queuedActions.length < teamSize) {
        const available = legalQueuedActions(game, queuedActions);
        if (available.length === 0) break;
        const selected = available[0];
        queuedActions.push({
            player: selected.player,
            actorSlot: selected.actorSlot,
            skillId: selected.skillId,
            targetPlayer: selected.targetPlayer,
            targetSlot: selected.targetSlot,
            randomEnergy: clone(selected.suggestedRandomEnergy ?? []),
        });
    }
    return queuedActions;
}

export function createMatchService({ storage = createMemoryMatchStorage(), onMatchComplete, now = () => Date.now() } = {}) {
    const matches = new Map();
    storage.loadAll().filter(validStoredMatch).forEach((match) => {
        match.pendingActions = Array.isArray(match.pendingActions) ? match.pendingActions : [];
        match.queueRevision = Number.isInteger(match.queueRevision) ? match.queueRevision : 0;
        match.botPlayer = match.botPlayer === 'B' ? 'B' : null;
        match.mode = typeof match.mode === 'string' ? match.mode : deriveLegacyMode(match);
        match.botTurnWindow = match.botTurnWindow && Number.isFinite(match.botTurnWindow.minMs) && Number.isFinite(match.botTurnWindow.maxMs)
            ? match.botTurnWindow
            : null;
        match.botActsAt = Number.isFinite(match.botActsAt) ? match.botActsAt : null;
        match.opponentDisplay = match.opponentDisplay?.name ? match.opponentDisplay : null;
        match.playerIds = {
            A: typeof match.playerIds?.A === 'string' ? match.playerIds.A : null,
            B: typeof match.playerIds?.B === 'string' ? match.playerIds.B : null,
        };
        match.completionNotified = Boolean(match.completionNotified);
        matches.set(match.id, match);
    });

    function persist(match) {
        match.updatedAt = new Date().toISOString();
        storage.save(match);
    }

    function checkCompletion(match) {
        if (!match.game.winner || match.completionNotified) return;
        match.completionNotified = true;
        if (!onMatchComplete) return;
        Promise.resolve()
            .then(() =>
                onMatchComplete({
                    matchId: match.id,
                    mode: match.mode,
                    winner: match.game.winner,
                    playerIds: { ...match.playerIds },
                    teamSpeciesIds: {
                        A: match.game.teams.A.map((unit) => unit.speciesId),
                        B: match.game.teams.B.map((unit) => unit.speciesId),
                    },
                })
            )
            .catch((error) => console.error('onMatchComplete failed:', error));
    }

    function resolveBotTurn(match) {
        if (!match.botPlayer || match.game.winner || match.game.currentPlayer !== match.botPlayer) return;
        if (match.botTurnWindow) {
            // Delayed "thinking" bot (queue fallback): don't act yet - just
            // pick when it will, once, and let enforceBotTurnDelay resolve
            // it lazily on a later request, the same way turn timeouts work.
            if (!Number.isFinite(match.botActsAt)) {
                const { minMs, maxMs } = match.botTurnWindow;
                match.botActsAt = now() + minMs + Math.random() * (maxMs - minMs);
            }
            return;
        }
        const result = resolveQueuedTurn(match.game, planDeterministicBotTurn(match.game));
        if (!result.ok) throw new Error(`Deterministic bot turn failed: ${result.error}`);
        match.game = result.state;
        match.pendingActions = [];
        match.queueRevision = 0;
        match.revision += 1;
    }

    // Lazily enforced on every match access, mirroring enforceTurnTimeout:
    // once a bot-filled queue match's random "thinking" deadline has
    // passed, resolve its turn on whichever request happens to touch the
    // match next (the client's own 800ms poll makes this feel live without
    // any background timer on the server).
    function enforceBotTurnDelay(match) {
        if (!match.botTurnWindow || match.game.winner || match.game.currentPlayer !== match.botPlayer) return;
        if (!Number.isFinite(match.botActsAt) || now() < match.botActsAt) return;
        const result = resolveQueuedTurn(match.game, planDeterministicBotTurn(match.game));
        if (!result.ok) return; // Stale plan (e.g. a target died); the next access retries.
        match.game = result.state;
        match.pendingActions = [];
        match.queueRevision = 0;
        match.revision += 1;
        match.botActsAt = null;
        resolveBotTurn(match); // Schedules the next delay if it's the bot's turn again.
        match.turnStartedAt = now();
        checkCompletion(match);
        persist(match);
    }

    function requireLiveMatch(matchId) {
        const match = requireMatch(matches, matchId);
        enforceTurnTimeout(match);
        enforceBotTurnDelay(match);
        return match;
    }

    // Lazily enforced on every match access (there is no background timer):
    // if the current team's 60-second turn budget has elapsed, whatever they
    // already queued is submitted automatically - unqueued Pokemon simply do
    // nothing that turn - so a slow or absent player can never stall the match.
    function enforceTurnTimeout(match) {
        if (match.game.winner || !match.joined.B || !Number.isFinite(match.turnStartedAt)) return;
        if (now() - match.turnStartedAt < TURN_TIMEOUT_MS) return;
        let result = resolveQueuedTurn(match.game, match.pendingActions);
        if (!result.ok) {
            // The queued plan went stale (e.g. a target died to a status
            // tick) - fall back to an empty turn so the clock can never
            // get the match stuck.
            result = resolveQueuedTurn(match.game, []);
            if (!result.ok) return;
        }
        match.game = result.state;
        match.pendingActions = [];
        match.queueRevision = 0;
        match.revision += 1;
        resolveBotTurn(match);
        match.turnStartedAt = now();
        checkCompletion(match);
        persist(match);
    }

    return {
        create({
            seed,
            teams,
            startingPlayer,
            opponent = 'human',
            playerId = null,
            playerIds,
            formOverrides,
            botSeat = null,
            botTurnWindow = null,
            opponentDisplay = null,
        } = {}) {
            if (!['human', 'bot', 'quick', 'ladder'].includes(opponent)) {
                throw new MatchServiceError(400, 'invalid_opponent', 'Opponent must be human, bot, quick, or ladder.');
            }
            // Quick/ladder matches come from the matchmaking queue with both
            // players already known - there's no invite-link waiting room,
            // the match is live for both seats immediately. botSeat marks
            // one of those known players as bot-controlled (queue-fallback
            // matches), distinct from the classic opponent:'bot' solo path.
            const isQueueMatch = opponent === 'quick' || opponent === 'ladder';
            const botPlayer = botSeat || (opponent === 'bot' ? 'B' : null);
            const selectedTeams = teams ?? DEFAULT_TEAMS;
            const teamError = validateMatchTeams(selectedTeams);
            if (teamError) throw new MatchServiceError(400, 'invalid_teams', teamError);
            if (isQueueMatch && (!playerIds?.A || !playerIds?.B)) {
                throw new MatchServiceError(400, 'invalid_player_ids', 'Quick and ladder matches require both players to be signed in.');
            }
            const id = randomUUID();
            const token = makeSecret();
            const tokenB = isQueueMatch ? makeSecret() : null;
            const inviteCode = botPlayer || isQueueMatch ? null : makeSecret(12);
            const mode = opponent === 'human' ? 'private' : opponent === 'bot' ? 'solo' : opponent;
            const game = createGame({ seed, teams: selectedTeams, startingPlayer, economyMode: 'arena', formOverrides });
            const match = {
                id,
                revision: 0,
                queueRevision: 0,
                game,
                pendingActions: [],
                mode,
                inviteDigest: inviteCode ? digestSecret(inviteCode) : null,
                joined: { A: true, B: Boolean(botPlayer) || isQueueMatch },
                botPlayer,
                botTurnWindow,
                botActsAt: null,
                opponentDisplay,
                playerIds: { A: playerId || playerIds?.A || null, B: isQueueMatch ? playerIds.B : null },
                completionNotified: false,
                tokenDigests: { A: digestSecret(token), B: tokenB ? digestSecret(tokenB) : null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            matches.set(id, match);
            resolveBotTurn(match);
            match.turnStartedAt = now();
            checkCompletion(match);
            persist(match);
            return {
                ...publicMatch(match, 'A', now),
                token,
                ...(tokenB ? { tokenB } : {}),
                ...(inviteCode ? { inviteCode } : {}),
            };
        },

        join(matchId, inviteCode, { playerId = null, unlockedCharacterIds = null } = {}) {
            const match = requireMatch(matches, matchId);
            if (match.botPlayer) {
                throw new MatchServiceError(409, 'bot_match', 'This solo match already has a server-controlled opponent.');
            }
            if (!secretsEqual(match.inviteDigest, inviteCode)) {
                throw new MatchServiceError(403, 'invalid_invite', 'That invite code is not valid.');
            }
            if (match.joined.B) {
                throw new MatchServiceError(409, 'seat_taken', 'Player B has already joined this match.');
            }
            if (unlockedCharacterIds !== null) {
                const ownershipError = validateTeamOwnership(
                    match.game.teams.B.map((unit) => unit.speciesId),
                    unlockedCharacterIds
                );
                if (ownershipError) {
                    throw new MatchServiceError(403, 'character_locked', ownershipError);
                }
            }
            const token = makeSecret();
            match.joined.B = true;
            match.tokenDigests.B = digestSecret(token);
            match.playerIds.B = playerId || null;
            // The turn clock only matters once both seats are filled, so it
            // starts fresh the moment the match actually becomes playable.
            match.turnStartedAt = now();
            checkCompletion(match);
            persist(match);
            return {
                ...publicMatch(match, 'B', now),
                token,
            };
        },

        view(matchId, token) {
            const match = requireLiveMatch(matchId);
            const player = authenticate(match, token);
            return publicMatch(match, player, now);
        },

        act(matchId, token, input) {
            const match = requireLiveMatch(matchId);
            const player = authenticate(match, token);
            if (!match.joined.B) {
                throw new MatchServiceError(409, 'waiting_for_opponent', 'The opponent has not joined yet.');
            }
            if (match.pendingActions.length > 0) {
                throw new MatchServiceError(409, 'turn_queue_not_empty', 'Resolve or undo the queued turn first.');
            }
            const action = {
                player,
                actorSlot: input?.actorSlot,
                skillId: input?.skillId,
                targetPlayer: input?.targetPlayer,
                targetSlot: input?.targetSlot,
                randomEnergy: input?.randomEnergy,
            };
            const paymentError = validateAction(match.game, action, { requireExplicitRandom: true });
            if (paymentError) {
                throw new MatchServiceError(422, 'invalid_action', paymentError);
            }
            const result = applyAction(match.game, action);
            if (!result.ok) {
                throw new MatchServiceError(422, 'invalid_action', result.error);
            }
            match.game = result.state;
            match.revision += 1;
            resolveBotTurn(match);
            match.turnStartedAt = now();
            checkCompletion(match);
            persist(match);
            return publicMatch(match, player, now);
        },

        queue(matchId, token, input) {
            const match = requireLiveMatch(matchId);
            const player = authenticate(match, token);
            if (!match.joined.B) {
                throw new MatchServiceError(409, 'waiting_for_opponent', 'The opponent has not joined yet.');
            }
            if (player !== match.game.currentPlayer) {
                throw new MatchServiceError(409, 'not_your_turn', `It is ${match.game.currentPlayer}'s turn.`);
            }
            const action = {
                player,
                actorSlot: input?.actorSlot,
                skillId: input?.skillId,
                targetPlayer: input?.targetPlayer,
                targetSlot: input?.targetSlot,
                randomEnergy: input?.randomEnergy,
            };
            const error = validateQueuedAction(match.game, match.pendingActions, action);
            if (error) throw new MatchServiceError(422, 'invalid_queued_action', error);
            match.pendingActions.push(action);
            match.queueRevision += 1;
            persist(match);
            return publicMatch(match, player, now);
        },

        undoQueued(matchId, token) {
            const match = requireLiveMatch(matchId);
            const player = authenticate(match, token);
            if (player !== match.game.currentPlayer) {
                throw new MatchServiceError(409, 'not_your_turn', `It is ${match.game.currentPlayer}'s turn.`);
            }
            if (match.pendingActions.length === 0) {
                throw new MatchServiceError(409, 'queue_empty', 'There are no queued actions to undo.');
            }
            match.pendingActions.pop();
            match.queueRevision += 1;
            persist(match);
            return publicMatch(match, player, now);
        },

        resolveTurn(matchId, token) {
            const match = requireLiveMatch(matchId);
            const player = authenticate(match, token);
            if (!match.joined.B) {
                throw new MatchServiceError(409, 'waiting_for_opponent', 'The opponent has not joined yet.');
            }
            if (player !== match.game.currentPlayer) {
                throw new MatchServiceError(409, 'not_your_turn', `It is ${match.game.currentPlayer}'s turn.`);
            }
            const result = resolveQueuedTurn(match.game, match.pendingActions);
            if (!result.ok) {
                throw new MatchServiceError(422, 'invalid_turn_queue', result.error);
            }
            match.game = result.state;
            match.pendingActions = [];
            match.queueRevision = 0;
            match.revision += 1;
            resolveBotTurn(match);
            match.turnStartedAt = now();
            checkCompletion(match);
            persist(match);
            return publicMatch(match, player, now);
        },

        surrender(matchId, token) {
            const match = requireLiveMatch(matchId);
            const player = authenticate(match, token);
            if (!match.game.winner) {
                const winner = player === 'A' ? 'B' : 'A';
                match.game.winner = winner;
                match.game.events.push({
                    turn: match.game.turnNumber,
                    kind: 'surrender',
                    player,
                    winner,
                    message: `Player ${player} surrendered. Player ${winner} wins.`,
                });
                match.pendingActions = [];
                match.queueRevision = 0;
                match.revision += 1;
                checkCompletion(match);
                persist(match);
            }
            return publicMatch(match, player, now);
        },

        replay(matchId, token) {
            const match = requireMatch(matches, matchId);
            authenticate(match, token);
            return clone(exportReplay(match.game));
        },

        // For reconnect-by-account: match tokens are only ever stored as
        // one-way digests (see digestSecret/secretsEqual above), so there is
        // no stored token to hand back. Instead this mints and stores a
        // fresh token for the player's seat - the caller has already proven
        // ownership of playerId via their player-service session, so this is
        // just a server-side "reissue my seat's token" operation, the same
        // trust level join() already uses when Player B's token is minted.
        // This intentionally invalidates any other tab still holding the old
        // token for that seat.
        resumeActiveMatchForPlayer(playerId) {
            if (!playerId) return null;
            let best = null;
            for (const match of matches.values()) {
                if (match.game.winner) continue;
                const seat = match.playerIds.A === playerId ? 'A' : match.playerIds.B === playerId ? 'B' : null;
                if (!seat) continue;
                if (!best || match.updatedAt > best.match.updatedAt) {
                    best = { match, seat };
                }
            }
            if (!best) return null;
            const { match, seat } = best;
            const token = makeSecret();
            match.tokenDigests[seat] = digestSecret(token);
            persist(match);
            return { matchId: match.id, token, player: seat };
        },

        size() {
            return matches.size;
        },

        roster() {
            return { characters: clone(ROSTER_CATALOG) };
        },
    };
}
