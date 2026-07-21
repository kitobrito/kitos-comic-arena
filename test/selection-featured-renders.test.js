const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('every current Pokemon has an optimized featured selection render', () => {
    const characters = require(path.join(root, 'characters.js'));
    const pokemonIds = characters
        .filter(
            (character) =>
                character.arena === 'pokemon' ||
                String(character.universe || '').trim().toLowerCase() === 'pokemon'
        )
        .map((character) => String(character.characterId || character.id || '').trim().toLowerCase())
        .sort();

    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const mapBody = selectionSource.match(
        /POKEMON_SELECTION_FEATURED_RENDER_BY_ID = Object\.freeze\(\{([\s\S]*?)\}\);/
    )?.[1];
    assert.ok(mapBody, 'featured-render map should exist in the selection client');

    const entries = Array.from(
        mapBody.matchAll(/^\s*(?:'([^']+)'|([\w-]+)):\s*'([^']+)'/gm),
        (match) => [match[1] || match[2], match[3]]
    );
    const renderIds = entries.map(([characterId]) => characterId).sort();

    assert.deepEqual(renderIds, pokemonIds);
    entries.forEach(([characterId, filename]) => {
        const renderPath = path.join(
            root,
            'assets',
            'images',
            'selection-featured',
            'PokemonArena',
            'BIB',
            filename
        );
        assert.ok(fs.existsSync(renderPath), `${characterId} featured render should exist: ${filename}`);
    });
});

test('every supplied Pokemon evolution render is mapped and optimized', () => {
    const expectedEvolutionIds = [
        'abra', 'beedrill', 'bulbasaur', 'chansey', 'charmander', 'clefairy',
        'ekans', 'gastly', 'jigglypuff', 'koffing', 'krabby', 'machop',
        'magikarp', 'magnemite', 'meowth', 'pidgey', 'squirtle', 'zubat',
    ].sort();
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const mapBody = selectionSource.match(
        /POKEMON_SELECTION_EVOLUTION_RENDER_BY_ID = Object\.freeze\(\{([\s\S]*?)\}\);/
    )?.[1];
    assert.ok(mapBody, 'evolution-render map should exist in the selection client');

    const entries = Array.from(
        mapBody.matchAll(/^\s*(?:'([^']+)'|([\w-]+)):\s*\{\s*name:\s*'([^']+)',\s*filename:\s*'([^']+)'/gm),
        (match) => [match[1] || match[2], match[3], match[4]]
    );
    assert.deepEqual(entries.map(([characterId]) => characterId).sort(), expectedEvolutionIds);
    entries.forEach(([characterId, evolutionName, filename]) => {
        assert.ok(evolutionName, `${characterId} should have an evolution name`);
        const renderPath = path.join(
            root, 'assets', 'images', 'selection-featured', 'PokemonArena', 'BIB', filename
        );
        assert.ok(fs.existsSync(renderPath), `${characterId} evolution render should exist: ${filename}`);
    });
});

test('evolution and Mega renders can be toggled and skills select the matching form', () => {
    const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

    assert.match(selectionHtml, /id="character-evolution-shadow"/);
    assert.match(selectionHtml, /data-character-form="base"/);
    assert.match(selectionHtml, /data-character-form="evolution"/);
    assert.match(selectionHtml, /data-character-form="mega-x"/);
    assert.match(selectionHtml, /data-character-form="mega-y"/);
    assert.match(
        selectionSource,
        /renderSelectionCharacterForm\(\s*character,\s*getSelectionSkillRenderForm\(character, skill\)/
    );
    assert.match(selectionSource, /skillId\.includes\('charizard-x-'\)/);
    assert.match(selectionSource, /skillId\.includes\('charizard-y-'\)/);
    assert.match(
        selectionSource,
        /renderSelectionCharacterForm\(character, button\.dataset\.characterForm \|\| 'base'\);/
    );
});

test('every supplied equipped-skin showcase render is mapped and optimized', () => {
    const expectedFilenames = [
        'bayleaf.png.webp',
        'blsmuthonix.png.webp',
        'charizard.png.webp',
        'cosmiconix.png.webp',
        'croconaw.webp.webp',
        'crystalonix.png.webp',
        'ferliagatr.png.webp',
        'goldmagikarp.png.webp',
        'goldonix.png.webp',
        'magmaonix.jpg.webp',
        'megacharizardx.png.webp',
        'megacharizardy.png.webp',
        'meganium.png.webp',
        'pinkbutterfree.png.webp',
        'quilava.png.webp',
        'raichu.png.webp',
        'redgyarados.png.webp',
        'typhlosion.png.webp',
    ].sort();
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const mapBody = selectionSource.match(
        /POKEMON_SELECTION_SKIN_RENDER_FORMS_BY_ID = Object\.freeze\(\{([\s\S]*?)\}\);/
    )?.[1];
    assert.ok(mapBody, 'equipped-skin render-form map should exist in the selection client');

    const filenames = Array.from(mapBody.matchAll(/filename:\s*'([^']+)'/g), (match) => match[1]).sort();
    assert.deepEqual(filenames, expectedFilenames);
    filenames.forEach((filename) => {
        const renderPath = path.join(
            root, 'assets', 'images', 'selection-featured', 'PokemonArena', 'BIB', filename
        );
        assert.ok(fs.existsSync(renderPath), `skin showcase render should exist: ${filename}`);
    });
});
