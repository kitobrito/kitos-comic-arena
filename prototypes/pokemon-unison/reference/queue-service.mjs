import { createHash, randomBytes } from 'node:crypto';

import { validateTeamSelection } from './roster.mjs';

export class QueueServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'QueueServiceError';
        this.status = status;
        this.code = code;
    }
}

const QUEUE_MODES = ['quick', 'ladder'];

function makeSecret(bytes = 24) {
    return randomBytes(bytes).toString('base64url');
}

function digestSecret(secret) {
    return createHash('sha256').update(String(secret)).digest('hex');
}

function requireMode(mode) {
    if (!QUEUE_MODES.includes(mode)) {
        throw new QueueServiceError(400, 'invalid_mode', 'Mode must be quick or ladder.');
    }
    return mode;
}

// In-memory only, no persistence: a "waiting to be matched" entry is
// meaningless after a restart (the player's client would just re-enqueue),
// so there's nothing worth writing to disk here - mirrors
// createMemoryMatchStorage's approach for the same reason.
export function createQueueService({ matchService }) {
    const pools = new Map(QUEUE_MODES.map((mode) => [mode, new Map()]));
    const resultsByDigest = new Map();

    function findPool(digest) {
        for (const pool of pools.values()) {
            if (pool.has(digest)) return pool;
        }
        return null;
    }

    return {
        enqueue({ mode, playerId, teams, formOverrides } = {}) {
            requireMode(mode);
            if (!playerId) {
                throw new QueueServiceError(401, 'sign_in_required', 'Quick and Ranked matches require a signed-in player.');
            }
            const teamError = validateTeamSelection(teams);
            if (teamError) throw new QueueServiceError(400, 'invalid_teams', teamError);

            const pool = pools.get(mode);
            const opponent = [...pool.values()].find((entry) => entry.playerId !== playerId);
            const secret = makeSecret();
            const digest = digestSecret(secret);

            if (opponent) {
                pool.delete(opponent.digest);
                const created = matchService.create({
                    opponent: mode,
                    teams: { A: opponent.teams, B: teams },
                    playerIds: { A: opponent.playerId, B: playerId },
                    formOverrides: { A: opponent.formOverrides, B: formOverrides },
                });
                resultsByDigest.set(opponent.digest, { matchId: created.matchId, token: created.token });
                return { status: 'matched', matchId: created.matchId, token: created.tokenB, queueToken: secret };
            }

            pool.set(digest, { digest, playerId, teams, formOverrides, joinedAt: Date.now() });
            return { status: 'waiting', queueToken: secret };
        },

        status(queueToken) {
            const digest = digestSecret(queueToken);
            if (resultsByDigest.has(digest)) {
                const result = resultsByDigest.get(digest);
                resultsByDigest.delete(digest);
                return { status: 'matched', ...result };
            }
            if (findPool(digest)) return { status: 'waiting' };
            throw new QueueServiceError(404, 'queue_entry_not_found', 'That search has already ended.');
        },

        cancel(queueToken) {
            const digest = digestSecret(queueToken);
            const pool = findPool(digest);
            if (!pool) {
                throw new QueueServiceError(404, 'queue_entry_not_found', 'That search has already ended.');
            }
            pool.delete(digest);
        },

        size(mode) {
            return requireMode(mode) && pools.get(mode).size;
        },
    };
}
