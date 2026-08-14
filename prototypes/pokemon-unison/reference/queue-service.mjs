import { createHash, randomBytes } from 'node:crypto';

import { BOT_ACCOUNTS } from './bot-catalog.mjs';
import { ROSTER, validateTeamSelection } from './roster.mjs';

export class QueueServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'QueueServiceError';
        this.status = status;
        this.code = code;
    }
}

const QUEUE_MODES = ['quick', 'ladder'];

// If no real opponent is found within this long, fall back to a bot -
// checked lazily (the next time the still-waiting player polls status()),
// not via a background timer, matching the rest of this server's design.
const BOT_FALLBACK_DELAY_MS = 15_000;
const BOT_TURN_DELAY_MIN_MS = 20_000;
const BOT_TURN_DELAY_MAX_MS = 35_000;

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
export function createQueueService({ matchService, playerService, now = () => Date.now() }) {
    const pools = new Map(QUEUE_MODES.map((mode) => [mode, new Map()]));
    const resultsByDigest = new Map();

    // Bots are seeded once, here at construction time, so the leaderboard
    // already looks populated before any real player has queued - not
    // lazily on first fallback use.
    const botPlayerIdByUsername = new Map(
        BOT_ACCOUNTS.map((account) => [
            account.username,
            playerService.ensureBotPlayer({ username: account.username, ladder: account.ladder }).id,
        ])
    );

    function findPool(digest) {
        for (const pool of pools.values()) {
            if (pool.has(digest)) return pool;
        }
        return null;
    }

    function fallBackToBot(mode, entry) {
        const account = BOT_ACCOUNTS[Math.floor(Math.random() * BOT_ACCOUNTS.length)];
        const botPlayerId = botPlayerIdByUsername.get(account.username);
        const avatarSpecies = ROSTER[account.avatarSpeciesId];
        const created = matchService.create({
            opponent: mode,
            teams: { A: entry.teams, B: account.team },
            playerIds: { A: entry.playerId, B: botPlayerId },
            formOverrides: { A: entry.formOverrides },
            botSeat: 'B',
            botTurnWindow: { minMs: BOT_TURN_DELAY_MIN_MS, maxMs: BOT_TURN_DELAY_MAX_MS },
            opponentDisplay: { name: account.username, avatarUrl: avatarSpecies?.facePicture ?? null },
        });
        return { status: 'matched', matchId: created.matchId, token: created.token };
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

            pool.set(digest, { digest, playerId, teams, formOverrides, joinedAt: now() });
            return { status: 'waiting', queueToken: secret };
        },

        status(queueToken) {
            const digest = digestSecret(queueToken);
            if (resultsByDigest.has(digest)) {
                const result = resultsByDigest.get(digest);
                resultsByDigest.delete(digest);
                return { status: 'matched', ...result };
            }
            for (const [mode, pool] of pools) {
                const entry = pool.get(digest);
                if (!entry) continue;
                if (now() - entry.joinedAt < BOT_FALLBACK_DELAY_MS) return { status: 'waiting' };
                pool.delete(digest);
                return fallBackToBot(mode, entry);
            }
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
