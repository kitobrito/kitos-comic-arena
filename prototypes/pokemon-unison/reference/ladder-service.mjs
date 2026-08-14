import {
    createDefaultLadderState,
    getLevelForCumulativeExperience,
    getRankInfoForLevel,
    LADDER_LOSS_EXPERIENCE,
    LADDER_RANK_TIERS,
    LADDER_WIN_EXPERIENCE,
} from './ladder-catalog.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

const TOP_RANK_MIN_LEVEL = LADDER_RANK_TIERS[0].minLevel;

function nextLadderState(ladder, didWin) {
    const current = { ...createDefaultLadderState(), ...(ladder ?? {}) };
    const wins = current.wins + (didWin ? 1 : 0);
    const losses = current.losses + (didWin ? 0 : 1);
    const streak = didWin
        ? current.streak >= 0
            ? current.streak + 1
            : 1
        : current.streak <= 0
          ? current.streak - 1
          : -1;
    const experiencePoints = current.experiencePoints + (didWin ? LADDER_WIN_EXPERIENCE : LADDER_LOSS_EXPERIENCE);
    const level = getLevelForCumulativeExperience(experiencePoints);
    return {
        ...current,
        wins,
        losses,
        streak,
        experiencePoints,
        level,
        rank: getRankInfoForLevel(level).rank,
        highestStreak: Math.max(current.highestStreak, streak > 0 ? streak : 0),
        highestLevel: Math.max(current.highestLevel, level),
    };
}

function ladderSortKey(profile) {
    const ladder = { ...createDefaultLadderState(), ...(profile.ladder ?? {}) };
    return ladder;
}

export function createLadderService({ playerService }) {
    function applyMatchResultToPlayer(playerId, didWin) {
        playerService.updateProfile(playerId, (profile) => ({
            ...profile,
            ladder: nextLadderState(profile.ladder, didWin),
        }));
    }

    return {
        // Wired as part of matchService's onMatchComplete fan-out (see
        // reference/server.mjs) alongside missionService.onMatchComplete.
        // Only ladder-mode matches affect rating - solo/private/quick wins
        // never touch a player's ladder stats.
        onMatchComplete({ playerIds, winner, mode }) {
            if (mode !== 'ladder') return;
            for (const seat of ['A', 'B']) {
                const playerId = playerIds?.[seat];
                if (!playerId) continue;
                applyMatchResultToPlayer(playerId, winner === seat);
            }
        },

        // Recomputes every player's global ladderRank/isTopRank in one batch
        // pass, matching production's own recompute-not-incremental approach
        // (kitos-comic-arena/server.js's leaderboard sort), then returns the
        // top `limit` entries.
        leaderboard(limit = 50) {
            const players = playerService.listAll();
            const ranked = players
                .map((player) => ({ player, ladder: ladderSortKey(player.profile) }))
                .sort((left, right) => {
                    if (right.ladder.level !== left.ladder.level) return right.ladder.level - left.ladder.level;
                    if (right.ladder.experiencePoints !== left.ladder.experiencePoints) {
                        return right.ladder.experiencePoints - left.ladder.experiencePoints;
                    }
                    if (right.ladder.wins !== left.ladder.wins) return right.ladder.wins - left.ladder.wins;
                    return String(left.player.username).localeCompare(String(right.player.username));
                });

            const topRankIndex = ranked.findIndex((entry) => entry.ladder.level >= TOP_RANK_MIN_LEVEL);

            ranked.forEach((entry, index) => {
                const ladderRank = index + 1;
                const isTopRank = topRankIndex >= 0 && index === topRankIndex;
                if (entry.ladder.ladderRank === ladderRank && entry.ladder.isTopRank === isTopRank) return;
                playerService.updateProfile(entry.player.id, (profile) => ({
                    ...profile,
                    ladder: { ...ladderSortKey(profile), ladderRank, isTopRank },
                }));
            });

            return clone(ranked.slice(0, limit).map(({ player, ladder }, index) => ({
                username: player.username,
                ladder: { ...ladder, ladderRank: index + 1, isTopRank: topRankIndex === index },
            })));
        },
    };
}
