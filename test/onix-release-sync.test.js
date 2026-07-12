const assert = require('node:assert/strict');
const test = require('node:test');

const { syncPokemonOnixRelease } = require('../sync_pokemon_onix_news');
const characters = require('../characters');

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

    assert.deepEqual(await syncPokemonOnixRelease(db), { migrated: true, newsSynced: true });
    assert.deepEqual(await syncPokemonOnixRelease(db), { migrated: false, newsSynced: true });

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

test('Onix Iron Tail grants 3 reduction plus a 2-point Rock Throw bonus', () => {
    const onix = characters.find((character) => character.characterId === 'onix');
    const ironTail = onix.skills.find((skill) => skill.id === 'onix-iron-tail');
    const reductionEffects = ironTail.effects.filter(
        (effect) => effect.statusId === 'onix_iron_tail_reduction'
    );

    assert.equal(reductionEffects[0].metadata.stackDelta, 3);
    assert.equal(reductionEffects[1].metadata.stackDelta, 2);
    assert.equal(
        reductionEffects.reduce((total, effect) => total + effect.metadata.stackDelta, 0),
        5
    );
    assert.equal(ironTail.effects.find((effect) => effect.type === 'damage').amount, 25);
});
