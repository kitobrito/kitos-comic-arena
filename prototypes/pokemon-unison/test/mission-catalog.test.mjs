import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ALWAYS_UNLOCKED_CHARACTER_IDS,
    createDefaultMissionState,
    evaluateMissionsForPlayer,
    MISSION_CATALOG,
    normalizeCharacterId,
    validateTeamOwnership,
} from '../reference/mission-catalog.mjs';
import { ROSTER } from '../reference/roster.mjs';

function evaluate(overrides) {
    return evaluateMissionsForPlayer({
        catalog: [],
        missionsState: createDefaultMissionState(),
        didWin: false,
        teamSpeciesIds: ['charmander', 'squirtle', 'bulbasaur'],
        ...overrides,
    });
}

test('a win_matches goal completes after enough wins and grants the reward character plus unlock points', () => {
    const mission = {
        missionId: 'catch-onix',
        reward_character: 'onix',
        reward_unlock_points: 200,
        goals: [{ type: 'win_matches', character_id: 'charmander', wins: 2 }],
    };

    let { missionsState } = evaluate({ catalog: [mission], didWin: true });
    assert.equal(missionsState.progressByMissionId['catch-onix'].completedAt, null);
    assert.equal(missionsState.progressByMissionId['catch-onix'].goalProgressByIndex[0].count, 1);

    ({ missionsState } = evaluate({ catalog: [mission], missionsState, didWin: true }));
    assert.ok(missionsState.progressByMissionId['catch-onix'].completedAt);
    assert.deepEqual(missionsState.unlockedCharacterIds, ['onix']);
    assert.equal(missionsState.unlockPoints, 200);
});

test('a win_matches goal requiring a specific character does not progress without that character on the team', () => {
    const mission = {
        missionId: 'needs-pikachu',
        reward_character: 'jolteon',
        goals: [{ type: 'win_matches', character_id: 'pikachu', wins: 1 }],
    };
    const { missionsState } = evaluate({
        catalog: [mission],
        didWin: true,
        teamSpeciesIds: ['charmander', 'squirtle', 'bulbasaur'],
    });
    assert.equal(missionsState.progressByMissionId['needs-pikachu']?.completedAt ?? null, null);
    assert.deepEqual(missionsState.unlockedCharacterIds, []);
});

test('a win_streak goal resets to zero on a loss and requires consecutive wins', () => {
    const mission = {
        missionId: 'streak-mission',
        reward_character: 'articuno',
        goals: [{ type: 'win_streak', wins: 2 }],
    };
    let { missionsState } = evaluate({ catalog: [mission], didWin: true });
    assert.equal(missionsState.progressByMissionId['streak-mission'].goalProgressByIndex[0].count, 1);

    ({ missionsState } = evaluate({ catalog: [mission], missionsState, didWin: false }));
    assert.equal(missionsState.progressByMissionId['streak-mission'].goalProgressByIndex[0].count, 0);

    ({ missionsState } = evaluate({ catalog: [mission], missionsState, didWin: true }));
    ({ missionsState } = evaluate({ catalog: [mission], missionsState, didWin: true }));
    assert.ok(missionsState.progressByMissionId['streak-mission'].completedAt);
    assert.deepEqual(missionsState.unlockedCharacterIds, ['articuno']);
});

test('a win_matches_same_team goal requires every listed character on the team simultaneously', () => {
    const mission = {
        missionId: 'starter-trio',
        reward_character: 'butterfree',
        goals: [
            {
                type: 'win_matches_same_team',
                character_ids: ['charmander', 'squirtle', 'bulbasaur'],
                wins: 1,
            },
        ],
    };
    const missingOne = evaluate({
        catalog: [mission],
        didWin: true,
        teamSpeciesIds: ['charmander', 'squirtle', 'pikachu'],
    }).missionsState;
    assert.equal(missingOne.progressByMissionId['starter-trio']?.completedAt ?? null, null);

    const complete = evaluate({ catalog: [mission], didWin: true }).missionsState;
    assert.ok(complete.progressByMissionId['starter-trio'].completedAt);
});

test('a mission with a prerequisite does not progress until the prerequisite mission is completed', () => {
    const first = { missionId: 'chapter-1', reward_character: 'ekans', goals: [{ type: 'win_matches', wins: 1 }] };
    const second = {
        missionId: 'chapter-2',
        reward_character: 'machop',
        prerequisite_mission_id: 'chapter-1',
        goals: [{ type: 'win_matches', wins: 1 }],
    };
    const catalog = [first, second];

    let { missionsState } = evaluate({ catalog, didWin: true });
    assert.ok(missionsState.progressByMissionId['chapter-1'].completedAt);
    assert.equal(missionsState.progressByMissionId['chapter-2']?.completedAt ?? null, null);

    ({ missionsState } = evaluate({ catalog, missionsState, didWin: true }));
    assert.ok(missionsState.progressByMissionId['chapter-2'].completedAt);
});

test('a mission whose reward character is already unlocked backfills as completed without double-rewarding points', () => {
    const mission = {
        missionId: 'already-have-it',
        reward_character: 'mew',
        reward_unlock_points: 500,
        goals: [{ type: 'win_matches', wins: 1 }],
    };
    const missionsState = createDefaultMissionState();
    missionsState.unlockedCharacterIds = ['mew'];

    const result = evaluate({ catalog: [mission], missionsState, didWin: false });
    assert.ok(result.missionsState.progressByMissionId['already-have-it'].completedAt);
    assert.equal(result.missionsState.unlockPoints, 0);
});

