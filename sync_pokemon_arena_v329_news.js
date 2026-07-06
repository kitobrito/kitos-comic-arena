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

const skillShowcase = (characterId, skillId, text, changeType = 'new') => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType,
        characterId: character.characterId,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const hitmonchanMission = {
    missionId: 'hitmonchan-power-grid',
    title: 'Hitmonchan Power Grid',
    level_requirement: 11,
    rank: '11',
    reward_character: 'hitmonchan',
    reward_character_name: 'Hitmonchan',
    reward: 'Unlock Hitmonchan.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/hitmonchan/fp.webp',
    imageAlt: 'Hitmonchan mission artwork',
    characterName: 'Hitmonchan',
    portrait: 'assets/images/PokemonArena/hitmonchan/fp.webp',
    portraitAlt: 'Hitmonchan portrait',
    requirements: [
        'Hitmonchan unlocks through a tempo-and-combo mission built around pressure and precision.',
        'Clear a 4-win streak with Machop and Pikachu on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'machop', character_name: 'Machop', wins: 10 },
        { type: 'win_matches', character_id: 'pikachu', character_name: 'Pikachu', wins: 10 },
        {
            type: 'win_streak_same_team',
            character_ids: ['machop', 'pikachu'],
            character_names: ['Machop', 'Pikachu'],
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
    sortOrder: 12,
};

const hitmonleeMission = {
    missionId: 'hitmonlee-kick-circuit',
    title: 'Hitmonlee Kick Circuit',
    level_requirement: 12,
    rank: '12',
    reward_character: 'hitmonlee',
    reward_character_name: 'Hitmonlee',
    reward: 'Unlock Hitmonlee.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/hitmonlee/fp.webp',
    imageAlt: 'Hitmonlee mission artwork',
    characterName: 'Hitmonlee',
    portrait: 'assets/images/PokemonArena/hitmonlee/fp.webp',
    portraitAlt: 'Hitmonlee portrait',
    requirements: [
        'Hitmonlee unlocks through a pressure mission built around physical momentum and clean finishers.',
        'Clear a 4-win streak with Machop and Scyther on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'machop', character_name: 'Machop', wins: 10 },
        { type: 'win_matches', character_id: 'scyther', character_name: 'Scyther', wins: 10 },
        {
            type: 'win_streak_same_team',
            character_ids: ['machop', 'scyther'],
            character_names: ['Machop', 'Scyther'],
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
    sortOrder: 13,
};

const magnemiteMission = {
    missionId: 'magnemite-magnet-rise',
    title: 'Magnemite Magnet Rise',
    level_requirement: 12,
    rank: '12',
    reward_character: 'magnemite',
    reward_character_name: 'Magnemite',
    reward: 'Unlock Magnemite.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/mangemite/magnemitefp.webp',
    imageAlt: 'Magnemite mission artwork',
    characterName: 'Magnemite',
    portrait: 'assets/images/PokemonArena/mangemite/magnemitefp.webp',
    portraitAlt: 'Magnemite portrait',
    requirements: [
        'Magnemite unlocks through a control mission built around electric pressure and clean setup.',
        'Clear a 4-win streak with Pikachu and Abra on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'pikachu', character_name: 'Pikachu', wins: 10 },
        { type: 'win_matches', character_id: 'abra', character_name: 'Abra', wins: 10 },
        {
            type: 'win_streak_same_team',
            character_ids: ['pikachu', 'abra'],
            character_names: ['Pikachu', 'Abra'],
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
    sortOrder: 14,
};

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.9',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.9 adds Hitmonchan, Hitmonlee, and Magnemite to the roster, plus Magneton as Magnemite’s live evolution form.',
        },
        {
            type: 'paragraph',
            text: 'Hitmonchan arrives as a combo bruiser. Thunder Punch, Fire Punch, and Ice Punch each prime Mega Punch for heavier follow-up damage, so the whole kit rewards mixing elements before cashing out.',
        },
        {
            type: 'paragraph',
            text: 'Hitmonlee comes in as a momentum striker. Double Kick and Low Kick keep swapping each other in and out, Focus Energy loads a huge crit window, and High Jump Kick stays risky enough to swing games both ways.',
        },
        {
            type: 'paragraph',
            text: 'Magnemite rounds the trio out with a new Electric-Steel evolution line. Spark and Thunder Wave become the setup pair, Magnet Rise creates the safe window, and using both setup skills during that window evolves Magnemite into Magneton while restoring 10 HP.',
        },
        {
            type: 'paragraph',
            text: 'This release also opens three new Pokemon Arena missions, one for each of these roster additions, and the latest releases strip now points at Magnemite, Hitmonlee, and Hitmonchan.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.9 adds Hitmonchan, Hitmonlee, and Magnemite to the roster, plus Magneton as Magnemite’s live evolution form.',
        'Hitmonchan arrives as a combo bruiser. Thunder Punch, Fire Punch, and Ice Punch each prime Mega Punch for heavier follow-up damage, so the whole kit rewards mixing elements before cashing out.',
        'Hitmonlee comes in as a momentum striker. Double Kick and Low Kick keep swapping each other in and out, Focus Energy loads a huge crit window, and High Jump Kick stays risky enough to swing games both ways.',
        'Magnemite rounds the trio out with a new Electric-Steel evolution line. Spark and Thunder Wave become the setup pair, Magnet Rise creates the safe window, and using both setup skills during that window evolves Magnemite into Magneton while restoring 10 HP.',
        'This release also opens three new Pokemon Arena missions, one for each of these roster additions, and the latest releases strip now points at Magnemite, Hitmonlee, and Hitmonchan.',
    ],
    changes: [
        skillShowcase('hitmonchan', 'hitmonchan-thunder-punch', 'Thunder Punch deals piercing damage, paralyzes cooldowns, and adds to the next Mega Punch.'),
        skillShowcase('hitmonchan', 'hitmonchan-mega-punch', 'Mega Punch cashes in every stored elemental punch bonus, then clears the stack back to zero.'),
        skillShowcase('hitmonlee', 'hitmonlee-double-kick', 'Double Kick now handles the opener side of Hitmonlee’s stance cycle before flipping into Low Kick.'),
        skillShowcase('hitmonlee', 'hitmonlee-high-jump-kick', 'High Jump Kick remains the high-risk finisher, with the miss penalty still intact when Hitmonlee whiffs.'),
        skillShowcase('magnemite', 'magnemite-spark', 'Spark gives Magnemite immediate piercing spread pressure and becomes a triple-cast sweep after Magneton evolves.'),
        skillShowcase('magnemite', 'magnemite-thunder-wave', 'Thunder Wave locks non-mental skills, freezes cooldowns, and loads Spark for bonus damage.'),
        skillShowcase('magnemite', 'magnemite-swift', 'Swift now costs 2 Random and deals 30 damage while still setting up extra piercing punishment on the target.'),
        skillShowcase('magnemite', 'magneton-flash-cannon', 'Flash Cannon replaces Swift after evolution, jumping to 45 damage at 3 Random while keeping the piercing follow-up effect.'),
        skillShowcase('magnemite', 'magnemite-passive-evolution-magneton', 'Magnemite evolves into Magneton by using both Spark and Thunder Wave during Magnet Rise, and the evolution heals 10 HP on trigger.'),
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
    missionsById.delete('hitmons-magnemite-power-grid');
    missionsById.set(hitmonchanMission.missionId, hitmonchanMission);
    missionsById.set(hitmonleeMission.missionId, hitmonleeMission);
    missionsById.set(magnemiteMission.missionId, magnemiteMission);
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
    const nextPokemonIds = ['magnemite', 'hitmonlee', 'hitmonchan'];
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-2-9-magnemite-hitmons',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemonIds.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemonIds.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_arena_v329_news',
    };
};

async function syncPokemonArenaV329News() {
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
                    updatedBy: 'sync_pokemon_arena_v329_news',
                },
            },
            { upsert: true }
        );

        const latestReleasesState = await appState.findOne({ key: latestReleasesKey });
        await appState.updateOne(
            { key: latestReleasesKey },
            {
                $set: buildLatestReleasesState(latestReleasesState),
            },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.9 news, mission, and latest releases.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaV329News().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
