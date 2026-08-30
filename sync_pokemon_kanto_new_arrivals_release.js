const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');
const { ensureRequiredMissionCatalogEntries } = require('./server');

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

const skillShowcase = (characterId, skillId, text, changeType = 'new', overrides = {}) => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType,
        characterId: character.characterId,
        characterName: character.name,
        facePicture: overrides.facePicture || character.facePicture,
        groupKey: overrides.groupKey || `${character.characterId}-base-showcase`,
        groupName: overrides.groupName || character.name,
        skillId: skill.id,
        skillName: overrides.skillName || skill.name,
        skillimage: overrides.skillimage || skill.skillimage,
    };
};

const marowakMission = {
    missionId: 'marowak-bone-club-trial',
    title: 'Marowak Bone Club Trial',
    level_requirement: 19,
    rank: '19',
    reward_character: 'marowak',
    reward_character_name: 'Marowak',
    reward: 'Unlock Marowak.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/BIB/marowak.png',
    imageAlt: 'Marowak mission artwork',
    characterName: 'Marowak',
    portrait: 'assets/images/PokemonArena/marowak/facepicture.jpg',
    portraitAlt: 'Marowak portrait',
    requirements: [
        'Marowak unlocks through a bruiser trial built around Aerodactyl and Onix, the roster\'s two most recently proven bruisers.',
        'Clear a 4-win streak with Aerodactyl and Onix on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'aerodactyl', character_name: 'Aerodactyl', wins: 8 },
        { type: 'win_matches', character_id: 'onix', character_name: 'Onix', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['aerodactyl', 'onix'],
            character_names: ['Aerodactyl', 'Onix'],
            wins: 4,
        },
    ],
    available: true,
    sortOrder: 19,
};

const pinsirMission = {
    missionId: 'pinsir-guillotine-trial',
    title: 'Pinsir Guillotine Trial',
    level_requirement: 20,
    rank: '20',
    reward_character: 'pinsir',
    reward_character_name: 'Pinsir',
    reward: 'Unlock Pinsir.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/BIB/pinsir.webp',
    imageAlt: 'Pinsir mission artwork',
    characterName: 'Pinsir',
    portrait: 'assets/images/PokemonArena/pinsir/facepicture.jpg',
    portraitAlt: 'Pinsir portrait',
    requirements: [
        'Pinsir unlocks through a gambler\'s trial built around Aerodactyl and Onix, the roster\'s two most recently proven bruisers.',
        'Clear a 4-win streak with Aerodactyl and Onix on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'aerodactyl', character_name: 'Aerodactyl', wins: 8 },
        { type: 'win_matches', character_id: 'onix', character_name: 'Onix', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['aerodactyl', 'onix'],
            character_names: ['Aerodactyl', 'Onix'],
            wins: 4,
        },
    ],
    available: true,
    sortOrder: 20,
};

const tourosMission = {
    missionId: 'tauros-rampage-trial',
    title: 'Tauros Rampage Trial',
    level_requirement: 14,
    rank: '14',
    reward_character: 'tauros',
    reward_character_name: 'Tauros',
    reward: 'Unlock Tauros.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/BIB/tauros.webp',
    imageAlt: 'Tauros mission artwork',
    characterName: 'Tauros',
    portrait: 'assets/images/PokemonArena/tauros/facepicture.jpg',
    portraitAlt: 'Tauros portrait',
    requirements: [
        'Tauros unlocks through a rampage trial built around Aerodactyl and Onix, the roster\'s two most recently proven bruisers.',
        'Clear a 4-win streak with Aerodactyl and Onix on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'aerodactyl', character_name: 'Aerodactyl', wins: 8 },
        { type: 'win_matches', character_id: 'onix', character_name: 'Onix', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['aerodactyl', 'onix'],
            character_names: ['Aerodactyl', 'Onix'],
            wins: 4,
        },
    ],
    available: true,
    sortOrder: 17,
};

const darkraiMission = {
    missionId: 'darkrai-nightmare-trial',
    title: 'Darkrai Nightmare Trial',
    level_requirement: 18,
    rank: '18',
    reward_character: 'darkrai',
    reward_character_name: 'Darkrai',
    reward: 'Unlock Darkrai.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/BIB/darkrai.png',
    imageAlt: 'Darkrai mission artwork',
    characterName: 'Darkrai',
    portrait: 'assets/images/PokemonArena/darkrai/facepicture.jpg',
    portraitAlt: 'Darkrai portrait',
    requirements: [
        'Darkrai unlocks through a nightmare trial built around Aerodactyl and Onix, the roster\'s two most recently proven bruisers.',
        'Clear a 4-win streak with Aerodactyl and Onix on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'aerodactyl', character_name: 'Aerodactyl', wins: 8 },
        { type: 'win_matches', character_id: 'onix', character_name: 'Onix', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['aerodactyl', 'onix'],
            character_names: ['Aerodactyl', 'Onix'],
            wins: 4,
        },
    ],
    available: true,
    sortOrder: 18,
};

