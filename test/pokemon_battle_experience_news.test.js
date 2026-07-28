const assert = require('node:assert/strict');
const test = require('node:test');

const { newsPost, syncPokemonBattleExperienceNews } = require('../sync_pokemon_battle_experience_news');

test('battle experience news covers the complete release', () => {
    const text = newsPost.paragraphs.join(' ');
    [
        'Evolution and Rare Candy',
        'Pokémon Trainer',
        'Battle music',
        'Chakra updates',
        '2 energy of the same color',
        'Shell Guard',
        'Teleport',
        'Leech Seed',
        'Poison Sting',
        'next 2 enemy damage effects',
        'Ultra Ball 25%',
        'Pidgey now evolves',
        'Fury Cutter gains 2 stacks',
        'Thunder Punch splashes',
        'Machop and Machoke have been reworked',
    ].forEach((phrase) => assert.match(text, new RegExp(phrase)));
});

test('battle experience news sync is idempotent', async () => {
    const calls = [];
    const db = {
        collection(name) {
            assert.equal(name, 'news_posts');
            return {
                async updateOne(filter, update, options) {
                    calls.push({ filter, update, options });
                },
            };
        },
    };
    await syncPokemonBattleExperienceNews(db);
    await syncPokemonBattleExperienceNews(db);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].filter, calls[1].filter);
    assert.equal(calls[0].options.upsert, true);
});
