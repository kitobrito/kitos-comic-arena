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
        'abra', 'aegislash', 'beedrill', 'bulbasaur', 'chansey', 'charmander', 'chikorita', 'clefairy',
        'cyndaquil', 'drowzee', 'ekans', 'gastly', 'jigglypuff', 'koffing', 'krabby', 'machop',
        'magikarp', 'magnemite', 'meowth', 'pidgey', 'scraggy', 'squirtle', 'totodile', 'zubat',
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
    assert.match(selectionSource, /characterId === 'aegislash' \? 'Shield Stance' : 'Base'/);
    assert.match(
        selectionSource,
        /\['aegislash-slash', 'aegislash-sacred-sword'\]\.includes\(skillId\)/
    );
    assert.match(selectionSource, /label: 'Blade Stance'/);
    assert.match(selectionHtml, /aegislash-renders-v1/);
    assert.match(selectionHtml, /aegislash-shield-render-v2/);
    assert.match(selectionHtml, /ditto-renders-v1/);
    assert.match(selectionHtml, /scraggy-renders-v1/);
    assert.ok(fs.existsSync(path.join(
        root, 'assets', 'images', 'PokemonArena', 'BIB', 'aegislashpassiveactive'
    )));
    assert.match(
        selectionSource,
        /renderSelectionSkillStrip\(character, form\);/
    );
});

test('every supplied equipped-skin showcase render is mapped and optimized', () => {
    const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    const expectedFilenames = [
        'annihilape.jpg.webp',
        'bayleaf.png.webp',
        'blastoise.png.webp',
        'blastoise.png.webp',
        'blsmuthonix.png.webp',
        'charizard.png.webp',
        'charizard.png.webp',
        'cosmiconixfixed.png.webp',
        'croconaw.webp.webp',
        'crystalonix-removebg-preview.png.webp',
        'ferliagatr.png.webp',
        'flubberditto.webp',
        'goldmagikarp.png.webp',
        'goldonix.png.webp',
        'gigantamaxblastoise.png.webp',
        'gigantamaxcharizard.png.webp',
        'gigantamaxvenusaur.webp',
        'magmaonix-removebg-preview.png.webp',
        'megablastoise.png.webp',
        'megacharizardx.png.webp',
        'megacharizardy.png.webp',
        'megavenusaur.webp',
        'meganium.png.webp',
        'pinkbutterfree.png.webp',
        'quilava.png.webp',
        'raichu.png.webp',
        'redgyarados.png.webp',
        'shinyditto.webp',
        'typhlosion.png.webp',
        'venusaur.webp',
        'venusaur.webp',
    ].sort();
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    assert.match(selectionHtml, /onix-renders-v2/);
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

test('Johto starters have a selectable middle-evolution preview alongside their final evolution', () => {
    const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

    assert.match(selectionHtml, /data-character-form="evolution-2"[^>]*hidden/);

    const mapBody = selectionSource.match(
        /POKEMON_SELECTION_BATTLE_FORM_RENDERS_BY_ID = Object\.freeze\(\{([\s\S]*?)\n {4}\}\);/
    )?.[1];
    assert.ok(mapBody, 'battle-form render map should exist in the selection client');

    const expected = {
        cyndaquil: 'Quilava',
        chikorita: 'Bayleaf',
        totodile: 'Croconaw',
    };
    Object.entries(expected).forEach(([characterId, label]) => {
        const entryMatch = mapBody.match(new RegExp(`${characterId}:\\s*\\[([\\s\\S]*?)\\]`));
        assert.ok(entryMatch, `${characterId} should have a battle-form render entry`);
        assert.match(entryMatch[1], new RegExp(`id:\\s*'evolution-2'`));
        assert.match(entryMatch[1], new RegExp(`label:\\s*'${label}'`));
        const filenameMatch = entryMatch[1].match(/filename:\s*'([^']+)'/);
        assert.ok(filenameMatch, `${characterId} evolution-2 entry should have a filename`);
        const renderPath = path.join(
            root, 'assets', 'images', 'selection-featured', 'PokemonArena', 'BIB', filenameMatch[1]
        );
        assert.ok(fs.existsSync(renderPath), `${characterId} middle-evolution render should exist: ${filenameMatch[1]}`);
    });
});