const NEW_ARRIVAL_MISSIONS = [marowakMission, pinsirMission, tourosMission, darkraiMission];

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena: New Arrivals - Marowak, Pinsir, Tauros & Darkrai',
    blocks: [
        {
            type: 'paragraph',
            text: 'Four new Pokemon join the arena in this update: Marowak, Pinsir, Tauros, and Darkrai. Each opens its own unlock mission and comes with a complete kit and art set.',
        },
        {
            type: 'paragraph',
            text: 'Marowak is a Ground-type bruiser who equips a bone club to unlock his whole kit. Bone Club grants damage reduction that decays as he takes hits; Bone Rush spends it for a 2-4 hit flurry; Bonemerang hits twice across two turns and fully stuns a repeat target; Bone Guard grants a turn of invulnerability.',
        },
        {
            type: 'paragraph',
            text: 'Pinsir is a snowballing Bug-type gambler built entirely around Guillotine. Vice Grip, Seismic Toss, X-Scissor, and Rock Tomb all feed Guillotine\'s hit chance, and the first successful Guillotine permanently evolves him into Mega Pinsir - healing him, granting unpierceable defense, and upgrading Vice Grip into Struggle Bug.',
        },
        {
            type: 'paragraph',
            text: 'Tauros is a headstrong Normal-type bruiser. Horn Attack strips shield and damage reduction while stunning physical skills; Take-Down trades his own health for damage reduction and a cheaper Horn Attack; Earthquake is a channeled skill that batters everyone else on the field for 4 escalating turns while bypassing invulnerability; and STAMPEDE! locks down the enemy team for two full turns.',
        },
        {
            type: 'paragraph',
            text: 'Darkrai is a Dark-type controller built around Nightmare. Dark Void deals affliction damage and leaves a Barrier that turns into a stun if it goes unspent; Bad Dreams punishes every nightmared enemy every turn; Shadow Sneak deals bonus damage to nightmared targets and bypasses invulnerability; and Dark Portal makes Darkrai untouchable for as long as his target keeps dreaming.',
        },
        {
            type: 'paragraph',
            text: 'All four missions are live now - clear a 4-win streak with Aerodactyl and Onix on the same team to prove yourself before taking on each trial.',
        },
    ],
    paragraphs: [
        'Four new Pokemon join the arena in this update: Marowak, Pinsir, Tauros, and Darkrai. Each opens its own unlock mission and comes with a complete kit and art set.',
        'Marowak is a Ground-type bruiser who equips a bone club to unlock his whole kit. Bone Club grants damage reduction that decays as he takes hits; Bone Rush spends it for a 2-4 hit flurry; Bonemerang hits twice across two turns and fully stuns a repeat target; Bone Guard grants a turn of invulnerability.',
        'Pinsir is a snowballing Bug-type gambler built entirely around Guillotine. Vice Grip, Seismic Toss, X-Scissor, and Rock Tomb all feed Guillotine\'s hit chance, and the first successful Guillotine permanently evolves him into Mega Pinsir - healing him, granting unpierceable defense, and upgrading Vice Grip into Struggle Bug.',
        'Tauros is a headstrong Normal-type bruiser. Horn Attack strips shield and damage reduction while stunning physical skills; Take-Down trades his own health for damage reduction and a cheaper Horn Attack; Earthquake is a channeled skill that batters everyone else on the field for 4 escalating turns while bypassing invulnerability; and STAMPEDE! locks down the enemy team for two full turns.',
        'Darkrai is a Dark-type controller built around Nightmare. Dark Void deals affliction damage and leaves a Barrier that turns into a stun if it goes unspent; Bad Dreams punishes every nightmared enemy every turn; Shadow Sneak deals bonus damage to nightmared targets and bypasses invulnerability; and Dark Portal makes Darkrai untouchable for as long as his target keeps dreaming.',
        'All four missions are live now - clear a 4-win streak with Aerodactyl and Onix on the same team to prove yourself before taking on each trial.',
    ],
    changes: [
        skillShowcase('marowak', 'marowak-bone-club', 'Bone Club equips Marowak\'s whole kit and grants decaying damage reduction.'),
        skillShowcase('marowak', 'marowak-bone-rush', 'Bone Rush spends Bone Club for a 2-4 hit flurry.'),
        skillShowcase('marowak', 'marowak-bonemerang', 'Bonemerang hits twice across two turns and can fully stun a repeat target.'),
        skillShowcase('marowak', 'marowak-bone-guard', 'Bone Guard grants Marowak a turn of invulnerability.'),
        skillShowcase('pinsir', 'pinsir-vice-grip', 'Vice Grip disables damage reduction and invulnerability while feeding Guillotine\'s hit chance.'),
        skillShowcase('pinsir', 'pinsir-seismic-toss', 'Pinsir Seismic Toss sets a counter on himself or an enemy that also boosts Guillotine.'),
        skillShowcase('pinsir', 'pinsir-x-scissor', 'X-Scissor is a reliable piercing hit that crits guaranteed against marked targets.'),
        skillShowcase('pinsir', 'pinsir-rock-tomb', 'Rock Tomb grants invulnerability and permanent destructible defense that keeps feeding Guillotine.'),
        skillShowcase('pinsir', 'pinsir-mega-pinsir-passive', 'The first successful Guillotine permanently evolves Pinsir into Mega Pinsir.'),
        skillShowcase('tauros', 'tauros-horn-attack', 'Horn Attack strips shield and damage reduction while stunning physical skills.'),
        skillShowcase('tauros', 'tauros-take-down', 'Take-Down trades health for damage reduction and a cheaper Horn Attack.'),
        skillShowcase('tauros', 'tauros-earthquake', 'Earthquake is a channeled, invulnerability-bypassing hit to everyone else on the field over 4 escalating turns.'),
        skillShowcase('tauros', 'tauros-stampede', 'STAMPEDE! locks down the entire enemy team for two full turns.'),
        skillShowcase('darkrai', 'darkrai-dark-void', 'Dark Void deals affliction damage and leaves a Barrier that turns into Nightmare if unspent.'),
        skillShowcase('darkrai', 'darkrai-bad-dreams', 'Bad Dreams punishes every nightmared enemy every turn.'),
        skillShowcase('darkrai', 'darkrai-shadow-sneak', 'Shadow Sneak deals bonus damage to nightmared targets and bypasses invulnerability.'),
        skillShowcase('darkrai', 'darkrai-dark-portal', 'Dark Portal makes Darkrai untouchable for as long as his target keeps dreaming.'),
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
    NEW_ARRIVAL_MISSIONS.forEach((mission) => missionsById.set(mission.missionId, mission));
    const merged = Array.from(missionsById.values()).sort(
        (left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0)
    );
    return ensureRequiredMissionCatalogEntries(merged);
};

