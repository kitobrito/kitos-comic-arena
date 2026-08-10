const assert = require('node:assert/strict');
const test = require('node:test');

const {
    COMPENSATION_AMOUNT,
    COMPENSATION_MARKER_PATH,
    COMPENSATION_STATE_KEY,
    syncPokemonCompensationGrant,
} = require('../sync_pokemon_compensation_grant');

const getPath = (source, path) => path.split('.').reduce((value, key) => value?.[key], source);
const setPath = (target, path, value) => {
    const keys = path.split('.');
    const finalKey = keys.pop();
    const parent = keys.reduce((value, key) => {
        value[key] = value[key] && typeof value[key] === 'object' ? value[key] : {};
        return value[key];
    }, target);
    parent[finalKey] = value;
};

const makeDb = () => {
    const users = [
        {
            username: 'Ash',
            profile: { arenas: { pokemon: { missions: { unlockPoints: 100 }, ladder: { unlockPoints: 100 } } } },
        },
        {
            username: 'Misty',
            profile: { arenas: { pokemon: { missions: { unlockPoints: 25 }, ladder: { unlockPoints: 20 } } } },
        },
    ];
    const appState = new Map();
    const collections = {
        users: {
            async updateMany(filter, pipeline) {
                let matchedCount = 0;
                let modifiedCount = 0;
                users.forEach((user) => {
                    if (getPath(user, COMPENSATION_MARKER_PATH) !== undefined) return;
                    matchedCount += 1;
                    const current = Math.max(
                        Number(getPath(user, 'profile.arenas.pokemon.missions.unlockPoints')) || 0,
                        Number(getPath(user, 'profile.arenas.pokemon.ladder.unlockPoints')) || 0
                    );
                    const update = pipeline[0].$set;
                    setPath(user, 'profile.arenas.pokemon.missions.unlockPoints', current + COMPENSATION_AMOUNT);
                    setPath(user, 'profile.arenas.pokemon.ladder.unlockPoints', current + COMPENSATION_AMOUNT);
                    setPath(user, COMPENSATION_MARKER_PATH, update[COMPENSATION_MARKER_PATH]);
                    modifiedCount += 1;
                });
                return { matchedCount, modifiedCount };
            },
        },
        app_state: {
            async findOne(filter) {
                return appState.get(filter.key) || null;
            },
            async updateOne(filter, update) {
                appState.set(filter.key, {
                    ...(appState.get(filter.key) || {}),
                    ...(update.$setOnInsert || {}),
                    ...(update.$set || {}),
                });
                return { matchedCount: 1, modifiedCount: 1 };
            },
        },
    };
    return { users, appState, collection: (name) => collections[name] };
};

test('the apology grant adds exactly 250 points to both mirrors once', async () => {
    const db = makeDb();
    const now = new Date('2026-08-10T12:00:00.000Z');
    const first = await syncPokemonCompensationGrant(db, { now });
    assert.deepEqual(first, {
        migrated: true,
        matchedCount: 2,
        modifiedCount: 2,
    });
    assert.deepEqual(
        db.users.map((user) => [
            getPath(user, 'profile.arenas.pokemon.missions.unlockPoints'),
            getPath(user, 'profile.arenas.pokemon.ladder.unlockPoints'),
        ]),
        [[350, 350], [275, 275]]
    );
    db.users.forEach((user) => {
        assert.equal(getPath(user, `${COMPENSATION_MARKER_PATH}.amount`), 250);
    });
    assert.equal(db.appState.get(COMPENSATION_STATE_KEY).grantedAccountCount, 2);
    const second = await syncPokemonCompensationGrant(db, { now: new Date(now.getTime() + 60_000) });
    assert.deepEqual(second, {
        migrated: false,
        matchedCount: 0,
        modifiedCount: 0,
    });
    assert.deepEqual(
        db.users.map((user) => getPath(user, 'profile.arenas.pokemon.missions.unlockPoints')),
        [350, 275]
    );
});

test('the compensation pipeline keeps both point mirrors synchronized', () => {
    const pipeline = require('../sync_pokemon_compensation_grant').buildCompensationUpdatePipeline(
        new Date('2026-08-10T12:00:00.000Z')
    );
    const set = pipeline[0].$set;
    assert.deepEqual(
        set['profile.arenas.pokemon.missions.unlockPoints'],
        set['profile.arenas.pokemon.ladder.unlockPoints']
    );
    assert.equal(set[COMPENSATION_MARKER_PATH].amount, 250);
});
