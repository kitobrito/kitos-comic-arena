const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const characterOverridesKey = 'character_overrides';

const isPokemonCharacter = (character) => {
    const arena = typeof character?.arena === 'string' ? character.arena.trim().toLowerCase() : '';
    const universe =
        typeof character?.universe === 'string' ? character.universe.trim().toLowerCase() : '';
    return arena === 'pokemon' || universe === 'pokemon';
};

const canonicalPokemonById = new Map(
    characters
        .filter((character) => character && isPokemonCharacter(character))
        .map((character) => [character.characterId || character.id, character])
);

const normalizeStoredCharacterOverrides = (state = null) => {
    const raw = Array.isArray(state?.overrides)
        ? state.overrides
        : Array.isArray(state?.value?.overrides)
            ? state.value.overrides
            : [];
    return raw
        .map((entry) => {
            const character =
                entry?.character && typeof entry.character === 'object'
                    ? entry.character
                    : entry && typeof entry === 'object'
                        ? entry
                        : null;
            const characterId =
                typeof entry?.characterId === 'string' && entry.characterId
                    ? entry.characterId
                    : typeof character?.characterId === 'string' && character.characterId
                        ? character.characterId
                        : typeof character?.id === 'string'
                            ? character.id
                            : '';
            if (!characterId || !character) return null;
            return { characterId, character };
        })
        .filter(Boolean);
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const syncPokemonOverrideCharacter = (overrideCharacter, canonicalCharacter) => {
    if (!overrideCharacter || !canonicalCharacter) return overrideCharacter;
    return {
        ...overrideCharacter,
        arena: canonicalCharacter.arena,
        universe: canonicalCharacter.universe,
        name: canonicalCharacter.name,
        facePicture: canonicalCharacter.facePicture,
        role: canonicalCharacter.role,
        roleCategory: canonicalCharacter.roleCategory,
        characterdeescription: canonicalCharacter.characterdeescription,
        description: canonicalCharacter.description,
        descriptionHtml: canonicalCharacter.descriptionHtml,
        startStatuses: Array.isArray(canonicalCharacter.startStatuses)
            ? deepClone(canonicalCharacter.startStatuses)
            : [],
        skills: Array.isArray(canonicalCharacter.skills) ? deepClone(canonicalCharacter.skills) : [],
    };
};

async function syncPokemonArenaBalanceOverrides() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const appState = db.collection(appStateCollectionName);
        const existingOverrideState = await appState.findOne({ key: characterOverridesKey });
        const normalizedOverrides = normalizeStoredCharacterOverrides(existingOverrideState);
        const nowDate = new Date();

        await appState.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: normalizedOverrides.map((entry) => ({
                        characterId: entry.characterId,
                        character: canonicalPokemonById.has(entry.characterId)
                            ? syncPokemonOverrideCharacter(
                                  entry.character,
                                  canonicalPokemonById.get(entry.characterId) || entry.character
                              )
                            : entry.character,
                        updatedAt: nowDate,
                        updatedBy: 'sync_pokemon_arena_balance_overrides',
                    })),
                    updatedAt: nowDate,
                    updatedBy: 'sync_pokemon_arena_balance_overrides',
                },
            },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena override mechanics and energy costs.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaBalanceOverrides().catch((error) => {
    console.error(error);
    process.exit(1);
});
