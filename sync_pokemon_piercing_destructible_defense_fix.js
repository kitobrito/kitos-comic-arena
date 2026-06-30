const { MongoClient } = require('mongodb');
require('dotenv').config();

const characterOverridesKey = 'character_overrides';
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';

const patchSkillEffect = (character, skillId, effectIndex, patcher) => {
    if (!character || typeof character !== 'object' || !Array.isArray(character.skills)) {
        return false;
    }

    const skill = character.skills.find((entry) => entry && entry.id === skillId);
    if (!skill || !Array.isArray(skill.effects) || !skill.effects[effectIndex]) {
        return false;
    }

    const effect = skill.effects[effectIndex];
    const patched = patcher(effect);
    if (!patched || patched === effect) {
        return false;
    }

    skill.effects[effectIndex] = patched;
    return true;
};

const removeMetadataKey = (effect, metadataKey) => {
    if (!effect || typeof effect !== 'object' || !effect.metadata || !(metadataKey in effect.metadata)) {
        return effect;
    }

    const nextMetadata = { ...effect.metadata };
    delete nextMetadata[metadataKey];

    return {
        ...effect,
        metadata: nextMetadata,
    };
};

const patchCharacter = (character) => {
    const characterId = character?.characterId || character?.id || '';
    let changed = false;

    if (characterId === 'zubat') {
        changed =
            patchSkillEffect(character, 'golbat-bite', 0, (effect) =>
                removeMetadataKey(effect, 'ignoreDestructibleDefense')
            ) || changed;
    }

    if (characterId === 'scyther') {
        changed =
            patchSkillEffect(character, 'scyther-fury-cutter', 1, (effect) =>
                removeMetadataKey(effect, 'ignoreDestructibleDefense')
            ) || changed;
        [0, 1, 2, 3].forEach((effectIndex) => {
            changed =
                patchSkillEffect(character, 'scyther-x-cutter', effectIndex, (effect) =>
                    removeMetadataKey(effect, 'ignoreDestructibleDefense')
                ) || changed;
        });
    }

    return changed;
};

const main = async () => {
    if (!uri) {
        throw new Error('Missing MONGODB_URI');
    }

    const client = new MongoClient(uri);
    await client.connect();

    try {
        const db = client.db(dbName);
        const appStateCollection = db.collection(appStateCollectionName);
        const state = await appStateCollection.findOne({ key: characterOverridesKey });
        const overrides = Array.isArray(state?.overrides)
            ? state.overrides
            : Array.isArray(state?.value?.overrides)
                ? state.value.overrides
                : [];

        let changeCount = 0;
        const nextOverrides = overrides.map((entry) => {
            const character =
                entry && typeof entry === 'object' && entry.character && typeof entry.character === 'object'
                    ? entry.character
                    : entry;

            if (!patchCharacter(character)) {
                return entry;
            }

            changeCount += 1;
            if (entry && typeof entry === 'object' && entry.character && typeof entry.character === 'object') {
                return {
                    ...entry,
                    character,
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_piercing_destructible_defense_fix',
                };
            }

            return character;
        });

        if (changeCount === 0) {
            console.log('No override changes were needed.');
            return;
        }

        const now = new Date();
        await appStateCollection.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: nextOverrides,
                    updatedAt: now,
                    updatedBy: 'sync_pokemon_piercing_destructible_defense_fix',
                },
            },
            { upsert: true }
        );

        console.log(`Updated ${changeCount} character override entries.`);
    } finally {
        await client.close();
    }
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
