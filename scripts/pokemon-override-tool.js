const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

const projectRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const characters = require(path.join(projectRoot, 'characters'));

const characterOverridesKey = 'character_overrides';

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeForCompare(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeForCompare(entry));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
                accumulator[key] = normalizeForCompare(value[key]);
                return accumulator;
            }, {});
    }
    return value;
}

function valuesMatch(left, right) {
    return JSON.stringify(normalizeForCompare(left)) === JSON.stringify(normalizeForCompare(right));
}

function isPokemonCharacter(character) {
    const arena = typeof character?.arena === 'string' ? character.arena.trim().toLowerCase() : '';
    const universe =
        typeof character?.universe === 'string' ? character.universe.trim().toLowerCase() : '';
    return arena === 'pokemon' || universe === 'pokemon';
}

function getCanonicalCharacters() {
    return characters.filter((character) => character && isPokemonCharacter(character));
}

function getCanonicalCharacterMap() {
    return new Map(
        getCanonicalCharacters().map((character) => [character.characterId || character.id, character])
    );
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

function getStoredCharacterId(entry = {}) {
    const character = getStoredCharacter(entry);
    if (typeof entry?.characterId === 'string' && entry.characterId) return entry.characterId;
    if (typeof character?.characterId === 'string' && character.characterId) return character.characterId;
    if (typeof character?.id === 'string' && character.id) return character.id;
    if (typeof entry?.id === 'string' && entry.id) return entry.id;
    return '';
}

function normalizeOverrides(state = null) {
    return getStoredOverrides(state)
        .map((entry) => {
            const character = getStoredCharacter(entry);
            const characterId = getStoredCharacterId(entry);
            if (!character || !characterId) return null;
            return {
                characterId,
                character,
                raw: entry,
            };
        })
        .filter(Boolean);
}

function buildCharacterSummary(character = null) {
    if (!character) return null;
    return {
        characterId: character.characterId || character.id || null,
        name: character.name || null,
        arena: character.arena || null,
        role: character.role || null,
        roleCategory: character.roleCategory || null,
        skills: Array.isArray(character.skills)
            ? character.skills.map((skill) => ({
                  id: skill.id,
                  name: skill.name,
                  cooldown: skill.cooldown,
                  actorCondition: skill.actorCondition || null,
                  effects: Array.isArray(skill.effects)
                      ? skill.effects.map((effect) => ({
                            type: effect.type,
                            amount: effect.amount,
                            statusId: effect.statusId,
                            scope: effect.scope,
                            metadata: effect.metadata || null,
                        }))
                      : [],
              }))
            : [],
    };
}

function diffSkill(canonicalSkill = {}, overrideSkill = {}) {
    const differences = {};
    const fields = ['name', 'skilldescription', 'cooldown', 'damage', 'target', 'energy', 'actorCondition', 'classes', 'effects'];
    fields.forEach((field) => {
        const canonicalValue = canonicalSkill?.[field];
        const overrideValue = overrideSkill?.[field];
        if (!valuesMatch(canonicalValue, overrideValue)) {
            differences[field] = {
                canonical: canonicalValue,
                override: overrideValue,
            };
        }
    });
    return differences;
}

function diffCharacter(canonicalCharacter = null, overrideCharacter = null) {
    if (!canonicalCharacter || !overrideCharacter) return null;
    const topLevelDifferences = {};
    const topLevelFields = [
        'name',
        'arena',
        'universe',
        'facePicture',
        'role',
        'roleCategory',
        'characterdeescription',
        'description',
        'descriptionHtml',
        'startStatuses',
    ];
    topLevelFields.forEach((field) => {
        if (!valuesMatch(canonicalCharacter?.[field], overrideCharacter?.[field])) {
            topLevelDifferences[field] = {
                canonical: canonicalCharacter?.[field],
                override: overrideCharacter?.[field],
            };
        }
    });

    const overrideSkillMap = new Map(
        (Array.isArray(overrideCharacter?.skills) ? overrideCharacter.skills : []).map((skill) => [
            skill.id,
            skill,
        ])
    );
    const skillDifferences = (Array.isArray(canonicalCharacter?.skills) ? canonicalCharacter.skills : [])
        .map((canonicalSkill) => {
            const differences = diffSkill(canonicalSkill, overrideSkillMap.get(canonicalSkill.id) || null);
            if (!Object.keys(differences).length) return null;
            return {
                skillId: canonicalSkill.id,
                differences,
            };
        })
        .filter(Boolean);

    return {
        characterId: canonicalCharacter.characterId || canonicalCharacter.id || null,
        topLevelDifferences,
        skillDifferences,
    };
}

function syncOverrideCharacter(overrideCharacter, canonicalCharacter) {
    const nextCharacter = {
        ...deepClone(overrideCharacter || {}),
        ...deepClone(canonicalCharacter || {}),
    };
    nextCharacter.characterId =
        canonicalCharacter?.characterId || canonicalCharacter?.id || overrideCharacter?.characterId || null;
    return nextCharacter;
}

function parseArgs(argv) {
    const [command = 'inspect', ...rest] = argv;
    const options = {
        characterId: null,
        arena: 'pokemon',
        format: 'pretty',
    };

    for (let index = 0; index < rest.length; index += 1) {
        const arg = rest[index];
        if (arg === '--character' || arg === '-c') {
            options.characterId = rest[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--arena') {
            options.arena = rest[index + 1] || 'pokemon';
            index += 1;
            continue;
        }
        if (arg === '--json') {
            options.format = 'json';
        }
    }

    return { command, options };
}

function printResult(result, format = 'pretty') {
    if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    console.log(JSON.stringify(result, null, 2));
}

async function loadOverrideState() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'comic-arena';
    const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';

    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const appState = db.collection(appStateCollectionName);
    const state = await appState.findOne({ key: characterOverridesKey });
    return { client, appState, state };
}

function getTargetIds(options, normalizedOverrides, canonicalMap) {
    if (options.characterId) return [options.characterId];
    if ((options.arena || '').toLowerCase() === 'pokemon') {
        return normalizedOverrides
            .map((entry) => entry.characterId)
            .filter((characterId) => canonicalMap.has(characterId));
    }
    return [];
}

async function inspectCommand(options) {
    const { client, state } = await loadOverrideState();
    try {
        const canonicalMap = getCanonicalCharacterMap();
        const normalizedOverrides = normalizeOverrides(state);
        const overrideMap = new Map(normalizedOverrides.map((entry) => [entry.characterId, entry.character]));
        const targetIds = getTargetIds(options, normalizedOverrides, canonicalMap);

        const result = targetIds.map((characterId) => ({
            characterId,
            canonical: buildCharacterSummary(canonicalMap.get(characterId) || null),
            override: buildCharacterSummary(overrideMap.get(characterId) || null),
            diff: diffCharacter(canonicalMap.get(characterId) || null, overrideMap.get(characterId) || null),
        }));
        printResult(result, options.format);
    } finally {
        await client.close();
    }
}

async function syncCommand(options) {
    const { client, appState, state } = await loadOverrideState();
    try {
        const canonicalMap = getCanonicalCharacterMap();
        const normalizedOverrides = normalizeOverrides(state);
        const targetIds = new Set(getTargetIds(options, normalizedOverrides, canonicalMap));
        const nowDate = new Date();

        const nextOverrides = getStoredOverrides(state).map((entry) => {
            const characterId = getStoredCharacterId(entry);
            if (!targetIds.has(characterId) || !canonicalMap.has(characterId)) return entry;
            return {
                ...entry,
                characterId,
                character: syncOverrideCharacter(getStoredCharacter(entry), canonicalMap.get(characterId)),
                updatedAt: nowDate,
                updatedBy: 'scripts/pokemon-override-tool.js',
            };
        });

        await appState.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: nextOverrides,
                    updatedAt: nowDate,
                    updatedBy: 'scripts/pokemon-override-tool.js',
                },
            },
            { upsert: true }
        );

        const nextState = await appState.findOne({ key: characterOverridesKey });
        const nextNormalizedOverrides = normalizeOverrides(nextState);
        const nextOverrideMap = new Map(
            nextNormalizedOverrides.map((entry) => [entry.characterId, entry.character])
        );
        const result = [...targetIds].map((characterId) => ({
            characterId,
            synced: true,
            diffAfterSync: diffCharacter(
                canonicalMap.get(characterId) || null,
                nextOverrideMap.get(characterId) || null
            ),
        }));
        printResult(result, options.format);
    } finally {
        await client.close();
    }
}

async function main() {
    const { command, options } = parseArgs(process.argv.slice(2));
    if (command === 'inspect' || command === 'diff') {
        await inspectCommand(options);
        return;
    }
    if (command === 'sync') {
        await syncCommand(options);
        return;
    }
    throw new Error(
        'Unknown command. Use inspect, diff, or sync. Example: node scripts/pokemon-override-tool.js sync --character magikarp'
    );
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = {
    buildCharacterSummary,
    diffCharacter,
    getCanonicalCharacterMap,
    getStoredCharacterId,
    getStoredOverrides,
    isPokemonCharacter,
    normalizeOverrides,
    parseArgs,
    syncOverrideCharacter,
    valuesMatch,
};
