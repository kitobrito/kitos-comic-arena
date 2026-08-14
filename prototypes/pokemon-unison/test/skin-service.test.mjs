import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlayerService } from '../reference/player-service.mjs';
import { createSkinService, SkinServiceError } from '../reference/skin-service.mjs';

const TEST_CATALOG = [
    { skinId: 'ditto-shiny', characterId: 'ditto', unlockPointCost: 500 },
    { skinId: 'pikachu-raichu', characterId: 'pikachu', unlockPointCost: 750 },
    { skinId: 'reward-only', characterId: 'ditto', missionRewardOnly: true, unlockPointCost: 999 },
];

async function registerPlayerWithPoints(playerService, username, unlockPoints) {
    const { player } = await playerService.register({ username, email: '', password: 'longenough1' });
    playerService.updateProfile(player.id, (profile) => ({
        ...profile,
        missions: { ...profile.missions, unlockPoints },
    }));
    return player;
}

test('unlocking a skin spends exactly its cost and adds it to unlockedSkinIds', async () => {
    const playerService = createPlayerService();
    const skinService = createSkinService({ playerService, catalog: TEST_CATALOG });
    const player = await registerPlayerWithPoints(playerService, 'Buyer', 500);

    const updated = skinService.unlock(player.id, 'ditto-shiny');
    assert.deepEqual(updated.profile.skins.unlockedSkinIds, ['ditto-shiny']);
    assert.equal(updated.profile.missions.unlockPoints, 0);
});

test('unlocking rejects insufficient points, an unknown skin, and a duplicate unlock', async () => {
    const playerService = createPlayerService();
    const skinService = createSkinService({ playerService, catalog: TEST_CATALOG });
    const player = await registerPlayerWithPoints(playerService, 'Broke', 100);

    assert.throws(
        () => skinService.unlock(player.id, 'pikachu-raichu'),
        (error) => error instanceof SkinServiceError && error.code === 'insufficient_points'
    );
    assert.throws(
        () => skinService.unlock(player.id, 'not-a-real-skin'),
        (error) => error instanceof SkinServiceError && error.code === 'skin_not_found'
    );

    const rich = await registerPlayerWithPoints(playerService, 'Rich', 5000);
    skinService.unlock(rich.id, 'ditto-shiny');
    assert.throws(
        () => skinService.unlock(rich.id, 'ditto-shiny'),
        (error) => error instanceof SkinServiceError && error.code === 'already_unlocked'
    );
});

test('a mission-reward-only skin cannot be purchased directly', async () => {
    const playerService = createPlayerService();
    const skinService = createSkinService({ playerService, catalog: TEST_CATALOG });
    const player = await registerPlayerWithPoints(playerService, 'Rich2', 5000);

    assert.throws(
        () => skinService.unlock(player.id, 'reward-only'),
        (error) => error instanceof SkinServiceError && error.code === 'mission_reward_only'
    );
});

test('equipping requires the skin to be unlocked and to belong to the requested character', async () => {
    const playerService = createPlayerService();
    const skinService = createSkinService({ playerService, catalog: TEST_CATALOG });
    const player = await registerPlayerWithPoints(playerService, 'Equipper', 5000);

    assert.throws(
        () => skinService.equip(player.id, 'ditto', 'ditto-shiny'),
        (error) => error instanceof SkinServiceError && error.code === 'not_unlocked'
    );

    skinService.unlock(player.id, 'ditto-shiny');
    assert.throws(
        () => skinService.equip(player.id, 'pikachu', 'ditto-shiny'),
        (error) => error instanceof SkinServiceError && error.code === 'wrong_character'
    );

    const equipped = skinService.equip(player.id, 'ditto', 'ditto-shiny');
    assert.deepEqual(equipped.profile.skins.equippedSkinByCharacterId, { ditto: 'ditto-shiny' });

    const unequipped = skinService.equip(player.id, 'ditto', '');
    assert.deepEqual(unequipped.profile.skins.equippedSkinByCharacterId, {});
});

test('a reward-only skin can be equipped once granted, even though it cannot be purchased', async () => {
    const playerService = createPlayerService();
    const skinService = createSkinService({ playerService, catalog: TEST_CATALOG });
    const player = await registerPlayerWithPoints(playerService, 'Granted', 0);

    playerService.updateProfile(player.id, (profile) => ({
        ...profile,
        skins: { ...profile.skins, unlockedSkinIds: [...profile.skins.unlockedSkinIds, 'reward-only'] },
    }));

    const equipped = skinService.equip(player.id, 'ditto', 'reward-only');
    assert.deepEqual(equipped.profile.skins.equippedSkinByCharacterId, { ditto: 'reward-only' });
});