test('a mission with only text goals never auto-completes (matches production: no trackable goals)', () => {
    const mission = {
        missionId: 'lore-only',
        reward_character: 'gastly',
        goals: [{ type: 'text', text: 'Read the lore.' }],
    };
    const { missionsState } = evaluate({ catalog: [mission], didWin: true });
    assert.equal(missionsState.progressByMissionId['lore-only']?.completedAt ?? null, null);
    assert.deepEqual(missionsState.unlockedCharacterIds, []);
});

test('completing a mission with a reward_skin_id reports it as newly unlocked', () => {
    const mission = {
        missionId: 'skin-mission',
        reward_character: 'ditto',
        reward_skin_id: 'ditto-shiny',
        goals: [{ type: 'win_matches', wins: 1 }],
    };
    const { newlyUnlockedSkinIds } = evaluate({ catalog: [mission], didWin: true });
    assert.deepEqual(newlyUnlockedSkinIds, ['ditto-shiny']);
});

test('an already-completed mission is left untouched on later evaluations', () => {
    const mission = {
        missionId: 'one-shot',
        reward_character: 'abra',
        reward_unlock_points: 50,
        goals: [{ type: 'win_matches', wins: 1 }],
    };
    let { missionsState } = evaluate({ catalog: [mission], didWin: true });
    assert.equal(missionsState.unlockPoints, 50);

    ({ missionsState } = evaluate({ catalog: [mission], missionsState, didWin: true }));
    assert.equal(missionsState.unlockPoints, 50);
});

test('every character id referenced by a real MISSION_CATALOG entry exists in ROSTER', () => {
    const referencedIds = new Set();
    MISSION_CATALOG.forEach((mission) => {
        if (mission.reward_character) referencedIds.add(mission.reward_character);
        (mission.goals ?? []).forEach((goal) => {
            if (goal.character_id) referencedIds.add(goal.character_id);
            (goal.character_ids ?? []).forEach((characterId) => referencedIds.add(characterId));
        });
    });
    const unknownIds = [...referencedIds].filter((characterId) => !ROSTER[characterId]);
    assert.deepEqual(unknownIds, []);
});

test('MISSION_CATALOG has no duplicate missionIds and every mission has at least one goal', () => {
    const missionIds = MISSION_CATALOG.map((mission) => mission.missionId);
    assert.deepEqual(missionIds, [...new Set(missionIds)]);
    MISSION_CATALOG.forEach((mission) => {
        assert.ok(mission.goals?.length > 0, `${mission.missionId} has no goals`);
    });
});

test('the real MISSION_CATALOG completes a representative single-goal and same-team mission', () => {
    const missionsState = createDefaultMissionState();
    let state = missionsState;
    for (let i = 0; i < 4; i += 1) {
        ({ missionsState: state } = evaluateMissionsForPlayer({
            catalog: MISSION_CATALOG,
            missionsState: state,
            didWin: true,
            teamSpeciesIds: ['zubat', 'gastly', 'pidgey'],
        }));
    }
    // scyther-trial needs 4 wins each with chansey/pidgey/koffing plus a 3-win
    // zubat+gastly streak; only the streak and pidgey legs progress with this team,
    // so it should not yet be complete, but its tracked progress should be non-zero.
    assert.equal(state.progressByMissionId['scyther-trial']?.completedAt ?? null, null);
    assert.equal(state.progressByMissionId['scyther-trial'].goalProgressByIndex[3].count, 3);
    assert.ok(state.progressByMissionId['scyther-trial'].goalProgressByIndex[3].completedAt);

    let dragoniteState = createDefaultMissionState();
    for (let i = 0; i < 8; i += 1) {
        ({ missionsState: dragoniteState } = evaluateMissionsForPlayer({
            catalog: MISSION_CATALOG,
            missionsState: dragoniteState,
            didWin: true,
            teamSpeciesIds: ['aerodactyl', 'magikarp', 'pidgey'],
        }));
    }
    assert.ok(dragoniteState.progressByMissionId['pokemon-wave-2-dragonite'].completedAt);
    assert.ok(dragoniteState.unlockedCharacterIds.includes('dragonite'));
});

test('ALWAYS_UNLOCKED_CHARACTER_IDS plus MISSION_CATALOG reward characters cover the full 46-character roster', () => {
    const missionGranted = new Set(
        MISSION_CATALOG.map((mission) => normalizeCharacterId(mission.reward_character)).filter(Boolean)
    );
    const covered = new Set([...ALWAYS_UNLOCKED_CHARACTER_IDS, ...missionGranted]);
    const uncovered = Object.keys(ROSTER).filter((characterId) => !covered.has(characterId));
    assert.deepEqual(uncovered, []);
});

test('ALWAYS_UNLOCKED_CHARACTER_IDS has no duplicates and every entry is a real ROSTER id', () => {
    assert.deepEqual(ALWAYS_UNLOCKED_CHARACTER_IDS, [...new Set(ALWAYS_UNLOCKED_CHARACTER_IDS)]);
    ALWAYS_UNLOCKED_CHARACTER_IDS.forEach((characterId) => {
        assert.ok(ROSTER[characterId], `${characterId} is not a real ROSTER id`);
    });
});

test('validateTeamOwnership allows an always-free team with no unlocks at all', () => {
    assert.equal(validateTeamOwnership(['charmander', 'squirtle', 'bulbasaur'], []), null);
});

test('validateTeamOwnership rejects a mission-gated character the player has not unlocked', () => {
    const error = validateTeamOwnership(['charmander', 'dragapult', 'squirtle'], []);
    assert.match(error, /dragapult is locked/);
});

test('validateTeamOwnership allows a gated character once it is in the player\'s unlockedCharacterIds', () => {
    assert.equal(validateTeamOwnership(['charmander', 'dragapult', 'squirtle'], ['dragapult']), null);
});
