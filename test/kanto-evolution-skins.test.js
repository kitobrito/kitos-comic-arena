const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const { buildInitialBoard } = require('../battleLogic');
const { getActivePokemonTypes } = require('../pokemonTypeSystem');
const { POKEMON_SKIN_CATALOG } = require('../server');
const { newsPost } = require('../sync_pokemon_primeape_release');

const root = path.join(__dirname, '..');
const skinIds = [
    'charmander-charizard-legendary',
    'bulbasaur-mega-venusaur',
    'bulbasaur-gigantamax-venusaur',
    'squirtle-mega-blastoise',
    'squirtle-gigantamax-blastoise',
    'charmander-gigantamax-charizard',
];

const getSkin = (skinId) => POKEMON_SKIN_CATALOG.find((entry) => entry.skinId === skinId);
const assertAsset = (assetPath) => {
    assert.equal(typeof assetPath, 'string');
    assert.ok(fs.existsSync(path.join(root, assetPath)), `asset should exist: ${assetPath}`);
};

test('Kanto evolution skins use their configured point prices', () => {
    skinIds.forEach((skinId) => {
        const skin = getSkin(skinId);
        assert.ok(skin, `skin should exist: ${skinId}`);
        const expectedCost = skinId === 'charmander-charizard-legendary' ? 1350 : 750;
        assert.equal(skin.unlockPointCost, expectedCost, skinId + ' should cost ' + expectedCost + ' points');
    });
});

test('new evolution skins begin with final-stage Pokemon art and switch art on evolution', () => {
    const expected = {
        'bulbasaur-mega-venusaur': {
            base: 'assets/images/PokemonArena/Bulbasaur/skins/venusaur/fp.png',
            statusId: 'bulbasaur_ivysaur_evolution',
            evolved: 'assets/images/PokemonArena/Bulbasaur/skins/mega/megafp.png',
        },
        'bulbasaur-gigantamax-venusaur': {
            base: 'assets/images/PokemonArena/Bulbasaur/skins/venusaur/fp.png',
            statusId: 'bulbasaur_ivysaur_evolution',
            evolved: 'assets/images/PokemonArena/Bulbasaur/skins/gigantamax/fp-2026-08.jpg',
        },
        'squirtle-mega-blastoise': {
            base: 'assets/images/PokemonArena/squirtle/skins/blastoise/fp.png',
            statusId: 'squirtle_wartortle_evolution',
            evolved: 'assets/images/PokemonArena/squirtle/skins/mega/megafp.png',
        },
        'squirtle-gigantamax-blastoise': {
            base: 'assets/images/PokemonArena/squirtle/skins/blastoise/fp.png',
            statusId: 'squirtle_wartortle_evolution',
            evolved: 'assets/images/PokemonArena/squirtle/skins/gigantamax/fp-2026-08.jpg',
        },
        'charmander-gigantamax-charizard': {
            base: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardfp.jpg',
            statusId: 'charmander_charmeleon_evolution',
            evolved: 'assets/images/PokemonArena/Charmander/skins/gigantamax/fp-2026-08.jpg',
        },
    };

    Object.entries(expected).forEach(([skinId, forms]) => {
        const skin = getSkin(skinId);
        assert.equal(skin.patch.facePicture, forms.base);
        assert.equal(skin.statusFacePictureOverridesByStatusId[forms.statusId], forms.evolved);
        assertAsset(forms.base);
        assertAsset(forms.evolved);
        Object.values(skin.skillImageOverridesBySkillId).forEach(assertAsset);
    });
});

test('Gigantamax Charizard remains Fire and Flying after either hidden evolution branch', () => {
    const charmanderIndex = characters.findIndex((character) => character.id === 'charmander');
    const players = [
        {
            username: 'Ash',
            team: [charmanderIndex],
            profile: {
                arenas: {
                    pokemon: {
                        skins: {
                            equippedSkinByCharacterId: {
                                charmander: 'charmander-gigantamax-charizard',
                            },
                        },
                    },
                },
            },
        },
        { username: 'Gary', team: [] },
    ];
    const board = buildInitialBoard(players, characters);
    const unit = board.Ash[0];
    unit.state.statuses.push({
        id: 'charmander_charizard_x_evolution_branch',
        remainingTurns: 99,
        metadata: { pokemonTypeOverride: ['Fire', 'Dragon'] },
    });
    assert.deepEqual(getActivePokemonTypes({ character: characters[charmanderIndex], unit }), [
        'Fire',
        'Flying',
    ]);
});

test('new UI maps every Kanto skin stage and all three Nincada battle forms', () => {
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    [
        'venusaur.webp',
        'megavenusaur.webp',
        'gigantamaxvenusaur.webp',
        'blastoise.png.webp',
        'megablastoise.png.webp',
        'gigantamaxblastoise.png.webp',
        'gigantamaxcharizard.png.webp',
        'nincada.png.webp',
        'ninjask.png.webp',
        'shedinja.png.webp',
    ].forEach((filename) => {
        assert.match(selectionSource, new RegExp(filename.replaceAll('.', '\\.')));
        assertAsset(`assets/images/selection-featured/PokemonArena/BIB/${filename}`);
    });
    assert.match(selectionHtml, /data-character-form="ninjask"/);
    assert.match(selectionHtml, /data-character-form="shedinja"/);
    assert.match(selectionSource, /getSelectionVisibleSkillsForForm/);
    assert.match(selectionSource, /renderSelectionSkillStrip\(character, form\)/);

    const nincada = characters.find((character) => character.id === 'nincada');
    assert.deepEqual(
        nincada.battleForms.map((form) => [form.id, form.skills.length]),
        [
            ['ninjask', 5],
            ['shedinja', 5],
        ]
    );
});

test('Primeape, Annihilape, Dragapult, and Nincada form renders contain transparency', () => {
    const filenames = [
        'primeape.jpg.webp',
        'annihilape.jpg.webp',
        'dragapult.jpg.webp',
        'nincada.png.webp',
        'ninjask.png.webp',
        'shedinja.png.webp',
    ];
    filenames.forEach((filename) => {
        const file = fs.readFileSync(
            path.join(root, 'assets', 'images', 'selection-featured', 'PokemonArena', 'BIB', filename)
        );
        const vp8lOffset = file.indexOf(Buffer.from('VP8L'));
        assert.ok(vp8lOffset >= 0, `${filename} should be a lossless WebP`);
        const alphaUsed = (file.readUInt32LE(vp8lOffset + 9) >>> 28) & 1;
        assert.equal(alphaUsed, 1, `${filename} should include an alpha channel`);
    });
});

test('Primeape news includes skin previews and the Kanto skin announcement', () => {
    assert.ok(newsPost.paragraphs.some((paragraph) => /Mega Venusaur/.test(paragraph)));
    assert.ok(newsPost.paragraphs.some((paragraph) => /750 unlock points each/.test(paragraph)));
    assert.ok(
        newsPost.changes.some(
            (change) =>
                change.skillName === 'Primeape New-UI Render' &&
                change.skillimage.includes('/primeape.jpg.webp?v=transparent-renders-v1')
        )
    );
    assert.ok(
        newsPost.changes.some(
            (change) =>
                change.skillName === 'Annihilape Evolution Render' &&
                change.skillimage.includes('/annihilape.jpg.webp?v=transparent-renders-v1')
        )
    );
    for (const name of [
        'Mega Venusaur',
        'Gigantamax Venusaur',
        'Mega Blastoise',
        'Gigantamax Blastoise',
        'Gigantamax Charizard',
    ]) {
        assert.ok(newsPost.changes.some((change) => change.characterName === name));
    }
});
