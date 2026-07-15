const { buildMatchPayloadForUser } = require('../server');
const { cloneSerializable, normalizeArenaMode, usernamesEqual, withMongo } = require('./lib/runtime-toolkit');

function parseArgs(argv) {
    const options = {
        username: null,
        matchId: null,
        viewer: null,
        arena: '',
        json: false,
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--username' || arg === '-u') {
            options.username = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--match-id' || arg === '-m') {
            options.matchId = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--viewer' || arg === '-v') {
            options.viewer = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--arena') {
            options.arena = argv[index + 1] || '';
            index += 1;
            continue;
        }
        if (arg === '--json') {
            options.json = true;
        }
    }
    return options;
}

function summarizeUnit(unit = {}, slot) {
    const statuses = Array.isArray(unit?.state?.statuses) ? unit.state.statuses : [];
    return {
        slot,
        alive: unit.alive !== false,
        hp: unit.hp ?? null,
        maxHp: unit.maxHp ?? null,
        characterId: unit.characterId || null,
        rosterIndex: unit.rosterIndex ?? null,
        cooldowns: cloneSerializable(unit?.state?.cooldowns || {}),
        queuedSkill: unit?.state?.queuedSkill || null,
        statusCount: statuses.length,
        statuses: statuses.map((status) => ({
            id: status.id || null,
            remainingTurns: status.remainingTurns ?? null,
            fresh: Boolean(status.fresh),
            sourceUsername: status.sourceUsername || null,
            sourceSlot: status.sourceSlot ?? null,
            metadata: status.metadata || {},
        })),
    };
}

function summarizeMatch(match = {}, viewer = '') {
    const players = Array.isArray(match.players) ? match.players : [];
    const board = match.board && typeof match.board === 'object' ? match.board : {};
    const byPlayer = players.map((player) => {
        const username = player?.username || null;
        const units = username && Array.isArray(board[username]) ? board[username] : [];
        return {
            username,
            teamSize: units.length,
            units: units.map((unit, index) => summarizeUnit(unit, index)),
        };
    });

    const viewerPayload =
        viewer && players.some((player) => usernamesEqual(player?.username, viewer))
            ? buildMatchPayloadForUser(match, viewer)
            : null;

    return {
        matchId: match.matchId || null,
        arena: normalizeArenaMode(match.arena),
        mode: match.mode || null,
        status: match.status || null,
        currentTurn: match.currentTurn || null,
        turnOrder: Array.isArray(match.turnOrder) ? match.turnOrder : [],
        turnStartedAt: match.turnStartedAt || null,
        turnExpiresAt: match.turnExpiresAt || null,
        players: byPlayer,
        pendingTurns: cloneSerializable(match.pendingTurns || []),
        pendingActions: cloneSerializable(match.pendingActions || []),
        pendingQueuedEffects: cloneSerializable(match.pendingQueuedEffects || []),
        chakraPools: cloneSerializable(match.chakraPools || {}),
        economy: cloneSerializable(match.economy || {}),
        viewerPayload,
    };
}

async function loadMatch(options) {
    return withMongo(async ({ matches }) => {
        if (options.matchId) {
            return matches.findOne({ matchId: options.matchId });
        }
        if (options.username) {
            const filter = {
                'players.username': options.username,
                status: { $ne: 'ended' },
            };
            if (options.arena) {
                filter.arena = normalizeArenaMode(options.arena);
            }
            return matches.findOne(filter, { sort: { matchStartsAt: -1, createdAt: -1 } });
        }
        throw new Error('Pass --match-id <id> or --username <name>.');
    });
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const match = await loadMatch(options);
    if (!match) {
        throw new Error('No matching live match found.');
    }
    console.log(JSON.stringify(summarizeMatch(match, options.viewer || options.username || ''), null, 2));
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = {
    parseArgs,
    summarizeMatch,
    summarizeUnit,
};
