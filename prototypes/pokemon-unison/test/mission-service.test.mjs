import assert from 'node:assert/strict';
import test from 'node:test';

import { createMissionService, MissionServiceError } from '../reference/mission-service.mjs';
import { createPlayerService } from '../reference/player-service.mjs';

const TEST_CATALOG = [
    {
        missionId: 'catch-onix',
        reward_character: 'onix',
        reward_unlock_points: 200,
        reward_skin_id: 'onix-crystal',
        goals: [{ type: 'win_matches', character_id: 'charmander', wins: 1 }],
    },
];

async function registerPlayer(playerService, username) {
    const { player } = await playerService.register({ username, email: '', password: 'longenough1' });
    return player;
}

test('onMatchComplete updates the winning linked account and leaves the loser untouched', async () => {
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService, catalog: TEST_CATALOG });
    const winner = await registerPlayer(playerService, 'Winner');
    const loser = await registerPlayer(playerService, 'Loser');

    missionService.onMatchComplete({
        playerIds: { A: winner.id, B: loser.id },
        winner: 'A',
        teamSpeciesIds: { A: ['charmander', 'squirtle', 'bulbasaur'], B: ['zubat', 'chansey', 'pidgey'] },
    });

    const winnerProfile = playerService.getById(winner.id).profile;
    assert.ok(winnerProfile.missions.progressByMissionId['catch-onix'].completedAt);
    assert.deepEqual(winnerProfile.missions.unlockedCharacterIds, ['onix']);
    assert.equal(winnerProfile.missions.unlockPoints, 200);
    assert.deepEqual(winnerProfile.skins.unlockedSkinIds, ['onix-crystal']);

    const loserProfile = playerService.getById(loser.id).profile;
    assert.equal(loserProfile.missions.progressByMissionId['catch-onix']?.completedAt ?? null, null);
    assert.equal(loserProfile.missions.unlockPoints, 0);
});

test('onMatchComplete is a no-op for seats with no linked account', () => {
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService, catalog: TEST_CATALOG });

    assert.doesNotThrow(() => {
        missionService.onMatchComplete({
            playerIds: { A: null, B: null },
            winner: 'A',
            teamSpeciesIds: { A: ['charmander'], B: ['zubat'] },
        });
    });
});

test('catalog() returns a deep clone that cannot mutate the service’s own catalog', () => {
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService, catalog: TEST_CATALOG });
    const catalog = missionService.catalog();
    catalog[0].reward_character = 'tampered';
    assert.equal(missionService.catalog()[0].reward_character, 'onix');
});

test('chooseStarter unlocks exactly the chosen Johto starter', async () => {
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');
    assert.equal(alice.profile.missions.starterCharacterId, null);

    const updated = missionService.chooseStarter(alice.id, 'cyndaquil');
    assert.equal(updated.profile.missions.starterCharacterId, 'cyndaquil');
    assert.ok(updated.profile.missions.unlockedCharacterIds.includes('cyndaquil'));
    assert.equal(updated.profile.missions.unlockedCharacterIds.includes('chikorita'), false);
    assert.equal(updated.profile.missions.unlockedCharacterIds.includes('totodile'), false);
});

test('chooseStarter rejects anything that is not a Johto starter', async () => {
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');
    assert.throws(
        () => missionService.chooseStarter(alice.id, 'charmander'),
        (error) => error instanceof MissionServiceError && error.code === 'invalid_starter'
    );
    assert.throws(
        () => missionService.chooseStarter(alice.id, ''),
        (error) => error instanceof MissionServiceError && error.code === 'invalid_starter'
    );
});

test('chooseStarter is a one-time choice - a repeat call is a no-op, not an overwrite', async () => {
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');

    missionService.chooseStarter(alice.id, 'chikorita');
    const second = missionService.chooseStarter(alice.id, 'totodile');

    assert.equal(second.profile.missions.starterCharacterId, 'chikorita');
    assert.ok(second.profile.missions.unlockedCharacterIds.includes('chikorita'));
    assert.equal(second.profile.missions.unlockedCharacterIds.includes('totodile'), false);
});

test('chooseStarter is case-insensitive and rejects an unknown player', async () => {
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService });
    const alice = await registerPlayer(playerService, 'Alice');

    const updated = missionService.chooseStarter(alice.id, 'TOTODILE');
    assert.equal(updated.profile.missions.starterCharacterId, 'totodile');

    assert.throws(
        () => missionService.chooseStarter('not-a-real-player-id', 'cyndaquil'),
        (error) => error instanceof MissionServiceError && error.code === 'player_not_found'
    );
});
