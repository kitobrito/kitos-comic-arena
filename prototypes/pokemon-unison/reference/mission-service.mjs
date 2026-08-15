import {
    createDefaultMissionState,
    evaluateMissionsForPlayer,
    JOHTO_STARTER_CHARACTER_IDS,
    MISSION_CATALOG,
} from './mission-catalog.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class MissionServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'MissionServiceError';
        this.status = status;
        this.code = code;
    }
}

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

        // One-time first-login choice, mirroring production's real
        // starterCharacterId mechanic - see JOHTO_STARTER_CHARACTER_IDS
        // (mission-catalog.mjs), which deliberately does NOT include the
        // three Johto starters as always-unlocked. Idempotent: once a
        // starter is already recorded, later calls are a no-op rather than
        // an error, so a double-submit (e.g. two tabs) can't overwrite it.
        chooseStarter(playerId, rawCharacterId) {
            const characterId = String(rawCharacterId ?? '').trim().toLowerCase();
            if (!JOHTO_STARTER_CHARACTER_IDS.includes(characterId)) {
                throw new MissionServiceError(
                    400,
                    'invalid_starter',
                    'Choose Cyndaquil, Chikorita, or Totodile.'
                );
            }
            const player = playerService.getById(playerId);
            if (!player) {
                throw new MissionServiceError(404, 'player_not_found', 'Player not found.');
            }
            if (player.profile.missions?.starterCharacterId) {
                return player;
            }
            return playerService.updateProfile(playerId, (profile) => {
                const missionsState = profile.missions ?? createDefaultMissionState();
                if (missionsState.starterCharacterId) return profile;
                return {
                    ...profile,
                    missions: {
                        ...missionsState,
                        starterCharacterId: characterId,
                        unlockedCharacterIds: Array.from(
                            new Set([...missionsState.unlockedCharacterIds, characterId])
                        ),
                    },
                };
            });
        },
    };
}
