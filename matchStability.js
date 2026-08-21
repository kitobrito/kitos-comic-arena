'use strict';

class MatchRevisionConflictError extends Error {
    constructor(message = 'Match state changed before this command could be committed.') {
        super(message);
        this.name = 'MatchRevisionConflictError';
        this.code = 'MATCH_REVISION_CONFLICT';
    }
}

const toNonNegativeInteger = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const getMatchStateRevision = (match) => toNonNegativeInteger(match?.stateRevision, 0);
const getMatchTurnNumber = (match) => toNonNegativeInteger(match?.turnNumber, 0);

const normalizeMatchVersionFields = (match) => {
    if (!match || typeof match !== 'object') return match;
    match.stateRevision = getMatchStateRevision(match);
    match.turnNumber = getMatchTurnNumber(match);
    return match;
};

const DEFAULT_LANE_WATCHDOG_MS = 20000;

const createMatchCommandCoordinator = ({ logger = console } = {}) => {
    const lanes = new Map();

    const execute = (matchId, commandName, task, metadata = {}) => {
        const key = String(matchId || '').trim();
        if (!key) return Promise.reject(new Error('matchId is required for a match command.'));
        const previous = lanes.get(key) || Promise.resolve();
        const startedAt = Date.now();
        const run = previous.catch(() => {}).then(task);
        const settled = run.then(
            () => undefined,
            () => undefined
        ).finally(() => {
            if (lanes.get(key) === settled) lanes.delete(key);
        });
        lanes.set(key, settled);
        // A command that never settles (a hung DB call with no timeout of its own,
        // a response that never finishes or closes) must not permanently block every
        // other command queued behind it for this match. Release the lane after a
        // bounded wait so play can continue; persistMatchState's stateRevision check
        // still protects against the stuck task and a later command racing each other.
        const watchdogMs = metadata.watchdogMs ?? DEFAULT_LANE_WATCHDOG_MS;
        const watchdogTimer = setTimeout(() => {
            if (lanes.get(key) === settled) {
                lanes.delete(key);
                logger.warn?.('[match-command] lane-watchdog-released', {
                    matchId: key,
                    command: commandName,
                    durationMs: Date.now() - startedAt,
                });
            }
        }, watchdogMs);
        if (typeof watchdogTimer.unref === 'function') watchdogTimer.unref();
        settled.finally(() => clearTimeout(watchdogTimer));
        if (metadata.log !== false) {
            run.then(
                (result) => logger.info?.('[match-command]', {
                    matchId: key,
                    command: commandName,
                    arena: metadata.arena || result?.arena || null,
                    startingRevision: metadata.startingRevision ?? null,
                    resultRevision: result?.stateRevision ?? null,
                    turnNumber: result?.turnNumber ?? null,
                    outcome: 'committed',
                    durationMs: Date.now() - startedAt,
                }),
                (error) => logger.warn?.('[match-command]', {
                    matchId: key,
                    command: commandName,
                    arena: metadata.arena || null,
                    startingRevision: metadata.startingRevision ?? null,
                    outcome: error?.code === 'MATCH_REVISION_CONFLICT' ? 'revision-conflict' : 'failed',
                    error: error?.code || error?.message || String(error),
                    durationMs: Date.now() - startedAt,
                })
            );
        }
        return run;
    };

    return {
        execute,
        getActiveLaneCount: () => lanes.size,
    };
};

const createCoordinatedMatchHandler = ({ coordinator, handler, log } = {}) => {
    if (!coordinator || typeof coordinator.execute !== 'function') {
        throw new TypeError('A match command coordinator is required.');
    }
    if (typeof handler !== 'function') {
        throw new TypeError('A match route handler is required.');
    }

    return async (req, res, next) => {
        const matchId = String(req?.params?.matchId || '').trim();
        const commandName = `${String(req?.method || 'GET').toLowerCase()} ${req?.path || '/'}`;
        const shouldLog = typeof log === 'function' ? log(req) : log ?? req?.method !== 'GET';
        try {
            return await coordinator.execute(
                matchId,
                commandName,
                () => handler(req, res, next),
                { log: shouldLog }
            );
        } catch (error) {
            if (typeof next === 'function') return next(error);
            throw error;
        }
    };
};

