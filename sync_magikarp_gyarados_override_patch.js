const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const characterOverridesKey = 'character_overrides';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const getStoredOverrides = (state = null) => {
    if (Array.isArray(state?.overrides)) return state.overrides;
    if (Array.isArray(state?.value?.overrides)) return state.value.overrides;
    return [];
};

const getStoredCharacterId = (entry = {}) => {
    if (typeof entry?.characterId === 'string' && entry.characterId) return entry.characterId;
    if (typeof entry?.character?.characterId === 'string' && entry.character.characterId) return entry.character.characterId;
    if (typeof entry?.character?.id === 'string' && entry.character.id) return entry.character.id;
    if (typeof entry?.id === 'string' && entry.id) return entry.id;
    return '';
};

const patchSkill = (skill = {}) => {
    if (!skill || typeof skill !== 'object' || typeof skill.id !== 'string') return skill;
    if (skill.id === 'magikarp-struggle') {
        return {
            ...skill,
            skilldescription: "Deals 25 damage but may only be used when all of Magikarp's other skills are on cooldown. Magikarp also loses 5 health.",
            damage: 0,
            cooldown: 0,
            actorCondition: {
                allOtherSkillsOnCooldown: true,
            },
            effects: [
                {
                    type: 'damage',
                    amount: 25,
                    scope: 'target',
                },
                {
                    type: 'HealthLoss',
                    amount: 5,
                    scope: 'self',
                },
            ],
        };
    }
    if (skill.id === 'gyarados-hyper-beam' || skill.id === 'gyarados-hyper-beam-affliction') {
        return {
            ...skill,
            cooldown: 3,
        };
    }
    if (skill.id !== 'gyarados-dragon-rage') {
        return skill;
    }
    const effects = Array.isArray(skill.effects) ? skill.effects.map((effect) => {
        if (!effect || typeof effect !== 'object' || effect.statusId !== 'gyarados_dragon_rage_burn') {
            return effect;
        }
        return {
            ...effect,
            metadata: {
                ...(effect.metadata && typeof effect.metadata === 'object' ? effect.metadata : {}),
                turnEndTrigger: 'source_turn',
                turnDurationAnchor: 'source_turn',
                triggerOnApply: true,
                tooltipText: "This character takes 20 affliction damage at the end of Gyarados's turns from Dragon Rage.",
            },
        };
    }) : skill.effects;
    return {
        ...skill,
        skilldescription: "Deals 20 affliction damage to one enemy at the end of Gyarados's turns for 3 turns and makes Hyper Beam deal affliction damage during this time.",
        effects,
    };
};

async function syncMagikarpGyaradosOverridePatch() {
    if (!uri) {
        throw new Error('MONGODB_URI is required.');
    }

    const client = new MongoClient(uri);
    await client.connect();
    try {
        const db = client.db(dbName);
        const appState = db.collection(appStateCollectionName);
        const state = await appState.findOne({ key: characterOverridesKey });
        const overrides = getStoredOverrides(state);
        let patched = false;
        const nextOverrides = overrides.map((entry) => {
            const characterId = getStoredCharacterId(entry);
            if (characterId !== 'magikarp') return entry;
            const baseCharacter =
                entry?.character && typeof entry.character === 'object'
                    ? entry.character
                    : entry;
            const nextSkills = Array.isArray(baseCharacter.skills)
                ? baseCharacter.skills.map((skill) => patchSkill(deepClone(skill)))
                : baseCharacter.skills;
            patched = true;
            return {
                ...entry,
                characterId: entry.characterId || 'magikarp',
                character: {
                    ...baseCharacter,
                    skills: nextSkills,
                },
                updatedAt: new Date(),
                updatedBy: 'sync_magikarp_gyarados_override_patch',
            };
        });

        if (!patched) {
            throw new Error('Magikarp override entry was not found in character_overrides.');
        }

        await appState.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: nextOverrides,
                    updatedAt: new Date(),
                    updatedBy: 'sync_magikarp_gyarados_override_patch',
                },
            }
        );

        console.log('Patched live Magikarp/Gyarados override fields without replacing other override changes.');
    } finally {
        await client.close();
    }
}

syncMagikarpGyaradosOverridePatch().catch((error) => {
    console.error(error);
    process.exit(1);
});
