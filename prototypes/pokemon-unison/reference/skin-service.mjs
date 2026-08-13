import { getSkinCatalogById, normalizeCharacterId, normalizeSkinId, normalizeSkinState, SKIN_CATALOG } from './skin-catalog.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class SkinServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'SkinServiceError';
        this.status = status;
        this.code = code;
    }
}

export function createSkinService({ playerService, catalog = SKIN_CATALOG } = {}) {
    const catalogById = getSkinCatalogById(catalog);

    function requirePlayer(playerId) {
        const player = playerService.getById(playerId);
        if (!player) throw new SkinServiceError(404, 'player_not_found', 'Player not found.');
        return player;
    }

    return {
        catalog() {
            return clone(catalog);
        },

        unlock(playerId, rawSkinId) {
            const skinId = normalizeSkinId(rawSkinId);
            const catalogEntry = catalogById.get(skinId);
            if (!catalogEntry) {
                throw new SkinServiceError(404, 'skin_not_found', 'Skin not found.');
            }
            if (catalogEntry.missionRewardOnly) {
                throw new SkinServiceError(403, 'mission_reward_only', 'This skin is unlocked through missions, not purchased.');
            }
            const player = requirePlayer(playerId);
            const skinState = normalizeSkinState(player.profile.skins, catalog);
            if (skinState.unlockedSkinIds.includes(skinId)) {
                throw new SkinServiceError(409, 'already_unlocked', 'Skin is already unlocked.');
            }
            const unlockPoints = Math.max(0, Number(player.profile.missions?.unlockPoints) || 0);
            if (unlockPoints < catalogEntry.unlockPointCost) {
                throw new SkinServiceError(
                    400,
                    'insufficient_points',
                    `You need ${catalogEntry.unlockPointCost} unlock points to buy this skin.`
                );
            }
            return playerService.updateProfile(playerId, (profile) => {
                const nextSkins = normalizeSkinState(profile.skins, catalog);
                nextSkins.unlockedSkinIds = [...nextSkins.unlockedSkinIds, skinId];
                return {
                    ...profile,
                    skins: nextSkins,
                    missions: {
                        ...profile.missions,
                        unlockPoints: Math.max(0, Number(profile.missions?.unlockPoints) || 0) - catalogEntry.unlockPointCost,
                    },
                };
            });
        },

        equip(playerId, rawCharacterId, rawSkinId) {
            const characterId = normalizeCharacterId(rawCharacterId);
            if (!characterId) {
                throw new SkinServiceError(400, 'character_required', 'Character is required.');
            }
            const player = requirePlayer(playerId);
            const skinState = normalizeSkinState(player.profile.skins, catalog);
            const skinId = rawSkinId ? normalizeSkinId(rawSkinId) : '';
            if (skinId) {
                const catalogEntry = catalogById.get(skinId);
                if (!catalogEntry) {
                    throw new SkinServiceError(404, 'skin_not_found', 'Skin not found.');
                }
                if (catalogEntry.characterId !== characterId) {
                    throw new SkinServiceError(400, 'wrong_character', 'That skin does not belong to this Pokemon.');
                }
                if (!skinState.unlockedSkinIds.includes(skinId)) {
                    throw new SkinServiceError(403, 'not_unlocked', 'Unlock the skin before equipping it.');
                }
            }
            return playerService.updateProfile(playerId, (profile) => {
                const nextSkins = normalizeSkinState(profile.skins, catalog);
                if (skinId) {
                    nextSkins.equippedSkinByCharacterId[characterId] = skinId;
                } else {
                    delete nextSkins.equippedSkinByCharacterId[characterId];
                }
                return { ...profile, skins: nextSkins };
            });
        },
    };
}
