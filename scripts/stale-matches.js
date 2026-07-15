const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

const projectRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const matchesCollectionName = process.env.MONGODB_MATCHES_COLLECTION || 'matches';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const staleMinutesArg = process.argv.find((entry) => entry.startsWith('--stale-minutes='));
const staleMinutes = Math.max(
    1,
    Number(staleMinutesArg ? staleMinutesArg.split('=')[1] : '') || 60
);
const staleMs = staleMinutes * 60 * 1000;

function getDateMs(value) {
    if (!value) return NaN;
    const date = value instanceof Date ? value : new Date(value);
    return date.getTime();
}

function summarizeMatch(match, nowMs) {
    const turnExpiresAtMs = getDateMs(match.turnExpiresAt);
    const matchStartsAtMs = getDateMs(match.matchStartsAt || match.createdAt);
    const currentTurn = typeof match.currentTurn === 'string' ? match.currentTurn : '';
    const staleByExpiredTurn =
        Number.isFinite(turnExpiresAtMs) && nowMs - turnExpiresAtMs >= staleMs;
    const staleByMissingTurn =
        !currentTurn && Number.isFinite(matchStartsAtMs) && nowMs - matchStartsAtMs >= staleMs;
    const staleReason = staleByExpiredTurn
        ? 'expired_turn'
        : staleByMissingTurn
        ? 'missing_current_turn'
        : '';

    return {
        matchId: match.matchId || '',
        arena: match.arena || '',
        mode: match.mode || '',
        status: match.status || '',
        players: Array.isArray(match.players) ? match.players.map((player) => player?.username).filter(Boolean) : [],
        currentTurn: currentTurn || null,
        createdAt: match.createdAt || null,
        matchStartsAt: match.matchStartsAt || null,
        turnStartedAt: match.turnStartedAt || null,
        turnExpiresAt: match.turnExpiresAt || null,
        overdueMinutes: Number.isFinite(turnExpiresAtMs) ? Math.round((nowMs - turnExpiresAtMs) / 60000) : null,
        staleReason,
        isStale: Boolean(staleReason),
    };
}

async function main() {
    if (!uri) {
        throw new Error('Missing MONGODB_URI in .env.');
    }

    const client = new MongoClient(uri);
    await client.connect();

    try {
        const db = client.db(dbName);
        const matchesCollection = db.collection(matchesCollectionName);
        const now = new Date();
        const nowMs = now.getTime();
        const activeMatches = await matchesCollection
            .find({ status: { $ne: 'ended' } })
            .project({
                _id: 1,
                matchId: 1,
                arena: 1,
                mode: 1,
                status: 1,
                createdAt: 1,
                matchStartsAt: 1,
                currentTurn: 1,
                turnStartedAt: 1,
                turnExpiresAt: 1,
                players: 1,
            })
            .sort({ createdAt: 1 })
            .toArray();

        const summaries = activeMatches.map((match) => summarizeMatch(match, nowMs));
        const staleMatches = summaries.filter((entry) => entry.isStale);

        console.log(
            JSON.stringify(
                {
                    now,
                    staleMinutes,
                    activeMatchCount: summaries.length,
                    staleMatchCount: staleMatches.length,
                    staleMatches,
                },
                null,
                2
            )
        );

        if (!force || staleMatches.length === 0) {
            return;
        }

        const endedAt = new Date();
        const staleIds = activeMatches
            .filter((match) => summarizeMatch(match, nowMs).isStale)
            .map((match) => match._id);

        const result = await matchesCollection.updateMany(
            { _id: { $in: staleIds } },
            {
                $set: {
                    status: 'ended',
                    winner: null,
                    surrenderedBy: null,
                    endReason: 'stale_cleanup',
                    endedAt,
                    currentTurn: null,
                    turnStartedAt: null,
                    turnExpiresAt: null,
                },
            }
        );

        console.log(
            JSON.stringify(
                {
                    forced: true,
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                    endedAt,
                },
                null,
                2
            )
        );
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
