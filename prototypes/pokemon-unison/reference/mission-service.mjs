import { createDefaultMissionState, evaluateMissionsForPlayer, MISSION_CATALOG } from './mission-catalog.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createMissionService({ playerService, catalog = MISSION_CATALOG } = {}) {
    function applyMatchResultToPlayer(playerId, { didWin, teamSpeciesIds, mode }) {
        playerService.updateProfile(playerId, (profile) => {
            const missionsState = profile.missions ?? createDefaultMissionState();
            const { missionsState: nextMissionsState, newlyUnlockedSkinIds } = evaluateMissionsForPlayer({
                catalog,
                missionsState,
                didWin,
                teamSpeciesIds,
                mode,
            });
            const skinsState = profile.skins ?? { unlockedSkinIds: [], equippedSkinByCharacterId: {} };
            return {
                ...profile,
                missions: nextMissionsState,
                skins: newlyUnlockedSkinIds.length
                    ? {
                          ...skinsState,
                          unlockedSkinIds: Array.from(new Set([...skinsState.unlockedSkinIds, ...newlyUnlockedSkinIds])),
                      }
                    : skinsState,
            };
        });
    }

    return {
        catalog() {
            return clone(catalog);
        },

        // Wired as part of matchService's onMatchComplete fan-out (see
        // reference/server.mjs), alongside ladderService.onMatchComplete.
        onMatchComplete({ playerIds, winner, teamSpeciesIds, mode }) {
            for (const seat of ['A', 'B']) {
                const playerId = playerIds?.[seat];
                if (!playerId) continue;
                applyMatchResultToPlayer(playerId, {
                    didWin: winner === seat,
                    teamSpeciesIds: teamSpeciesIds?.[seat] ?? [],
                    mode,
                });
            }
        },
    };
}
