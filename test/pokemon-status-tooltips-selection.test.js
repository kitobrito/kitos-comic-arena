const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');

const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'script.js'), 'utf8');

const isHiddenFromEveryone = (metadata = {}) =>
    Boolean(metadata.hidden || metadata.hideTooltip) ||
    Boolean(metadata.hideTooltipFromEnemy && (metadata.hideTooltipFromOwner || metadata.hideTooltipFromUnitOwner));

const collectVisibleStatusConfigs = (value, sourceSkillId, output) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach((entry) => collectVisibleStatusConfigs(entry, sourceSkillId, output));
        return;
    }
    const metadata = value.metadata && typeof value.metadata === 'object' ? value.metadata : null;
    if (
        typeof value.statusId === 'string' &&
        metadata &&
        (value.type === 'apply_status' || Object.hasOwn(value, 'duration')) &&
        Number(value.duration) !== 0 &&
        !isHiddenFromEveryone(metadata)
    ) {
        output.push({ sourceSkillId, statusId: value.statusId, metadata });
    }
    Object.entries(value).forEach(([key, entry]) => {
        if (key !== 'evolvesTo') collectVisibleStatusConfigs(entry, sourceSkillId, output);
    });
};

test('every visible Pokemon status configuration has an effect description', () => {
    const statuses = [];
    characters
        .filter((character) => (character.arena || character.universe) === 'pokemon')
        .forEach((character) => {
            collectVisibleStatusConfigs(character.startStatuses, '', statuses);
            const visitSkill = (skill) => {
                collectVisibleStatusConfigs(skill.effects, skill.id, statuses);
                if (skill.evolvesTo) visitSkill(skill.evolvesTo);
            };
            (character.skills || []).forEach(visitSkill);
        });

    assert.ok(statuses.length >= 50);
    statuses.forEach(({ sourceSkillId, statusId, metadata }) => {
        assert.ok(
            metadata.tooltipText || metadata.tooltipTextTemplate,
            `${sourceSkillId || '(start status)'}:${statusId}`
        );
        assert.doesNotMatch(metadata.tooltipText || metadata.tooltipTextTemplate, /\bis active\.?$/i);
    });
});

test('Pokemon status rendering falls back to the source skill description, not is active', () => {
    assert.match(script, /currentMatchArena === 'pokemon'[\s\S]*?fallbackSkill\?\.skilldescription/);
    assert.match(
        script,
        /!hasCustomTooltipText &&[\s\S]*?fallbackPokemonStatusDescription &&[\s\S]*?text === `\$\{fallbackSkillName\} is active\.`[\s\S]*?text = fallbackPokemonStatusDescription/
    );
});

test('desktop keeps double-click removal while mobile team portraits remove with one tap', () => {
    assert.match(
        script,
        /const handleSelectedSlotClick = \(slotIndex\) => \{[\s\S]*?\(max-width: 700px\) and \(pointer: coarse\)[\s\S]*?handleSelectedSlotDoubleClick\(slotIndex\);[\s\S]*?handleCharacterSelect\(assignment\.characterIndex, \{ openViewer: true \}\)/
    );
    assert.match(
        script,
        /handleSelectedSlotDoubleClick[\s\S]*?setSelectedSlot\(slotIndex, null\)[\s\S]*?fillRosterSlot/
    );
});

test('Pokemon move and character types render with the shared 18-type badge palette', () => {
    const typeStyles = fs.readFileSync(path.join(__dirname, '..', 'styles', 'pokemon-types.css'), 'utf8');
    const selectionHtml = fs.readFileSync(path.join(__dirname, '..', 'selection.html'), 'utf8');
    const ingameHtml = fs.readFileSync(path.join(__dirname, '..', 'ingame.html'), 'utf8');
    assert.match(script, /renderPokemonSkillClasses\([\s\S]*?skillInfo\.classesEl,[\s\S]*?currentMatchArena === 'pokemon'/);
    assert.match(script, /renderPokemonSkillClasses\(classesEl, classes, 'CLASSES: ', activeArenaMode === 'pokemon'\)/);
    assert.match(script, /appendPokemonTypeBadges\(roleEl, pokemonTypes/);
    assert.match(script, /appendPokemonTypeBadges\([\s\S]*?getVisiblePokemonTypes\(character, unit\)/);
    ['fire', 'water', 'electric', 'bug', 'dragon', 'fairy'].forEach((type) => {
        assert.match(typeStyles, new RegExp(`\\.pokemon-type-${type} \\{ background:`));
    });
    assert.match(selectionHtml, /pokemon-types\.css\?v=pokemon-type-badges-v1/);
    assert.match(ingameHtml, /pokemon-types\.css\?v=pokemon-type-badges-v1/);
    assert.match(selectionHtml, /scripts\/script\.js\?v=[^"']*pokemon-ui-polish-v1/);
    assert.match(ingameHtml, /scripts\/script\.js\?v=[^"']*pokemon-ui-polish-v1/);
    assert.match(ingameHtml, /ingame-experimental\.css\?v=[^"']*pokemon-ui-polish-v1/);
});

test('new battle post-game text has explicit contrast against its dark panel', () => {
    const battleStyles = fs.readFileSync(path.join(__dirname, '..', 'styles', 'ingame-experimental.css'), 'utf8');
    assert.match(
        battleStyles,
        /html\.battle-experimental \.battle-end-copy,[\s\S]*?\.battle-end-message \{[\s\S]*?color:\s*#f4f7f8;/
    );
    assert.match(battleStyles, /html\.battle-experimental \.battle-end-title \{[\s\S]*?color:\s*#ff7189;/);
});