// Latest-releases ticker shows 3 of these 4 (Marowak omitted here - swap freely,
// the ticker is cosmetic and every character is unlockable via its mission
// regardless of whether it appears in this list).
const NEW_ARRIVAL_LATEST_RELEASE_IDS = ['pinsir', 'tauros', 'darkrai'];

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const currentComic = Array.isArray(state.releasesByArena?.comic)
        ? state.releasesByArena.comic
        : Array.isArray(state.comicReleases)
          ? state.comicReleases
          : Array.isArray(state.releases)
            ? state.releases
            : [];
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-kanto-new-arrivals-v1',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: NEW_ARRIVAL_LATEST_RELEASE_IDS.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: NEW_ARRIVAL_LATEST_RELEASE_IDS.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_kanto_new_arrivals_release',
    };
};

async function syncPokemonKantoNewArrivalsRelease() {
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
                    updatedBy: 'sync_pokemon_kanto_new_arrivals_release',
                },
            },
            { upsert: true }
        );

        const latestReleasesState = await appState.findOne({ key: latestReleasesKey });
        await appState.updateOne(
            { key: latestReleasesKey },
            { $set: buildLatestReleasesState(latestReleasesState) },
            { upsert: true }
        );

        console.log('Synced New Arrivals news post, 4 missions (Marowak, Pinsir, Tauros, Darkrai), and latest releases.');
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonKantoNewArrivalsRelease().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    mergeMissionCatalog,
    newsPost,
    NEW_ARRIVAL_MISSIONS,
    syncPokemonKantoNewArrivalsRelease,
};
