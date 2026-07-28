const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');

const root = path.resolve(__dirname, '..');
const scriptSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
const ingameSource = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

test('the universal evolution cinematic is driven by confirmed evolution statuses', () => {
    assert.match(
        scriptSource,
        /const isPokemonEvolutionStatus = \(status\) =>[\s\S]*?\/_evolution\$\/[\s\S]*?facePictureOverride/
    );
    assert.match(
        scriptSource,
        /const evolutionStatus = changedStatuses\.find\(isPokemonEvolutionStatus\);[\s\S]*?queuePokemonEvolutionCinematic/
    );
    assert.match(scriptSource, /const pokemonEvolutionCinematicQueue = \[\]/);
    assert.match(scriptSource, /getPokemonEvolutionPreviousFace\(previousUnit, card\)/);
    assert.doesNotMatch(
        scriptSource,
        /status\?\.id === 'scraggy_scrafty_evolution'[\s\S]{0,250}community-scraggy-evolution-burst/
    );
});
test('Rare Candy uses a distinct prismatic cinematic and sound score', () => {
    assert.match(
        scriptSource,
        /const rareCandy = status\?\.sourceSkillId === 'pokemon-trainer-rare-candy'/
    );
    assert.match(scriptSource, /pokemon-rare-candy-evolution/);
    assert.match(styleSource, /\.pokemon-evolution-cinematic\.rare-candy \.pokemon-evolution-candy/);
    assert.match(styleSource, /RARE CANDY AWAKENING|pokemon-evolution-candy-crystal/);

    const trainer = characters.find((character) => character.id === 'pokemon-trainer');
    const rareCandy = trainer.skills.find((skill) => skill.id === 'pokemon-trainer-rare-candy');
    const evolutions = rareCandy.effects.filter((effect) => /_evolution$/.test(effect.statusId || ''));
    assert.ok(evolutions.length >= 10);
    evolutions.forEach((effect) => {
        assert.ok(
            effect.metadata?.facePictureOverride ||
                effect.metadata?.useEvolvedSkills ||
                effect.metadata?.skillReplacements,
            `${effect.statusId} must expose a form-changing marker`
        );
    });
});

test('evolution respects animation settings, reduced motion, mobile layouts, and cache markers', () => {
    assert.match(
        scriptSource,
        /!uiSettings\.skillCastAnimations[\s\S]*?ui-disable-skill-cast-animations[\s\S]*?return/
    );
    assert.match(scriptSource, /matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
    assert.match(
        styleSource,
        /body\.ui-disable-skill-cast-animations \.pokemon-evolution-cinematic[\s\S]*?display: none/
    );
    assert.match(
        styleSource,
        /@media \(max-width: 680px\)[\s\S]*?\.pokemon-evolution-stage[\s\S]*?\.pokemon-evolution-crest/
    );
    assert.match(
        styleSource,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.pokemon-evolution-cinematic[\s\S]*?700ms/
    );
    assert.match(ingameSource, /pokemon-evolution-cinematic-v1/);
});
