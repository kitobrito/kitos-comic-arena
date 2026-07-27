const assert = require('node:assert/strict');
const test = require('node:test');

const { buildLatestReleasesPersistenceFields } = require('../server');

test('latest release saves mirror Comic and Pokemon selections into every persisted shape', () => {
    const fields = buildLatestReleasesPersistenceFields(
        {
            comic: [
                { characterId: 'grand-master-yoda' },
                { characterId: 'darth-sidious' },
                { characterId: 'general-grievous' },
            ],
            pokemon: [
                { characterId: 'aegislash' },
                { characterId: 'ditto' },
                { characterId: 'scraggy' },
            ],
        },
        'kito'
    );

    assert.deepEqual(fields.releasesByArena.pokemon, [
        { characterId: 'aegislash' },
        { characterId: 'ditto' },
        { characterId: 'scraggy' },
    ]);
    assert.deepEqual(fields.value.releasesByArena, fields.releasesByArena);
    assert.deepEqual(fields.value.pokemonReleases, fields.pokemonReleases);
    assert.deepEqual(fields.value.comicReleases, fields.comicReleases);
    assert.equal(fields.updatedBy, 'kito');
});
