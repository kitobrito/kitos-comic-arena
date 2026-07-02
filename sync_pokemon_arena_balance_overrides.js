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

const syncPokemonOverrideCharacter = (overrideCharacter, canonicalCharacter) => {
    if (!overrideCharacter || !canonicalCharacter) return overrideCharacter;
    const canonicalSkills = new Map(
        Array.isArray(canonicalCharacter.skills)
            ? canonicalCharacter.skills
                  .filter((skill) => skill && typeof skill.id === 'string' && skill.id)
                  .map((skill) => [skill.id, skill])
            : []
    );

    const syncedSkills = Array.isArray(overrideCharacter.skills)
        ? overrideCharacter.skills.map((skill) => {
              if (!skill || typeof skill !== 'object') return skill;
              const canonicalSkill = canonicalSkills.get(skill.id);
              if (!canonicalSkill) return skill;
              return {
                  ...skill,
                  actorCondition: canonicalSkill.actorCondition,
                  classes: Array.isArray(canonicalSkill.classes) ? [...canonicalSkill.classes] : [],
                  cooldown: canonicalSkill.cooldown,
                  damage: canonicalSkill.damage,
                  effects: Array.isArray(canonicalSkill.effects)
                      ? JSON.parse(JSON.stringify(canonicalSkill.effects))
                      : [],
                  energy: Array.isArray(canonicalSkill.energy) ? [...canonicalSkill.energy] : [],
                  target: canonicalSkill.target,
              };
          })
        : overrideCharacter.skills;

    return {
        ...overrideCharacter,
        arena: canonicalCharacter.arena,
        startStatuses: Array.isArray(canonicalCharacter.startStatuses)
            ? JSON.parse(JSON.stringify(canonicalCharacter.startStatuses))
            : [],
        skills: syncedSkills,
        universe: canonicalCharacter.universe,
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
                        character: isPokemonCharacter(entry.character)
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
