const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

const projectRoot = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const charactersFilePath = path.join(projectRoot, 'characters.js');
const characterOverridesKey = 'character_overrides';

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function cloneSerializable(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
}

function getCharacterRecordId(character = {}) {
    if (typeof character?.characterId === 'string' && character.characterId.trim()) {
        return character.characterId.trim();
    }
    if (typeof character?.id === 'string' && character.id.trim()) {
        return character.id.trim();
    }
    return '';
}

function loadCharactersDataFromFile() {
    delete require.cache[require.resolve(charactersFilePath)];
    const fileCharacters = require(charactersFilePath);
    return Array.isArray(fileCharacters) ? fileCharacters : [];
}

function getStoredOverrides(state = null) {
    if (Array.isArray(state?.overrides)) return state.overrides;
    if (Array.isArray(state?.value?.overrides)) return state.value.overrides;
    return [];
}

function getStoredCharacter(entry = {}) {
    if (entry?.character && typeof entry.character === 'object') return entry.character;
    if (entry && typeof entry === 'object') return entry;
    return null;
}

function normalizeStoredCharacterOverrides(entries = []) {
    return (Array.isArray(entries) ? entries : [])
        .map((entry) => {
            const character = getStoredCharacter(entry);
            const characterId = getCharacterRecordId(character) || getCharacterRecordId(entry);
            if (!characterId || !character) return null;
            return {
                characterId,
                character,
                raw: entry,
            };
        })
        .filter(Boolean);
}

function mergeCharacterOverrideArraysByKey(baseArray = [], overrideArray = [], key) {
    const baseEntries = Array.isArray(baseArray) ? baseArray : [];
    const overrideEntries = Array.isArray(overrideArray) ? overrideArray : [];
    const overrideByKey = new Map();
    overrideEntries.forEach((entry) => {
        const entryKey = entry && typeof entry === 'object' ? entry?.[key] : '';
        if (entryKey) {
            overrideByKey.set(entryKey, entry);
        }
    });
    const merged = baseEntries.map((entry) => {
        const entryKey = entry && typeof entry === 'object' ? entry?.[key] : '';
        if (!entryKey || !overrideByKey.has(entryKey)) {
            return entry;
        }
        const overrideEntry = overrideByKey.get(entryKey);
        overrideByKey.delete(entryKey);
        return mergeCharacterOverrideValue(entry, overrideEntry, key);
    });
    overrideByKey.forEach((entry) => {
        merged.push(entry);
    });
    return merged;
}

function mergeCharacterOverrideEffects(baseEffects = [], overrideEffects = []) {
    const nextBaseEffects = Array.isArray(baseEffects) ? baseEffects : [];
    const nextOverrideEffects = Array.isArray(overrideEffects) ? overrideEffects : [];
    const maxLength = Math.max(nextBaseEffects.length, nextOverrideEffects.length);
    const merged = [];
    for (let index = 0; index < maxLength; index += 1) {
        const baseEntry = nextBaseEffects[index];
        const overrideEntry = nextOverrideEffects[index];
        if (overrideEntry === undefined) {
            merged.push(baseEntry);
            continue;
        }
        if (baseEntry === undefined) {
            merged.push(overrideEntry);
            continue;
        }
        merged.push(mergeCharacterOverrideValue(baseEntry, overrideEntry, 'effects'));
    }
    return merged;
}

function mergeCharacterOverrideValue(baseValue, overrideValue, parentKey = '') {
    if (overrideValue === undefined) {
        return baseValue;
    }
    if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
        if (parentKey === 'skills') {
            return mergeCharacterOverrideArraysByKey(baseValue, overrideValue, 'id');
        }
        if (parentKey === 'startStatuses') {
            return mergeCharacterOverrideArraysByKey(baseValue, overrideValue, 'statusId');
        }
        if (parentKey === 'effects') {
            return mergeCharacterOverrideEffects(baseValue, overrideValue);
        }
        return overrideValue;
    }
    if (
        baseValue &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue) &&
        overrideValue &&
        typeof overrideValue === 'object' &&
        !Array.isArray(overrideValue)
    ) {
        const merged = { ...baseValue };
        Object.keys(overrideValue).forEach((key) => {
            merged[key] = mergeCharacterOverrideValue(baseValue?.[key], overrideValue[key], key);
        });
        return merged;
    }
    return overrideValue;
}

function mergeCharacterOverrideRecord(baseCharacter, overrideCharacter) {
    if (!baseCharacter || typeof baseCharacter !== 'object') {
        return overrideCharacter;
    }
    if (!overrideCharacter || typeof overrideCharacter !== 'object') {
        return baseCharacter;
    }
    return mergeCharacterOverrideValue(baseCharacter, overrideCharacter);
}

