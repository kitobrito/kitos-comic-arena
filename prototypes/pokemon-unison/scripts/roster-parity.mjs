import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROSTER } from '../reference/roster.mjs';

const require = createRequire(import.meta.url);
const productionCharacters = require('../../../characters.js');
const manifest = JSON.parse(
    readFileSync(new URL('../migration/roster-manifest.json', import.meta.url), 'utf8')
);

const characterId = (character) => character.characterId || character.id;
const isPokemon = (character) =>
    String(character?.arena || character?.universe || '').trim().toLowerCase() === 'pokemon';
const allSkills = (character) => [
    ...(character.skills ?? []),
    ...(character.battleForms ?? []).flatMap((form) => form.skills ?? []),
];

export function buildRosterParityReport() {
    const source = productionCharacters.filter(isPokemon);
    const sourceById = new Map(source.map((character) => [characterId(character), character]));
    const manifestById = new Map(manifest.characters.map((entry) => [entry.id, entry]));
    const standaloneIds = Object.keys(ROSTER);
    const duplicateManifestIds = manifest.characters
        .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) !== index)
        .map((entry) => entry.id);
    const missingFromManifest = source.map(characterId).filter((id) => !manifestById.has(id));
    const removedFromSource = manifest.characters.map((entry) => entry.id).filter((id) => !sourceById.has(id));
    const metadataDrift = manifest.characters.flatMap((entry) => {
        const character = sourceById.get(entry.id);
        if (!character) return [];
        const definitionCount = allSkills(character).length;
        return entry.name !== character.name || entry.sourceSkillDefinitions !== definitionCount
            ? [{ id: entry.id, expectedName: character.name, expectedSkillDefinitions: definitionCount }]
            : [];
    });
    const standaloneMissing = manifest.characters
        .filter((entry) => entry.status !== 'not-started' && !ROSTER[entry.id])
        .map((entry) => entry.id);
    const standaloneUnexpected = standaloneIds.filter((id) => {
        const entry = manifestById.get(id);
        return !entry || entry.status === 'not-started';
    });
    const statusCounts = Object.fromEntries(
        ['ported-full', 'ported-partial', 'not-started'].map((status) => [
            status,
            manifest.characters.filter((entry) => entry.status === status).length,
        ])
    );
    const effectTypes = [...new Set(
        source.flatMap((character) => allSkills(character).flatMap(
            (skill) => (skill.effects ?? []).map((effect) => effect.type)
        ))
    )].sort();
    const targetTypes = [...new Set(
        source.flatMap((character) => allSkills(character).map((skill) => skill.target))
    )].sort();
    const errors = {
        duplicateManifestIds,
        missingFromManifest,
        removedFromSource,
        metadataDrift,
        standaloneMissing,
        standaloneUnexpected,
    };
    return {
        sourceCharacters: source.length,
        standaloneCharacters: standaloneIds.length,
        ...statusCounts,
        effectTypes,
        targetTypes,
        errors,
        complete: Object.values(errors).every((entries) => entries.length === 0),
    };
}

export function formatRosterParityReport(report) {
    const lines = [
        'Pokemon Unison roster migration coverage',
        `Source Pokemon Arena characters: ${report.sourceCharacters}`,
        `Standalone definitions: ${report.standaloneCharacters}`,
        `Fully ported: ${report['ported-full']}`,
        `Partially ported: ${report['ported-partial']}`,
        `Not started: ${report['not-started']}`,
        `Source effect vocabulary: ${report.effectTypes.length}`,
        `Source target modes: ${report.targetTypes.length}`,
    ];
    Object.entries(report.errors).forEach(([key, entries]) => {
        if (entries.length) lines.push(`${key}: ${JSON.stringify(entries)}`);
    });
    return lines.join('\n');
}

const launchedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (launchedDirectly) {
    const report = buildRosterParityReport();
    console.log(formatRosterParityReport(report));
    if (!report.complete) process.exitCode = 1;
}
