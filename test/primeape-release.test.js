const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    applyStatus,
    buildInitialBoard,
    configureBattleRuntime,
    resetBattleRuntime,
    resolvePendingTurnSkills,
} = require('../battleLogic');
const {
    buildArenaSkinsResponse,
    getPokemonPrimeapeMissionEntry,
    getPokemonPrimeapeSkinCatalogEntry,
    isMissionActiveAt,
    setPrimeapeReleaseWindow,
} = require('../server');
const {
    EVENT_DURATION_MS,
    newsPost,
    syncPokemonPrimeapeRelease,
} = require('../sync_pokemon_primeape_release');

const root = path.resolve(__dirname, '..');
const primeape = characters.find((character) => character?.id === 'primeape');
const primeapeIndex = characters.indexOf(primeape);
const charmanderIndex = characters.findIndex((character) => character?.id === 'charmander');

const makeMatch = (opponentIndex = charmanderIndex, roster = characters) => {
    const players = [
        { username: 'ash', team: [primeapeIndex] },
        { username: 'gary', team: [opponentIndex] },
    ];
    return {
        players,
        board: buildInitialBoard(players, roster),
        chakraPools: {
            ash: { taijutsu: 20, ninjutsu: 20, genjutsu: 20, bloodline: 20 },
            gary: { taijutsu: 20, ninjutsu: 20, genjutsu: 20, bloodline: 20 },
        },
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { ash: 1, gary: 1 } },
    };
};

const useSkill = ({ match, username = 'ash', skillIndex, targetUsername = 'gary', roster = characters }) => {
    match.pendingTurns[username] = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            0: {
                skillIndex,
                targetSelection: [{ username: targetUsername, slot: 0 }],
            },
        },
    };
    resolvePendingTurnSkills({ match, actingUsername: username, characters: roster });
};

test('the Annihilape mission lasts exactly seven days, then its skin costs 750 points', () => {
    const startsAt = new Date('2026-08-08T00:00:00.000Z');
    const endsAt = new Date(startsAt.getTime() + EVENT_DURATION_MS);
    setPrimeapeReleaseWindow({ startsAt, endsAt });
    const mission = getPokemonPrimeapeMissionEntry();
    assert.equal(new Date(mission.ends_at) - new Date(mission.starts_at), EVENT_DURATION_MS);
    assert.deepEqual(mission.goals, [{
        type: 'win_matches',
        character_id: 'primeape',
        character_name: 'Primeape',
        wins: 20,
    }]);
    assert.equal(isMissionActiveAt(mission, startsAt), true);
    assert.equal(isMissionActiveAt(mission, new Date(endsAt.getTime() - 1)), true);
    assert.equal(isMissionActiveAt(mission, endsAt), false);
    assert.equal(getPokemonPrimeapeSkinCatalogEntry().unlockPointCost, 750);

    const now = Date.now();
    setPrimeapeReleaseWindow({ startsAt: new Date(now - 1000), endsAt: new Date(now + 60_000) });
    let skin = buildArenaSkinsResponse({ arena: 'pokemon', profile: {} }).skins.find(
        (entry) => entry.skinId === 'primeape-annihilape-evolution'
    );
    assert.equal(skin.purchaseAvailable, false);
    setPrimeapeReleaseWindow({ startsAt: new Date(now - 120_000), endsAt: new Date(now - 60_000) });
    skin = buildArenaSkinsResponse({ arena: 'pokemon', profile: {} }).skins.find(
        (entry) => entry.skinId === 'primeape-annihilape-evolution'
    );
    assert.equal(skin.purchaseAvailable, true);
    assert.equal(skin.unlockPointCost, 750);
});

test('release synchronization preserves the original event window across restarts', async () => {
    const documents = new Map();
    const keyFor = (name, filter) => {
        if (filter?.key) return `${name}:key:${filter.key}`;
        const releaseFilter = filter?.$or?.find((entry) => entry.releaseVersion || entry.title) || {};
        return `${name}:news:${releaseFilter.releaseVersion || releaseFilter.title || filter?.title}`;
    };
    const db = {
        collection(name) {
            return {
                async findOne(filter) {
                    return documents.get(keyFor(name, filter)) || null;
                },
                async updateOne(filter, update) {
                    const key = keyFor(name, filter);
                    documents.set(key, {
                        ...(documents.get(key) || {}),
                        ...(update.$setOnInsert || {}),
                        ...(update.$set || {}),
                    });
                },
            };
        },
    };
    const firstNow = new Date('2026-08-08T12:00:00.000Z');
    const first = await syncPokemonPrimeapeRelease(db, { now: firstNow });
    const second = await syncPokemonPrimeapeRelease(db, {
        now: new Date(firstNow.getTime() + 24 * 60 * 60 * 1000),
    });
    assert.equal(first.migrated, true);
    assert.equal(second.migrated, false);
    assert.equal(first.eventWindow.startsAt.toISOString(), second.eventWindow.startsAt.toISOString());
    assert.equal(first.eventWindow.endsAt.toISOString(), second.eventWindow.endsAt.toISOString());
    assert.equal(first.eventWindow.endsAt - first.eventWindow.startsAt, EVENT_DURATION_MS);
    const announcement = newsPost.paragraphs.join(' ');
    assert.match(announcement, /sorry.*unavailable.*past week/i);
    assert.match(announcement, /win 20.*Primeape/i);
    assert.match(announcement, /750 unlock points/i);
    assert.match(announcement, /Mega Charizard X and Y.*1,350-point skin/i);
    assert.match(announcement, /every player account.*250 Pokemon Arena unlock points/i);
    assert.ok(newsPost.changes.some((change) =>
        change.groupKey === 'pokemon-compensation:service-apology-2026-08-10'
    ));
});
