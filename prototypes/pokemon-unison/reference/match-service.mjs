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
import { DEFAULT_TEAMS, ROSTER_CATALOG, validateMatchTeams } from './roster.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

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

function publicMatch(match, player) {
    const state = viewerState(match.game, player);
    const ownsPendingTurn = player === match.game.currentPlayer;
    state.legalActions = match.joined.B && ownsPendingTurn
        ? legalQueuedActions(match.game, match.pendingActions)
        : [];
    state.availableEnergy = ownsPendingTurn
        ? remainingQueuedEnergy(match.game, match.pendingActions) ?? clone(state.energy[player])
        : null;
    return {
        matchId: match.id,
        revision: match.revision,
        queueRevision: ownsPendingTurn ? match.queueRevision : 0,
        player,
        mode: match.botPlayer ? 'solo' : 'private',
        opponent: match.botPlayer ? { type: 'bot', player: match.botPlayer, name: 'Training Bot' } : { type: 'human' },
        waitingForOpponent: !match.joined.B,
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
        (match.inviteDigest || match.botPlayer === 'B')
    );
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

export function createMatchService({ storage = createMemoryMatchStorage() } = {}) {
    const matches = new Map();
    storage.loadAll().filter(validStoredMatch).forEach((match) => {
        match.pendingActions = Array.isArray(match.pendingActions) ? match.pendingActions : [];
        match.queueRevision = Number.isInteger(match.queueRevision) ? match.queueRevision : 0;
        match.botPlayer = match.botPlayer === 'B' ? 'B' : null;
        matches.set(match.id, match);
    });

    function persist(match) {
        match.updatedAt = new Date().toISOString();
        storage.save(match);
    }

    function resolveBotTurn(match) {
        if (!match.botPlayer || match.game.winner || match.game.currentPlayer !== match.botPlayer) return;
        const result = resolveQueuedTurn(match.game, planDeterministicBotTurn(match.game));
        if (!result.ok) throw new Error(`Deterministic bot turn failed: ${result.error}`);
        match.game = result.state;
        match.pendingActions = [];
        match.queueRevision = 0;
        match.revision += 1;
    }

    return {
        create({ seed, teams, startingPlayer, opponent = 'human' } = {}) {
            if (!['human', 'bot'].includes(opponent)) {
                throw new MatchServiceError(400, 'invalid_opponent', 'Opponent must be human or bot.');
            }
            const botPlayer = opponent === 'bot' ? 'B' : null;
            const selectedTeams = teams ?? DEFAULT_TEAMS;
            const teamError = validateMatchTeams(selectedTeams);
            if (teamError) throw new MatchServiceError(400, 'invalid_teams', teamError);
            const id = randomUUID();
            const token = makeSecret();
            const inviteCode = botPlayer ? null : makeSecret(12);
            const game = createGame({ seed, teams: selectedTeams, startingPlayer, economyMode: 'arena' });
            const match = {
                id,
                revision: 0,
                queueRevision: 0,
                game,
                pendingActions: [],
                inviteDigest: inviteCode ? digestSecret(inviteCode) : null,
                joined: { A: true, B: Boolean(botPlayer) },
                botPlayer,
                tokenDigests: { A: digestSecret(token), B: null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            matches.set(id, match);
            resolveBotTurn(match);
            persist(match);
            return {
                ...publicMatch(match, 'A'),
                token,
                ...(inviteCode ? { inviteCode } : {}),
            };
        },

        join(matchId, inviteCode) {
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
            const token = makeSecret();
            match.joined.B = true;
            match.tokenDigests.B = digestSecret(token);
            persist(match);
            return {
                ...publicMatch(match, 'B'),
                token,
            };
        },

        view(matchId, token) {
            const match = requireMatch(matches, matchId);
            const player = authenticate(match, token);
            return publicMatch(match, player);
        },

        act(matchId, token, input) {
            const match = requireMatch(matches, matchId);
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
            persist(match);
            return publicMatch(match, player);
        },

        queue(matchId, token, input) {
            const match = requireMatch(matches, matchId);
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
            return publicMatch(match, player);
        },

        undoQueued(matchId, token) {
            const match = requireMatch(matches, matchId);
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
            return publicMatch(match, player);
        },

        resolveTurn(matchId, token) {
            const match = requireMatch(matches, matchId);
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
            persist(match);
            return publicMatch(match, player);
        },

        surrender(matchId, token) {
            const match = requireMatch(matches, matchId);
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
                persist(match);
            }
            return publicMatch(match, player);
        },

        replay(matchId, token) {
            const match = requireMatch(matches, matchId);
            authenticate(match, token);
            return clone(exportReplay(match.game));
        },

        size() {
            return matches.size;
        },

        roster() {
            return { characters: clone(ROSTER_CATALOG) };
        },
    };
}
