const assert = require('node:assert/strict');
const test = require('node:test');

const {
    newsPost,
    syncPokemonMeowthRelease,
    upcomingCharacters,
} = require('../sync_pokemon_meowth_release');

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

test('Meowth release sync preserves Comic releases and publishes the Pokemon preview once', async () => {
    const db = makeDb();
    db.documents.set('app_state:latest_character_releases', {
        key: 'latest_character_releases',
        releasesByArena: {
            comic: [
                { characterId: 'grand-master-yoda' },
                { characterId: 'darth-sidious' },
                { characterId: 'general-grievous' },
            ],
            pokemon: [{ characterId: 'onix' }],
        },
    });

    assert.deepEqual(await syncPokemonMeowthRelease(db), { migrated: true, newsSynced: true });
    assert.deepEqual(await syncPokemonMeowthRelease(db), { migrated: false, newsSynced: true });

    const latest = db.documents.get('app_state:latest_character_releases');
    assert.deepEqual(latest.releasesByArena.comic.map((entry) => entry.characterId), [
        'grand-master-yoda',
        'darth-sidious',
        'general-grievous',
    ]);
    assert.deepEqual(latest.releasesByArena.pokemon.map((entry) => entry.characterId), [
        'meowth',
        'onix',
        'aerodactyl',
    ]);
    assert.equal(upcomingCharacters.length, 12);
    assert.equal(newsPost.arena, 'pokemon');
    assert.equal(db.documents.get(`news_posts:${newsPost.title}`).title, newsPost.title);
    assert.equal(
        db.documents.get('app_state:release_migration:pokemon-meowth-and-wave-2-preview').completed,
        true
    );
});
