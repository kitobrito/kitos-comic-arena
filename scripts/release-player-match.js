const { usernamesEqual, withMongo } = require('./lib/runtime-toolkit');

async function releasePlayerMatch(username) {
    if (!username || !username.trim()) throw new Error('Pass a username to release.');
    return withMongo(async ({ matches }) => {
        const activeMatches = await matches
            .find({ status: { $ne: 'ended' } })
            .project({ _id: 1, matchId: 1, arena: 1, mode: 1, players: 1, createdAt: 1, turnExpiresAt: 1 })
            .toArray();
        const ownedMatches = activeMatches.filter((match) =>
            (match.players || []).some((player) => usernamesEqual(player?.username, username))
        );
        if (!ownedMatches.length) {
            return { username, matchedCount: 0, modifiedCount: 0, releasedMatches: [] };
        }
        const endedAt = new Date();
        const result = await matches.updateMany(
            { _id: { $in: ownedMatches.map((match) => match._id) }, status: { $ne: 'ended' } },
            { $set: {
                status: 'ended',
                winner: null,
                surrenderedBy: null,
                endReason: 'admin_stale_release',
                endedAt,
                currentTurn: null,
                turnStartedAt: null,
                turnExpiresAt: null,
            } }
        );
        return {
            username,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            endedAt,
            releasedMatches: ownedMatches.map((match) => ({
                matchId: match.matchId,
                arena: match.arena,
                mode: match.mode,
                createdAt: match.createdAt,
                turnExpiresAt: match.turnExpiresAt,
            })),
        };
    });
}

if (require.main === module) {
    releasePlayerMatch(process.argv[2] || '')
        .then((result) => console.log(JSON.stringify(result, null, 2)))
        .catch((error) => {
            console.error(error.message || error);
            process.exit(1);
        });
}

module.exports = { releasePlayerMatch };
