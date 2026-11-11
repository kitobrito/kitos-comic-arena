#!/usr/bin/env node
'use strict';

// Release a character prepared in staging/<id>.js:
//   node scripts/release-staged-character.js deadpool            (writes the files)
//   node scripts/release-staged-character.js deadpool --dry-run  (only checks)
//
// Adds the character to the end of characters.js and its unlock mission to the end of
// server.js's DEFAULT_MISSION_CATALOG (the server upserts catalog missions into the live
// mission list at startup). Refuses if either is already there.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function indent(text, spaces) {
    const pad = ' '.repeat(spaces);
    return text.split('\n').map((line) => (line ? pad + line : line)).join('\n');
}

function toJsObjectLiteral(value) {
    // server.js writes catalog entries as plain object literals with single-quoted strings.
    return JSON.stringify(value, null, 4)
        .replace(/"([A-Za-z_$][A-Za-z0-9_$]*)":/g, '$1:')
        .replace(/"((?:[^"\\]|\\.)*)"/g, (m, inner) => `'${inner.replace(/\\"/g, '"').replace(/'/g, "\\'")}'`);
}

function releaseCharacter(id, { root = ROOT, write = true } = {}) {
    const staged = require(path.join(root, 'staging', `${id}.js`));
    const { character, mission } = staged;
    if (!character?.characterId) throw new Error(`staging/${id}.js has no character`);

    const charactersPath = path.join(root, 'characters.js');
    const charactersSource = fs.readFileSync(charactersPath, 'utf8');
    if (charactersSource.includes(`"characterId": "${character.characterId}"`)) {
        throw new Error(`${character.characterId} is already in characters.js`);
    }
    const arrayEnd = charactersSource.lastIndexOf('\n];');
    if (arrayEnd === -1) throw new Error('Could not find the end of the characters array');
    const before = charactersSource.slice(0, arrayEnd).replace(/\s*$/, '');
    const nextCharacters = `${before},\n${indent(JSON.stringify(character, null, 4), 4)}${charactersSource.slice(arrayEnd)}`;

    let nextServer = null;
    const serverPath = path.join(root, 'server.js');
    if (mission) {
        const serverSource = fs.readFileSync(serverPath, 'utf8');
        const catalogStart = serverSource.indexOf('const DEFAULT_MISSION_CATALOG = [');
        if (catalogStart === -1) throw new Error('Could not find DEFAULT_MISSION_CATALOG in server.js');
        const catalogEnd = serverSource.indexOf('\n];', catalogStart);
        const catalog = serverSource.slice(catalogStart, catalogEnd);
        if (catalog.includes(`missionId: '${mission.missionId}'`)) {
            throw new Error(`Mission ${mission.missionId} is already in DEFAULT_MISSION_CATALOG`);
        }
        const sortOrders = [...catalog.matchAll(/\n {8}sortOrder: (\d+)/g)].map((m) => Number(m[1]));
        const entry = {
            ...mission,
            special_pve: mission.special_pve || {
                enabled: false, buttonLabel: 'Start Fight', botName: 'Mission Bot', botTeamCharacterId: '',
                botTeamSize: 3, backgroundImage: '', playerTeamCharacterIds: [],
            },
            sortOrder: mission.sortOrder ?? (sortOrders.length ? Math.max(...sortOrders) + 1 : 1),
        };
        nextServer = `${serverSource.slice(0, catalogEnd)},\n${indent(toJsObjectLiteral(entry), 4)}${serverSource.slice(catalogEnd)}`;
    }

    if (write) {
        fs.writeFileSync(charactersPath, nextCharacters);
        if (nextServer) fs.writeFileSync(serverPath, nextServer);
    }
    return { characters: nextCharacters, server: nextServer };
}

module.exports = { releaseCharacter };

if (require.main === module) {
    const id = process.argv[2];
    const dryRun = process.argv.includes('--dry-run');
    if (!id) {
        console.error('Usage: node scripts/release-staged-character.js <id> [--dry-run]');
        process.exit(1);
    }
    try {
        releaseCharacter(id, { write: !dryRun });
        console.log(dryRun
            ? `${id} is ready to release (dry run, nothing written).`
            : `${id} added to characters.js and the mission catalog. Restart the server to publish. Consider a news post and bumping the characters.js cache-bust marker.`);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
