const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
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

const ekansMission = {
    missionId: 'ekans-venom-trial',
    title: 'Ekans Venom Trial',
    level_requirement: 8,
    rank: '8',
    reward_character: 'ekans',
    reward_character_name: 'Ekans',
    reward: 'Unlock Ekans.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/ekans/ekansfp.png',
    imageAlt: 'Ekans mission artwork',
    characterName: 'Ekans',
    portrait: 'assets/images/PokemonArena/ekans/ekansfp.png',
    portraitAlt: 'Ekans portrait',
    requirements: [
        'Ekans unlocks through a poison-pressure mission built around attrition and setup.',
        'Clear a 4-win streak with Koffing and Zubat on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'koffing', character_name: 'Koffing', wins: 8 },
        { type: 'win_matches', character_id: 'zubat', character_name: 'Zubat', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['koffing', 'zubat'],
            character_names: ['Koffing', 'Zubat'],
            wins: 4,
        },
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
    sortOrder: 8,
};

const machopMission = {
    missionId: 'machop-power-run',
    title: 'Machop Power Run',
    level_requirement: 8,
    rank: '8',
    reward_character: 'machop',
    reward_character_name: 'Machop',
    reward: 'Unlock Machop.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/machop/machopfp.png',
    imageAlt: 'Machop mission artwork',
    characterName: 'Machop',
    portrait: 'assets/images/PokemonArena/machop/machopfp.png',
    portraitAlt: 'Machop portrait',
    requirements: [
        'Machop unlocks through a bruiser mission centered on direct physical pressure.',
        'Clear a 4-win streak with Charmander and Scyther on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'charmander', character_name: 'Charmander', wins: 8 },
        { type: 'win_matches', character_id: 'scyther', character_name: 'Scyther', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['charmander', 'scyther'],
            character_names: ['Charmander', 'Scyther'],
            wins: 4,
        },
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
    sortOrder: 9,
};

const magikarpMission = {
    missionId: 'magikarp-long-climb',
    title: 'Magikarp Long Climb',
    level_requirement: 9,
    rank: '9',
    reward_character: 'magikarp',
    reward_character_name: 'Magikarp',
    reward: 'Unlock Magikarp.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/magikarp/magikarpfp.png',
    imageAlt: 'Magikarp mission artwork',
    characterName: 'Magikarp',
    portrait: 'assets/images/PokemonArena/magikarp/magikarpfp.png',
    portraitAlt: 'Magikarp portrait',
    requirements: [
        'Magikarp unlocks through a patience test built around water-team endurance.',
        'Clear a 4-win streak with Squirtle and Krabby on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'squirtle', character_name: 'Squirtle', wins: 8 },
        { type: 'win_matches', character_id: 'krabby', character_name: 'Krabby', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['squirtle', 'krabby'],
            character_names: ['Squirtle', 'Krabby'],
            wins: 4,
        },
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
    sortOrder: 10,
};

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.6',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.6 adds Ekans, Machop, and Magikarp to the roster, along with Arbok, Machoke, and Gyarados as their live evolution forms.',
        },
        {
            type: 'paragraph',
            text: 'Ekans is a poison assassin. Poison Fang mixes physical and affliction damage, Toxic snowballs every time the victim uses a new skill, Shed Skin resets enemy pressure and buys time with healing, and Crunch opens affliction-only burst before evolving Ekans into Arbok on a successful execution.',
        },
        {
            type: 'paragraph',
            text: 'Machop is a bruiser built around simple threat windows. Brick Break destroys destructible defense, Counter reflects a marked enemy\'s damage back onto them and now cleanly evolves Machop into Machoke the first time it lands, Bulk Up stores extra damage for the next Brick Break or Counter, and Taunt drags pressure straight into Machop\'s lane.',
        },
        {
            type: 'paragraph',
            text: 'Magikarp is the long-game gamble. Tackle and Flail are intentionally modest, Splash accelerates the turn counter toward Gyarados, Struggle only unlocks when the rest of Magikarp\'s kit is on cooldown, and once the 7th turn arrives the entire kit swaps into Hyper Beam, Dragon Rage, Ice Fang, and Hydro Pump.',
        },
        {
            type: 'paragraph',
            text: 'Pokemon Trainer\'s Rare Candy now also supports Ekans, Machop, and Magikarp, so Arbok, Machoke, and Gyarados can all come online immediately in evolution-focused teams.',
        },
        {
            type: 'paragraph',
            text: 'The update also refreshes Eevee into a simple all-random filler kit and includes the Bulbasaur/Solar Beam and end-turn confirmation fixes that were blocking Pokemon Arena matches.',
        },
    ],
    changes: [
        skillShowcase('ekans', 'ekans-poison-fang', 'Poison Fang gives Ekans a mixed-damage opener and permanently stacks extra venom whenever the target is already Badly Poisoned.'),
        skillShowcase('ekans', 'ekans-toxic', 'Toxic is the core scaling tool: every new enemy skill doubles the poison damage, and Arbok can push that pressure up to two stacks per target.'),
        skillShowcase('machop', 'machop-counter', 'Counter now tracks the marked enemy\'s real damage cleanly, reflects it when the mark expires, and evolves Machop into Machoke the first time it successfully hurts someone.'),
        skillShowcase('machop', 'machop-bulk-up', 'Bulk Up stores extra damage for the next Brick Break or Counter while permanently building destructible defense.'),
        skillShowcase('magikarp', 'magikarp-splash', 'Splash now matters: every cast moves Magikarp one turn closer to the Gyarados breakpoint.'),
        skillShowcase('magikarp', 'gyarados-hyper-beam', 'Once Magikarp evolves, Hyper Beam becomes the centerpiece nuke and Dragon Rage can temporarily convert it into affliction damage.'),
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
    [ekansMission, machopMission, magikarpMission].forEach((mission) => {
        missionsById.set(mission.missionId, mission);
    });
    return Array.from(missionsById.values()).sort(
        (left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0)
    );
};

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const currentComic = Array.isArray(state.releasesByArena?.comic)
        ? state.releasesByArena.comic
        : Array.isArray(state.comicReleases)
            ? state.comicReleases
            : Array.isArray(state.releases)
                ? state.releases
                : [];
    const nextPokemonIds = ['magikarp', 'machop', 'ekans'];
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-2-6-roster-wave',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemonIds.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemonIds.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_arena_roster_wave_news',
    };
};

async function syncPokemonArenaRosterWaveNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    const { createdAt: newsPostCreatedAt, ...newsPostUpdate } = newsPost;
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);
        const appState = db.collection(appStateCollectionName);

        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: newsPostUpdate, $setOnInsert: { createdAt: newsPostCreatedAt || now } },
            { upsert: true }
        );

        const existingMissionState = await appState.findOne({ key: missionsKey });
        const mergedMissions = mergeMissionCatalog(existingMissionState?.missions || []);
        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: mergedMissions,
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_arena_roster_wave_news',
                },
            },
            { upsert: true }
        );

        const existingLatestState = await appState.findOne({ key: latestReleasesKey });
        const nextLatestState = buildLatestReleasesState(existingLatestState);
        await appState.updateOne(
            { key: latestReleasesKey },
            { $set: nextLatestState },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.6 roster wave news, missions, and latest releases.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaRosterWaveNews().catch((error) => {
    console.error(error);
    process.exit(1);
});
