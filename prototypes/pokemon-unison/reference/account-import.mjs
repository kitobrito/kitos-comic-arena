import { createDefaultLadderState, getRankInfoForLevel, LADDER_MAX_LEVEL } from './ladder-catalog.mjs';
import { createDefaultMissionState, normalizeCharacterId } from './mission-catalog.mjs';
import { ROSTER } from './roster.mjs';
import { createDefaultSkinState, normalizeSkinState } from './skin-catalog.mjs';

// One-time translation of a real comic-arena.net account's old Pokemon
// Arena progress (server.js's profile.arenas.pokemon) into pokemon-unison's
// own profile shape, used only the first time a real account links (see
// player-service.mjs's ensureLinkedPlayer). Both systems share the same
// character/skin ids and ladder math by design (see mission-catalog.mjs and
// skin-catalog.mjs's header comments), but this deliberately does NOT
// import per-mission goal progress (production's progressByMissionId entries
// track winStreak/goalProgress in a shape this prototype's own mission
// evaluator doesn't share) - only durable, unambiguous facts: which
// characters/skins are actually unlocked, how many points banked, and
// ladder standing. In-progress mission grinding simply restarts, which is a
// much smaller loss than importing nothing, or importing something wrong.
export function translateLinkedAccountProgress(rawProgress) {
    return {
        missions: translateMissions(rawProgress),
        skins: translateSkins(rawProgress),
        ladder: translateLadder(rawProgress?.ladder),
    };
}

function translateMissions(rawProgress) {
    if (!rawProgress) return createDefaultMissionState();
    const unlockedCharacterIds = filterKnownCharacterIds(rawProgress.unlockedCharacterIds);
    const purchasedUnlocks = filterKnownCharacterIds(rawProgress.purchasedUnlocks);
    const unlockPoints = Math.max(0, Math.floor(Number(rawProgress.unlockPoints) || 0));
    return {
        progressByMissionId: {},
        unlockedCharacterIds,
        unlockPoints,
        purchasedUnlocks,
    };
}

function filterKnownCharacterIds(value) {
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(value.map(normalizeCharacterId).filter((characterId) => Boolean(ROSTER[characterId])))
    );
}

function translateSkins(rawProgress) {
    if (!rawProgress) return createDefaultSkinState();
    return normalizeSkinState({
        unlockedSkinIds: rawProgress.unlockedSkinIds,
        equippedSkinByCharacterId: rawProgress.equippedSkinByCharacterId,
    });
}

function translateLadder(rawLadder) {
    if (!rawLadder || typeof rawLadder !== 'object') return createDefaultLadderState();
    const level = Math.min(LADDER_MAX_LEVEL, Math.max(1, Math.floor(Number(rawLadder.level) || 1)));
    return {
        level,
        rank: getRankInfoForLevel(level).rank,
        experiencePoints: Math.max(0, Math.floor(Number(rawLadder.experiencePoints) || 0)),
        wins: Math.max(0, Math.floor(Number(rawLadder.wins) || 0)),
        losses: Math.max(0, Math.floor(Number(rawLadder.losses) || 0)),
        streak: Math.floor(Number(rawLadder.streak) || 0),
        highestStreak: Math.max(0, Math.floor(Number(rawLadder.highestStreak) || 0)),
        highestLevel: Math.min(LADDER_MAX_LEVEL, Math.max(level, Math.floor(Number(rawLadder.highestLevel) || level))),
        ladderRank: null,
        isTopRank: false,
    };
}
