const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildLatestReleasesState,
    newsPost,
    starterIds,
    syncPokemonGen2StarterRelease,
} = require('../sync_pokemon_gen2_starter_release');

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
                        documents.set(storageKey, {
                            ...(documents.get(storageKey) || {}),
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

test('Gen 2 launch news presents starters, music, evolutions, and community characters', () => {
    const text = newsPost.paragraphs.join(' ');
    starterIds.forEach((starterId) => assert.match(text.toLowerCase(), new RegExp(starterId)));
    assert.match(text, /Generation 2 and beyond/i);
    assert.match(text, /music.*upgraded|upgraded.*music/i);
    assert.match(text, /16 ranked matches/i);
    assert.match(text, /36 additional ranked matches/i);
    assert.match(text, /community characters/i);
    assert.match(text, /first community character.*Discord.*put into the game/i);
    assert.equal(newsPost.changes.length, 15);
});

test('Gen 2 release sync preserves Comic releases and promotes all three starters', async () => {
    const db = makeDb();
    db.documents.set('app_state:latest_character_releases', {
        key: 'latest_character_releases',
        releasesByArena: {
            comic: [{ characterId: 'grand-master-yoda' }],
            pokemon: [{ characterId: 'dragonite' }],
        },
    });

    assert.deepEqual(await syncPokemonGen2StarterRelease(db), { migrated: true, newsSynced: true });
    assert.deepEqual(await syncPokemonGen2StarterRelease(db), { migrated: false, newsSynced: true });
    const latest = db.documents.get('app_state:latest_character_releases');
    assert.deepEqual(latest.releasesByArena.comic, [{ characterId: 'grand-master-yoda' }]);
    assert.deepEqual(latest.releasesByArena.pokemon.map((entry) => entry.characterId), starterIds);
    assert.equal(db.documents.get(`news_posts:${newsPost.title}`).title, newsPost.title);
});

test('latest release builder promotes starters without losing legacy Comic entries', () => {
    const state = buildLatestReleasesState({ releases: [{ characterId: 'darth-sidious' }] });
    assert.deepEqual(state.releasesByArena.comic, [{ characterId: 'darth-sidious' }]);
    assert.deepEqual(state.releasesByArena.pokemon.map((entry) => entry.characterId), starterIds);
});
