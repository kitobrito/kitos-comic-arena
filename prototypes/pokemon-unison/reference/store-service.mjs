import { MISSION_CATALOG, normalizeCharacterId, resolveMissionUnlockPointCost } from './mission-catalog.mjs';
import { capturePayPalOrder, createPayPalOrder, isPayPalConfigured, parsePayPalCustomId, paypalEnvironment } from './paypal-client.mjs';
import { createMemoryPurchaseStorage } from './purchase-storage.mjs';
import { findUnlockPointStorePackage, serializeStorePackageForClient, UNLOCK_POINT_STORE_PACKAGES } from './store-catalog.mjs';

export class StoreServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'StoreServiceError';
        this.status = status;
        this.code = code;
    }
}

export function createStoreService({
    playerService,
    catalog = UNLOCK_POINT_STORE_PACKAGES,
    missionCatalog = MISSION_CATALOG,
    purchaseStorage = createMemoryPurchaseStorage(),
    fetchImpl = fetch,
} = {}) {
    function requirePlayer(playerId) {
        const player = playerService.getById(playerId);
        if (!player) throw new StoreServiceError(404, 'player_not_found', 'Player not found.');
        return player;
    }

    return {
        storefront(playerId) {
            const player = playerId ? playerService.getById(playerId) : null;
            return {
                packages: catalog.map(serializeStorePackageForClient),
                unlockPoints: player?.profile?.missions?.unlockPoints ?? 0,
                paypalAvailable: isPayPalConfigured(),
                paypalEnvironment: paypalEnvironment(),
            };
        },

        async createOrder(playerId, packageId, { returnUrl, cancelUrl } = {}) {
            if (!isPayPalConfigured()) {
                throw new StoreServiceError(503, 'paypal_not_configured', 'PayPal payments are not configured yet.');
            }
            const packageEntry = findUnlockPointStorePackage(packageId, catalog);
            if (!packageEntry) {
                throw new StoreServiceError(404, 'package_not_found', 'Point package not found.');
            }
            requirePlayer(playerId);
            const { orderId, approveUrl } = await createPayPalOrder(
                { packageEntry, playerId, returnUrl, cancelUrl },
                fetchImpl
            );
            const now = new Date().toISOString();
            purchaseStorage.save({
                provider: 'paypal',
                orderId,
                status: 'created',
                playerId,
                packageId: packageEntry.packageId,
                points: packageEntry.points,
                amountUsd: packageEntry.amountUsd,
                currency: packageEntry.currency,
                createdAt: now,
                updatedAt: now,
            });
            return { orderId, approveUrl, packageId: packageEntry.packageId };
        },

        async captureOrder(playerId, orderId) {
            if (!isPayPalConfigured()) {
                throw new StoreServiceError(503, 'paypal_not_configured', 'PayPal payments are not configured yet.');
            }
            if (!orderId) {
                throw new StoreServiceError(400, 'order_id_required', 'Order ID is required.');
            }
            const existing = purchaseStorage.get('paypal', orderId);
            const player = requirePlayer(playerId);
            if (existing?.status === 'granted') {
                return { alreadyGranted: true, player, orderId };
            }

            const capture = await capturePayPalOrder(orderId, fetchImpl);
            const customId = parsePayPalCustomId(capture.customId);
            if (!customId.playerId || customId.playerId !== playerId) {
                throw new StoreServiceError(403, 'order_mismatch', 'This PayPal order does not belong to your account.');
            }
            const packageEntry = findUnlockPointStorePackage(customId.packageId, catalog);
            if (!packageEntry) {
                throw new StoreServiceError(400, 'package_not_found', 'The purchased point package is no longer available.');
            }
            if (capture.amountValue !== packageEntry.amountUsd || capture.currencyCode !== packageEntry.currency) {
                throw new StoreServiceError(400, 'amount_mismatch', 'The captured PayPal amount does not match this point package.');
            }

            const updatedPlayer = playerService.updateProfile(playerId, (profile) => ({
                ...profile,
                missions: {
                    ...profile.missions,
                    unlockPoints: Math.max(0, Number(profile.missions?.unlockPoints) || 0) + packageEntry.points,
                },
            }));
            purchaseStorage.save({
                provider: 'paypal',
                orderId,
                status: 'granted',
                playerId,
                packageId: packageEntry.packageId,
                points: packageEntry.points,
                amountUsd: packageEntry.amountUsd,
                currency: packageEntry.currency,
                captureId: capture.captureId,
                payerId: capture.payerId,
                payerEmail: capture.payerEmail,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            return { alreadyGranted: false, player: updatedPlayer, orderId, pointsGranted: packageEntry.points };
        },

        // Spend unlock points to buy a mission-locked character outright,
        // bypassing its goals — mirrors production's
        // POST /api/missions/unlock-points/purchase.
        purchaseCharacterWithPoints(playerId, rawCharacterId) {
            const characterId = normalizeCharacterId(rawCharacterId);
            if (!characterId) {
                throw new StoreServiceError(400, 'character_required', 'Character is required.');
            }
            const player = requirePlayer(playerId);
            const mission = missionCatalog.find(
                (entry) => normalizeCharacterId(entry.reward_character) === characterId
            );
            if (!mission) {
                throw new StoreServiceError(400, 'not_purchasable', 'This character is not a mission-locked unlock.');
            }
            const missionState = player.profile.missions ?? {};
            const unlockedIds = new Set((missionState.unlockedCharacterIds ?? []).map(normalizeCharacterId));
            if (unlockedIds.has(characterId)) {
                throw new StoreServiceError(409, 'already_unlocked', 'Character is already unlocked.');
            }
            const cost = resolveMissionUnlockPointCost(mission);
            const unlockPoints = Math.max(0, Number(missionState.unlockPoints) || 0);
            if (unlockPoints < cost) {
                throw new StoreServiceError(
                    400,
                    'insufficient_points',
                    `You need ${cost} unlock points to buy this character.`
                );
            }
            const updatedPlayer = playerService.updateProfile(playerId, (profile) => {
                const nextMissionState = profile.missions ?? {};
                const nextUnlocked = new Set((nextMissionState.unlockedCharacterIds ?? []).map(normalizeCharacterId));
                nextUnlocked.add(characterId);
                return {
                    ...profile,
                    missions: {
                        ...nextMissionState,
                        unlockPoints: Math.max(0, Number(nextMissionState.unlockPoints) || 0) - cost,
                        unlockedCharacterIds: Array.from(nextUnlocked),
                        purchasedUnlocks: [
                            ...(nextMissionState.purchasedUnlocks ?? []),
                            { characterId, missionId: mission.missionId, cost, purchasedAt: new Date().toISOString() },
                        ],
                    },
                };
            });
            return { player: updatedPlayer, characterId, cost };
        },
    };
}
