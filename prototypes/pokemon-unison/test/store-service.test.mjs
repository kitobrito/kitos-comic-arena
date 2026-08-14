import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createPlayerService } from '../reference/player-service.mjs';
import { createPayPalCustomId } from '../reference/paypal-client.mjs';
import { createJsonPurchaseStorage, createMemoryPurchaseStorage } from '../reference/purchase-storage.mjs';
import { createStoreService, StoreServiceError } from '../reference/store-service.mjs';

const TEST_PACKAGES = [
    { packageId: 'pokemon-750-points', points: 750, amountUsd: '5.00', currency: 'USD', provider: 'paypal', label: '750 Unlock Points', description: '750 points' },
];

const TEST_MISSION_CATALOG = [
    { missionId: 'catch-onix', reward_character: 'onix', level_requirement: 13, goals: [{ type: 'win_matches', wins: 10 }] },
];

function withPayPalEnv(t) {
    const previous = {
        PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
        PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
        POKEMON_UNISON_ENABLE_PAYPAL: process.env.POKEMON_UNISON_ENABLE_PAYPAL,
    };
    process.env.PAYPAL_CLIENT_ID = 'sandbox-client-id';
    process.env.PAYPAL_CLIENT_SECRET = 'sandbox-secret';
    process.env.POKEMON_UNISON_ENABLE_PAYPAL = 'true';
    t.after(() => {
        Object.entries(previous).forEach(([key, value]) => {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        });
    });
}

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function fakePayPalFetch({ orderId = 'ORDER1', playerId, packageId, amountUsd = '5.00', currency = 'USD' }) {
    return async (url) => {
        if (url.includes('/v1/oauth2/token')) return jsonResponse(200, { access_token: 'fake-token' });
        if (url.includes('/v2/checkout/orders') && !url.includes('capture')) {
            return jsonResponse(201, {
                id: orderId,
                links: [{ rel: 'payer-action', href: `https://paypal.example/approve/${orderId}` }],
            });
        }
        if (url.includes('capture')) {
            return jsonResponse(201, {
                purchase_units: [
                    {
                        custom_id: createPayPalCustomId({ playerId, packageId }),
                        payments: {
                            captures: [{ id: 'CAPTURE1', status: 'COMPLETED', amount: { value: amountUsd, currency_code: currency } }],
                        },
                    },
                ],
                payer: { payer_id: 'PAYER1', email_address: 'payer@example.com' },
            });
        }
        throw new Error(`Unexpected fetch call: ${url}`);
    };
}

test('createOrder is rejected with 503 when PayPal is not configured', async () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    const playerService = createPlayerService();
    const storeService = createStoreService({ playerService, catalog: TEST_PACKAGES });
    const { player } = await playerService.register({ username: 'Buyer', email: '', password: 'longenough1' });

    await assert.rejects(
        () => storeService.createOrder(player.id, 'pokemon-750-points'),
        (error) => error instanceof StoreServiceError && error.status === 503
    );
});

test('createOrder then captureOrder grants points exactly once and persists an idempotent purchase record', async (t) => {
    withPayPalEnv(t);
    const playerService = createPlayerService();
    const purchaseStorage = createMemoryPurchaseStorage();
    const { player } = await playerService.register({ username: 'Buyer2', email: '', password: 'longenough1' });
    const fetchImpl = fakePayPalFetch({ orderId: 'ORDER1', playerId: player.id, packageId: 'pokemon-750-points' });
    const storeService = createStoreService({ playerService, catalog: TEST_PACKAGES, purchaseStorage, fetchImpl });

    const created = await storeService.createOrder(player.id, 'pokemon-750-points', {
        returnUrl: 'https://app/return',
        cancelUrl: 'https://app/cancel',
    });
    assert.equal(created.orderId, 'ORDER1');
    assert.equal(purchaseStorage.get('paypal', 'ORDER1').status, 'created');

    const captured = await storeService.captureOrder(player.id, 'ORDER1');
    assert.equal(captured.alreadyGranted, false);
    assert.equal(captured.pointsGranted, 750);
    assert.equal(captured.player.profile.missions.unlockPoints, 750);
    assert.equal(purchaseStorage.get('paypal', 'ORDER1').status, 'granted');

    const recaptured = await storeService.captureOrder(player.id, 'ORDER1');
    assert.equal(recaptured.alreadyGranted, true);
    assert.equal(playerService.getById(player.id).profile.missions.unlockPoints, 750);
});

