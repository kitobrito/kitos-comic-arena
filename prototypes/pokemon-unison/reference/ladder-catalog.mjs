// Ported from kitos-comic-arena/server.js's production ladder system
// (LADDER_RANK_TIERS / LADDER_EXP_BRACKETS / getRankInfoForLevel and
// friends) so pokemon-unison's ladder mode uses the same rank names and
// leveling curve as the site it is meant to eventually replace, rather than
// inventing a new one. `isHokage` is renamed `isTopRank` since "Hokage" is
// specific to the Naruto arena this logic originated in.

export const LADDER_MAX_LEVEL = 50;

export const LADDER_RANK_TIERS = Object.freeze([
    { minLevel: 46, rank: 'Infinity Knight' },
    { minLevel: 41, rank: 'Dimension Crusader' },
    { minLevel: 36, rank: 'Purity Aegis' },
    { minLevel: 31, rank: 'Galaxy Reaper' },
    { minLevel: 26, rank: 'Abyssal Grasp' },
    { minLevel: 21, rank: 'Void Sentinel' },
    { minLevel: 16, rank: 'Stormbreaker' },
    { minLevel: 12, rank: 'Blood Ripper' },
    { minLevel: 6, rank: 'Temporal Warden' },
    { minLevel: 1, rank: 'Sparkstrike' },
]);

const LADDER_EXP_BRACKETS = Object.freeze([
    { minLevel: 1, maxLevel: 3, expRequired: 500 },
    { minLevel: 4, maxLevel: 5, expRequired: 750 },
    { minLevel: 6, maxLevel: 11, expRequired: 1000 },
    { minLevel: 12, maxLevel: 15, expRequired: 2000 },
    { minLevel: 16, maxLevel: 20, expRequired: 2500 },
    { minLevel: 21, maxLevel: 25, expRequired: 3000 },
    { minLevel: 26, maxLevel: 30, expRequired: 3500 },
    { minLevel: 31, maxLevel: 35, expRequired: 4000 },
    { minLevel: 36, maxLevel: 40, expRequired: 4500 },
    { minLevel: 41, maxLevel: 45, expRequired: 5000 },
    { minLevel: 46, maxLevel: 49, expRequired: 5500 },
]);

// A ladder win/loss's flat EXP award. Production tunes this per-match-type;
// this prototype only has one ladder match type, so a single constant is
// enough.
export const LADDER_WIN_EXPERIENCE = 100;
export const LADDER_LOSS_EXPERIENCE = 25;

export function getRankInfoForLevel(level) {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    return (
        LADDER_RANK_TIERS.find((entry) => normalizedLevel >= entry.minLevel) ||
        LADDER_RANK_TIERS[LADDER_RANK_TIERS.length - 1]
    );
}

export function getExperienceRequiredForNextLevel(level) {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    if (normalizedLevel >= LADDER_MAX_LEVEL) return 0;
    const bracket = LADDER_EXP_BRACKETS.find(
        (entry) => normalizedLevel >= entry.minLevel && normalizedLevel <= entry.maxLevel
    );
    return bracket ? bracket.expRequired : 0;
}

export function getCumulativeExperienceForLevel(level) {
    const normalizedLevel = Math.min(LADDER_MAX_LEVEL, Math.max(1, Number(level) || 1));
    let total = 0;
    for (let current = 1; current < normalizedLevel; current += 1) {
        total += getExperienceRequiredForNextLevel(current);
    }
    return total;
}

// Given a total cumulative experiencePoints value, derive the level it
// represents. Used after adding a match's EXP reward.
export function getLevelForCumulativeExperience(experiencePoints) {
    const total = Math.max(0, Number(experiencePoints) || 0);
    let level = 1;
    while (level < LADDER_MAX_LEVEL && total >= getCumulativeExperienceForLevel(level + 1)) {
        level += 1;
    }
    return level;
}

export function createDefaultLadderState() {
    return {
        level: 1,
        rank: getRankInfoForLevel(1).rank,
        experiencePoints: 0,
        wins: 0,
        losses: 0,
        streak: 0,
        highestStreak: 0,
        highestLevel: 1,
        ladderRank: null,
        isTopRank: false,
    };
}
