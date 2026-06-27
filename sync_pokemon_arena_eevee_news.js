const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const missionsKey = 'missions';

const getCharacter = (characterId) => {
    const character = characters.find(
        (entry) => entry && (entry.characterId === characterId || entry.id === characterId)
    );
    if (!character) {
        throw new Error(`Missing character: ${characterId}`);
    }
    return character;
};

const getSkill = (character, skillId) => {
    const skill = Array.isArray(character.skills)
        ? character.skills.find((entry) => entry && entry.id === skillId)
        : null;
    if (!skill) {
        throw new Error(`Missing skill ${skillId} for ${character.name}`);
    }
    return skill;
};

const skillShowcase = (characterId, skillId, text) => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType: 'new',
        characterId: character.characterId,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const now = new Date();

const eeveeMission = {
    missionId: 'eevee-evolution-path',
    title: 'Eevee Evolution Path',
    level_requirement: 1,
    rank: '1',
    reward_character: '',
    reward_character_name: 'Eevee Evolution Choice',
    reward_character_ids: ['jolteon', 'flareon', 'vaporeon'],
    reward: 'Choose Jolteon, Flareon, or Vaporeon. Eevee is permanently removed after the choice.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/eevee/eevee/1782352147199.png',
    imageAlt: 'Eevee evolution mission artwork',
    characterName: 'Eevee',
    portrait: 'assets/images/PokemonArena/eevee/eevee/eeveefp.png',
    portraitAlt: 'Eevee portrait',
    requirements: [
        'Win 25 matches with Eevee on your team.',
        'After this mission is complete, choose one evolution. This decision is permanent.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'eevee', character_name: 'Eevee', wins: 25 },
    ],
    special_pve: {
        enabled: false,
        buttonLabel: 'Start Fight',
        botName: 'Mission Bot',
        botTeamCharacterId: '',
        botTeamSize: 3,
        backgroundImage: '',
        playerTeamCharacterIds: [],
    },
    sortOrder: 4,
};

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.1',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.1 introduces Eevee and its first permanent evolution mission. Eevee joins the playable roster as a flexible Normal-type Pokemon with Dig, Swift, Hidden Power, and Protect.',
        },
        {
            type: 'paragraph',
            text: 'The Eevee Evolution Path mission asks you to win 25 matches with Eevee on your team. Completing the mission does not automatically evolve Eevee; it opens a choice between Jolteon, Flareon, and Vaporeon.',
        },
        {
            type: 'paragraph',
            text: 'That choice is permanent. When you pick an evolution, the game asks for one final confirmation, then unlocks the chosen evolution and permanently removes Eevee from your Pokemon roster.',
        },
        {
            type: 'paragraph',
            text: 'Jolteon is the fast Electric option, built around piercing pressure, cooldown paralysis, and Charge. Flareon is the Fire option, stacking permanent defense and spreading affliction damage. Vaporeon is the Water option, bringing healing, blind pressure, and Acid Armor protection.',
        },
        {
            type: 'paragraph',
            text: 'Because only one evolution can be chosen per account, the mission is meant to feel like a real team identity decision instead of a normal character unlock.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.1 introduces Eevee and its first permanent evolution mission. Eevee joins the playable roster as a flexible Normal-type Pokemon with Dig, Swift, Hidden Power, and Protect.',
        'The Eevee Evolution Path mission asks you to win 25 matches with Eevee on your team. Completing the mission does not automatically evolve Eevee; it opens a choice between Jolteon, Flareon, and Vaporeon.',
        'That choice is permanent. When you pick an evolution, the game asks for one final confirmation, then unlocks the chosen evolution and permanently removes Eevee from your Pokemon roster.',
        'Jolteon is the fast Electric option, built around piercing pressure, cooldown paralysis, and Charge. Flareon is the Fire option, stacking permanent defense and spreading affliction damage. Vaporeon is the Water option, bringing healing, blind pressure, and Acid Armor protection.',
        'Because only one evolution can be chosen per account, the mission is meant to feel like a real team identity decision instead of a normal character unlock.',
    ],
    changes: [
        skillShowcase('eevee', 'eevee-dig', 'Dig makes Eevee invulnerable for 1 turn and deals 30 damage to one enemy.'),
        skillShowcase('eevee', 'eevee-hidden-power', 'Hidden Power gains random energy, hits the enemy team, and makes the next Swift target all enemies.'),
        skillShowcase('jolteon', 'jolteon-thunderbolt', 'Thunderbolt deals piercing damage and can paralyze cooldowns when enemies keep targeting Jolteon.'),
        skillShowcase('jolteon', 'jolteon-charge', 'Charge gives Jolteon 50% unpierceable damage reduction, extra damage, and cheaper yellow-energy skills.'),
        skillShowcase('flareon', 'flareon-heating-up', 'Heating Up grants permanent destructible defense and adds steady affliction pressure to the enemy team.'),
        skillShowcase('flareon', 'flareon-fire-blast', 'Fire Blast creates a permanent burn on one enemy and splashes affliction pressure to the rest of the team.'),
        skillShowcase('vaporeon', 'vaporeon-aurora-beam', 'Aurora Beam can weaken an enemy or heal and empower Vaporeon or an ally.'),
        skillShowcase('vaporeon', 'vaporeon-acid-armor', 'Acid Armor lets Vaporeon ignore enemy skills for 1 turn and rewards enemy pressure with team healing.'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

const mergeMissionCatalog = (currentMissions = []) => {
    const missionsById = new Map(
        (Array.isArray(currentMissions) ? currentMissions : [])
            .filter((mission) => mission && mission.missionId)
            .map((mission) => [mission.missionId, mission])
    );
    missionsById.set(eeveeMission.missionId, eeveeMission);
    return Array.from(missionsById.values()).sort(
        (left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0)
    );
};

async function syncPokemonArenaEeveeNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);
        const appState = db.collection(appStateCollectionName);

        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );

        const missionState = await appState.findOne({ key: missionsKey });
        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: mergeMissionCatalog(
                        Array.isArray(missionState?.missions) ? missionState.missions : []
                    ),
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_arena_eevee_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.1 Eevee news and mission.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaEeveeNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