test('captureOrder rejects an order whose custom_id belongs to a different account', async (t) => {
    withPayPalEnv(t);
    const playerService = createPlayerService();
    const { player: owner } = await playerService.register({ username: 'Owner', email: '', password: 'longenough1' });
    const { player: intruder } = await playerService.register({ username: 'Intruder', email: '', password: 'longenough1' });
    const fetchImpl = fakePayPalFetch({ orderId: 'ORDER2', playerId: owner.id, packageId: 'pokemon-750-points' });
    const storeService = createStoreService({ playerService, catalog: TEST_PACKAGES, fetchImpl });

    await assert.rejects(
        () => storeService.captureOrder(intruder.id, 'ORDER2'),
        (error) => error instanceof StoreServiceError && error.code === 'order_mismatch'
    );
});

test('captureOrder rejects a captured amount that does not match the purchased package', async (t) => {
    withPayPalEnv(t);
    const playerService = createPlayerService();
    const { player } = await playerService.register({ username: 'Mismatch', email: '', password: 'longenough1' });
    const fetchImpl = fakePayPalFetch({
        orderId: 'ORDER3',
        playerId: player.id,
        packageId: 'pokemon-750-points',
        amountUsd: '1.00',
    });
    const storeService = createStoreService({ playerService, catalog: TEST_PACKAGES, fetchImpl });

    await assert.rejects(
        () => storeService.captureOrder(player.id, 'ORDER3'),
        (error) => error instanceof StoreServiceError && error.code === 'amount_mismatch'
    );
});

test('purchaseCharacterWithPoints spends the mission-derived cost and grants the character', async () => {
    const playerService = createPlayerService();
    const storeService = createStoreService({ playerService, missionCatalog: TEST_MISSION_CATALOG });
    const { player } = await playerService.register({ username: 'PointBuyer', email: '', password: 'longenough1' });
    playerService.updateProfile(player.id, (profile) => ({
        ...profile,
        missions: { ...profile.missions, unlockPoints: 400 },
    }));

    const result = storeService.purchaseCharacterWithPoints(player.id, 'onix');
    assert.equal(result.cost, 350); // rank 13 -> getMissionUnlockPointCostForRank tier
    assert.equal(result.player.profile.missions.unlockPoints, 50);
    assert.deepEqual(result.player.profile.missions.unlockedCharacterIds, ['onix']);
    assert.equal(result.player.profile.missions.purchasedUnlocks.length, 1);
});

test('purchaseCharacterWithPoints rejects a non-mission-locked character, insufficient points, and a duplicate purchase', async () => {
    const playerService = createPlayerService();
    const storeService = createStoreService({ playerService, missionCatalog: TEST_MISSION_CATALOG });
    const { player } = await playerService.register({ username: 'PointBuyer2', email: '', password: 'longenough1' });

    assert.throws(
        () => storeService.purchaseCharacterWithPoints(player.id, 'charmander'),
        (error) => error instanceof StoreServiceError && error.code === 'not_purchasable'
    );

    assert.throws(
        () => storeService.purchaseCharacterWithPoints(player.id, 'onix'),
        (error) => error instanceof StoreServiceError && error.code === 'insufficient_points'
    );

    playerService.updateProfile(player.id, (profile) => ({
        ...profile,
        missions: { ...profile.missions, unlockPoints: 1000 },
    }));
    storeService.purchaseCharacterWithPoints(player.id, 'onix');
    assert.throws(
        () => storeService.purchaseCharacterWithPoints(player.id, 'onix'),
        (error) => error instanceof StoreServiceError && error.code === 'already_unlocked'
    );
});

test('file-backed purchase records survive restart and keep capture idempotent across service instances', async (t) => {
    withPayPalEnv(t);
    const directory = await mkdtemp(join(tmpdir(), 'pokemon-unison-purchase-storage-'));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const playerService = createPlayerService();
    const { player } = await playerService.register({ username: 'Restarter', email: '', password: 'longenough1' });
    const fetchImpl = fakePayPalFetch({ orderId: 'ORDER4', playerId: player.id, packageId: 'pokemon-750-points' });

    const firstStorage = createJsonPurchaseStorage(directory);
    const firstStoreService = createStoreService({
        playerService,
        catalog: TEST_PACKAGES,
        purchaseStorage: firstStorage,
        fetchImpl,
    });
    await firstStoreService.createOrder(player.id, 'pokemon-750-points');
    await firstStoreService.captureOrder(player.id, 'ORDER4');
    assert.equal(playerService.getById(player.id).profile.missions.unlockPoints, 750);

    const restartedStorage = createJsonPurchaseStorage(directory);
    const restartedStoreService = createStoreService({
        playerService,
        catalog: TEST_PACKAGES,
        purchaseStorage: restartedStorage,
        fetchImpl,
    });
    const recaptured = await restartedStoreService.captureOrder(player.id, 'ORDER4');
    assert.equal(recaptured.alreadyGranted, true);
    assert.equal(playerService.getById(player.id).profile.missions.unlockPoints, 750);
});
