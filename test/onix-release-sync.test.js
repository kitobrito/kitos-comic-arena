const assert = require('node:assert/strict');
const test = require('node:test');

const { syncPokemonOnixRelease } = require('../sync_pokemon_onix_news');

const makeDb = () => {
    const documents = new Map();
    const collections = new Map();
    return {
        collection(name) {
            if (!collections.has(name)) {
                collections.set(name, {
                    async findOne(filter) {
                        return documents.get(`${name}:${filter.key || filter.title}`) || null;
                    },
                    async updateOne(filter, update) {
                        const identity = filter.key || filter.title;
                        const storageKey = `${name}:${identity}`;
                        const current = documents.get(storageKey) || {};
                        documents.set(storageKey, {
                            ...current,
                            ...(update.$setOnInsert || {}),
                            ...(update.$set || {}),
                            ...filter,
                        });
                    },
                });
            }
            return collections.get(name);
        },
        documents,
    };
};

test('Onix release sync migrates MongoDB once and preserves existing missions', async () => {
    const db = makeDb();
    db.documents.set('app_state:missions', {
        key: 'missions',
        missions: [{ missionId: 'existing-mission', sortOrder: 1 }],
    });

    assert.deepEqual(await syncPokemonOnixRelease(db), { migrated: true });
    assert.deepEqual(await syncPokemonOnixRelease(db), { migrated: false });

    const missionState = db.documents.get('app_state:missions');
    assert.ok(missionState.missions.some((mission) => mission.missionId === 'existing-mission'));
    assert.ok(missionState.missions.some((mission) => mission.missionId === 'onix-stonewall-trial'));

    const latest = db.documents.get('app_state:latest_character_releases');
    assert.deepEqual(
        latest.pokemonReleases.map((entry) => entry.characterId),
        ['onix', 'aerodactyl', 'magnemite']
    );
    assert.equal(db.documents.get('news_posts:Pokemon Arena Update V.3.3.1').title,
        'Pokemon Arena Update V.3.3.1');
    assert.equal(db.documents.get('app_state:release_migration:pokemon-v3-3-1-onix').completed, true);
});