const normalizeTargetEntries = (selection) => {
    if (Array.isArray(selection)) return selection;
    return selection && typeof selection === 'object' ? [selection] : [];
};

const assertMatchInvariants = (match, { chakraTypes = [], isUnitBanished = () => false } = {}) => {
    if (!match || typeof match !== 'object') throw new Error('Match state is unavailable.');
    const players = Array.isArray(match.players) ? match.players : [];
    const usernames = players.map((player) => player?.username).filter(Boolean);
    const usernameSet = new Set(usernames.map((username) => String(username).trim().toLowerCase()));
    const hasUsername = (username) => usernameSet.has(String(username || '').trim().toLowerCase());
    const getBoardUnits = (username) => {
        const direct = match.board?.[username];
        if (Array.isArray(direct)) return direct;
        const normalized = String(username || '').trim().toLowerCase();
        const boardKey = Object.keys(match.board || {}).find(
            (key) => String(key).trim().toLowerCase() === normalized
        );
        return boardKey && Array.isArray(match.board?.[boardKey]) ? match.board[boardKey] : [];
    };
    if (match.status !== 'ended' && (!match.currentTurn || !hasUsername(match.currentTurn))) {
        throw new Error('Active match currentTurn must identify a player.');
    }
    if (match.status === 'ended' && match.currentTurn) {
        throw new Error('Ended matches cannot retain a currentTurn.');
    }

    for (const username of usernames) {
        const units = getBoardUnits(username);
        units.forEach((unit, slot) => {
            const hp = Number(unit?.hp);
            if (!Number.isFinite(hp) || hp < 0) {
                throw new Error(`Invalid HP for ${username}:${slot}.`);
            }
        });
        const pool = match.chakraPools?.[username];
        if (pool && typeof pool === 'object') {
            chakraTypes.forEach((type) => {
                const amount = Number(pool[type] || 0);
                if (!Number.isInteger(amount) || amount < 0) {
                    throw new Error(`Invalid ${type} chakra for ${username}.`);
                }
            });
        }

        const pending = match.pendingTurns?.[username];
        if (!pending || typeof pending !== 'object') continue;
        const queued = pending.queuedByActorSlot && typeof pending.queuedByActorSlot === 'object'
            ? pending.queuedByActorSlot
            : {};
        const order = Array.isArray(pending.queueOrder) ? pending.queueOrder : [];
        if (new Set(order.map(String)).size !== order.length) {
            throw new Error(`Duplicate queued actor for ${username}.`);
        }
        let requiredRandom = 0;
        Object.entries(queued).forEach(([actorKey, entry]) => {
            const actorSlot = Number.parseInt(actorKey, 10);
            const unit = units[actorSlot];
            if (!Number.isInteger(actorSlot) || !unit || unit.alive === false || isUnitBanished(unit)) {
                throw new Error(`Queued actor is unavailable for ${username}:${actorKey}.`);
            }
            requiredRandom += Math.max(0, Number(entry?.requiredRandom) || 0);
            normalizeTargetEntries(entry?.targetSelection).forEach((target) => {
                const targetUsername = target?.username;
                const targetSlot = Number.parseInt(target?.slot, 10);
                if (!hasUsername(targetUsername) || !Number.isInteger(targetSlot) || !getBoardUnits(targetUsername)[targetSlot]) {
                    throw new Error(`Queued target is unavailable for ${username}:${actorKey}.`);
                }
            });
        });
        const assignedRandom = chakraTypes.reduce(
            (sum, type) => sum + Math.max(0, Number(pending.randomAssignments?.[type]) || 0),
            0
        );
        const unresolvedRandom = Math.max(0, Number(pending.unresolvedRandom) || 0);
        if (assignedRandom + unresolvedRandom !== requiredRandom) {
            throw new Error(`Random chakra reservations are inconsistent for ${username}.`);
        }
    }
    return true;
};

const createSeededRandom = (seed = 1) => {
    let state = (Number(seed) >>> 0) || 1;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
};

module.exports = {
    MatchRevisionConflictError,
    assertMatchInvariants,
    createCoordinatedMatchHandler,
    createMatchCommandCoordinator,
    createSeededRandom,
    getMatchStateRevision,
    getMatchTurnNumber,
    normalizeMatchVersionFields,
    toNonNegativeInteger,
};