function applyCharacterOverrides(baseCharacters = [], overridesMap = new Map()) {
    const nextCharacters = (Array.isArray(baseCharacters) ? baseCharacters : []).slice();
    overridesMap.forEach((overrideCharacter, characterId) => {
        if (!characterId || !overrideCharacter || typeof overrideCharacter !== 'object') {
            return;
        }
        const existingIndex = nextCharacters.findIndex(
            (entry) => getCharacterRecordId(entry) === characterId
        );
        if (existingIndex === -1) {
            nextCharacters.push(overrideCharacter);
            return;
        }
        nextCharacters[existingIndex] = mergeCharacterOverrideRecord(
            nextCharacters[existingIndex],
            overrideCharacter
        );
    });
    return nextCharacters;
}

function normalizeArenaMode(value = 'comic') {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return normalized === 'pokemon' ? 'pokemon' : 'comic';
}

function usernamesEqual(left, right) {
    return (
        typeof left === 'string' &&
        typeof right === 'string' &&
        left.trim().toLowerCase() === right.trim().toLowerCase()
    );
}

function summarizeCharacter(character = null) {
    if (!character) return null;
    return {
        characterId: getCharacterRecordId(character) || null,
        name: character.name || null,
        arena: normalizeArenaMode(character.arena || character.universe),
        role: character.role || null,
        roleCategory: character.roleCategory || null,
        facePicture: character.facePicture || null,
        skillCount: Array.isArray(character.skills) ? character.skills.length : 0,
        skills: Array.isArray(character.skills)
            ? character.skills.map((skill) => ({
                  id: skill.id,
                  name: skill.name,
                  cooldown: skill.cooldown,
                  target: skill.target,
              }))
            : [],
    };
}

function fetchText(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;
        client
            .get(url, (response) => {
                if (response.statusCode && response.statusCode >= 400) {
                    reject(new Error(`Request failed with status ${response.statusCode}`));
                    response.resume();
                    return;
                }
                let data = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => resolve(data));
            })
            .on('error', reject);
    });
}

function buildMongoConfig() {
    return {
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB || 'comic-arena',
        appStateCollectionName: process.env.MONGODB_APP_STATE_COLLECTION || 'app_state',
        matchesCollectionName: process.env.MONGODB_MATCHES_COLLECTION || 'matches',
    };
}

async function withMongo(callback) {
    const { uri, dbName, appStateCollectionName, matchesCollectionName } = buildMongoConfig();
    if (!uri) {
        throw new Error('MONGODB_URI is required in .env.');
    }
    const client = new MongoClient(uri);
    await client.connect();
    try {
        const db = client.db(dbName);
        return await callback({
            client,
            db,
            appState: db.collection(appStateCollectionName),
            matches: db.collection(matchesCollectionName),
        });
    } finally {
        await client.close();
    }
}

async function loadCharacterOverrideState(appStateCollection) {
    return appStateCollection.findOne({ key: characterOverridesKey });
}

async function loadEffectiveCharacterState() {
    return withMongo(async ({ appState }) => {
        const state = await loadCharacterOverrideState(appState);
        const normalized = normalizeStoredCharacterOverrides(getStoredOverrides(state));
        const overridesMap = new Map(normalized.map((entry) => [entry.characterId, entry.character]));
        const fileCharacters = loadCharactersDataFromFile();
        const effectiveCharacters = applyCharacterOverrides(fileCharacters, overridesMap);
        return {
            fileCharacters,
            overrides: normalized,
            overridesMap,
            effectiveCharacters,
        };
    });
}

function parseRemoteCharactersText(payloadText = '') {
    const vm = require('vm');
    const module = { exports: [] };
    const context = vm.createContext({ module, exports: module.exports, require, __dirname: projectRoot });
    const script = new vm.Script(payloadText, { filename: 'remote-characters.js' });
    script.runInContext(context);
    return Array.isArray(module.exports) ? module.exports : [];
}

function buildCharacterMap(characters = []) {
    return new Map(
        (Array.isArray(characters) ? characters : [])
            .map((character) => [getCharacterRecordId(character), character])
            .filter(([characterId]) => Boolean(characterId))
    );
}

module.exports = {
    applyCharacterOverrides,
    buildCharacterMap,
    buildMongoConfig,
    characterOverridesKey,
    cloneSerializable,
    deepClone,
    fetchText,
    getCharacterRecordId,
    getStoredCharacter,
    getStoredOverrides,
    loadCharacterOverrideState,
    loadCharactersDataFromFile,
    loadEffectiveCharacterState,
    mergeCharacterOverrideRecord,
    mergeCharacterOverrideValue,
    normalizeArenaMode,
    normalizeStoredCharacterOverrides,
    parseRemoteCharactersText,
    projectRoot,
    summarizeCharacter,
    usernamesEqual,
    withMongo,
};
