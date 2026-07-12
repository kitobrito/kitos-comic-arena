const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const missionsKey = 'missions';
const releaseMigrationKey = 'release_migration:pokemon-v3-3-1-onix';

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
        groupKey: overrides.groupKey || '',
        groupName: overrides.groupName || '',
        skillId: skill.id,
        skillName: overrides.skillName || skill.name,
        skillimage: overrides.skillimage || skill.skillimage,
    };
};

const onixMission = {
    missionId: 'onix-stonewall-trial',
    title: 'Onix Stonewall Trial',
    level_requirement: 13,
    rank: '13',
    reward_character: 'onix',
    reward_character_name: 'Onix',
    reward: 'Unlock Onix.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/missionpics/onix.jpeg',
    imageAlt: 'Onix mission artwork',
    characterName: 'Onix',
    portrait: 'assets/images/PokemonArena/onix/fp.webp',
    portraitAlt: 'Onix portrait',
    requirements: [
        'Onix unlocks through a tank-focused trial built around bulk, tempo, and clean frontline play.',
        'Clear a 4-win streak with Squirtle and Machop on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'squirtle', character_name: 'Squirtle', wins: 10 },
        { type: 'win_matches', character_id: 'machop', character_name: 'Machop', wins: 10 },
        {
            type: 'win_streak_same_team',
            character_ids: ['squirtle', 'machop'],
            character_names: ['Squirtle', 'Machop'],
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
    sortOrder: 16,
};

const now = new Date();
const crystalFace = 'assets/images/PokemonArena/onix/skins/crystal/crystalfp.webp';

const newsPost = {
    title: 'Pokemon Arena Update V.3.3.1',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.3.1 adds Onix as a new tank unlock, opens his mission, and brings in the Crystal Onix skin for 750 points.',
        },
        {
            type: 'paragraph',
            text: 'Onix is built to be a true frontliner. Sturdy keeps him alive at 1 HP the first time he would fall and completely ignores execute effects, giving the Pokemon roster a different kind of tank from the bruisers already in the mode.',
        },
        {
            type: 'paragraph',
            text: 'Rock Throw spreads pressure across the enemy team and sets up a stronger Iron Tail. Iron Tail permanently increases Onix’s damage reduction while still giving him a clean single-target hit so the tank slot can keep scaling instead of only stalling.',
        },
        {
            type: 'paragraph',
            text: 'Stealth Rock is Onix’s control tool. It punishes new skill usage by increasing cooldowns, lowering non-affliction damage for the turn, and building toward a stronger piercing burst when the mark expires.',
        },
        {
            type: 'paragraph',
            text: 'Harden finishes the kit by taunting the enemy team, adding temporary Shield, and converting up to 10 of Iron Tail’s reduction into unpierceable defense for the turn.',
        },
        {
            type: 'paragraph',
            text: 'This release also opens the Onix Stonewall Trial mission and adds Crystal Onix to the skin shop for 750 points with a full alternate portrait and complete skill-art set.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.3.1 adds Onix as a new tank unlock, opens his mission, and brings in the Crystal Onix skin for 750 points.',
        'Onix is built to be a true frontliner. Sturdy keeps him alive at 1 HP the first time he would fall and completely ignores execute effects, giving the Pokemon roster a different kind of tank from the bruisers already in the mode.',
        'Rock Throw spreads pressure across the enemy team and sets up a stronger Iron Tail. Iron Tail permanently increases Onix’s damage reduction while still giving him a clean single-target hit so the tank slot can keep scaling instead of only stalling.',
        'Stealth Rock is Onix’s control tool. It punishes new skill usage by increasing cooldowns, lowering non-affliction damage for the turn, and building toward a stronger piercing burst when the mark expires.',
        'Harden finishes the kit by taunting the enemy team, adding temporary Shield, and converting up to 10 of Iron Tail’s reduction into unpierceable defense for the turn.',
        'This release also opens the Onix Stonewall Trial mission and adds Crystal Onix to the skin shop for 750 points with a full alternate portrait and complete skill-art set.',
    ],
    changes: [
        skillShowcase(
            'onix',
            'onix-rock-throw',
            'Rock Throw gives Onix immediate team pressure and sets up the stronger Iron Tail follow-up.',
            'new',
            {
                groupKey: 'onix-base-showcase',
                groupName: 'Onix',
            }
        ),
        skillShowcase(
            'onix',
            'onix-iron-tail',
            'Iron Tail permanently stacks Onix’s damage reduction while still landing a real single-target hit.',
            'new',
            {
                groupKey: 'onix-base-showcase',
                groupName: 'Onix',
            }
        ),
        skillShowcase(
            'onix',
            'onix-stealth-rock',
            'Stealth Rock turns enemy skill usage into cooldown pressure, damage suppression, and a delayed piercing burst.',
            'new',
            {
                groupKey: 'onix-base-showcase',
                groupName: 'Onix',
            }
        ),
        skillShowcase(
            'onix',
            'onix-harden',
            'Harden lets Onix pull focus, gain Shield, and convert part of Iron Tail’s defense into unpierceable reduction.',
            'new',
            {
                groupKey: 'onix-base-showcase',
                groupName: 'Onix',
            }
        ),
        skillShowcase(
            'onix',
            'onix-passive-sturdy',
            'Sturdy keeps Onix at 1 HP the first time he would be defeated and ignores execute effects completely.',
            'new',
            {
                groupKey: 'onix-base-showcase',
                groupName: 'Onix',
            }
        ),
        skillShowcase(
            'onix',
            'onix-rock-throw',
            'Crystal Onix arrives in the skin shop with a dedicated portrait before the rest of the blue crystal skill set.',
            'new',
            {
                facePicture: crystalFace,
                groupKey: 'onix-crystal-showcase',
                groupName: 'Crystal Onix Skin',
                skillName: 'Crystal Onix Portrait',
                skillimage: crystalFace,
            }
        ),
        skillShowcase(
            'onix',
            'onix-rock-throw',
            'Rock Throw gets full Crystal Onix art as part of the 750-point skin set.',
            'new',
            {
                facePicture: crystalFace,
                groupKey: 'onix-crystal-showcase',
                groupName: 'Crystal Onix Skin',
                skillimage: 'assets/images/PokemonArena/onix/skins/crystal/crystalrockthrow.webp',
            }
        ),
        skillShowcase(
            'onix',
            'onix-iron-tail',
            'Iron Tail keeps the skin set going with its own crystal-blue combat art.',
            'new',
            {
                facePicture: crystalFace,
                groupKey: 'onix-crystal-showcase',
                groupName: 'Crystal Onix Skin',
                skillimage: 'assets/images/PokemonArena/onix/skins/crystal/crystalirontail.webp',
            }
        ),
        skillShowcase(
            'onix',
            'onix-stealth-rock',
            'Stealth Rock is also fully reskinned for Crystal Onix.',
            'new',
            {
                facePicture: crystalFace,
                groupKey: 'onix-crystal-showcase',
                groupName: 'Crystal Onix Skin',
                skillimage: 'assets/images/PokemonArena/onix/skins/crystal/crystalstealthrock.webp',
            }
        ),
        skillShowcase(
            'onix',
            'onix-harden',
            'Harden gets matching crystal art so the defensive half of the kit is covered too.',
            'new',
            {
                facePicture: crystalFace,
                groupKey: 'onix-crystal-showcase',
                groupName: 'Crystal Onix Skin',
                skillimage: 'assets/images/PokemonArena/onix/skins/crystal/crystalharden.webp',
            }
        ),
        skillShowcase(
            'onix',
            'onix-passive-sturdy',
            'Sturdy completes the Crystal Onix package with its own passive icon card.',
            'new',
            {
                facePicture: crystalFace,
                groupKey: 'onix-crystal-showcase',
                groupName: 'Crystal Onix Skin',
                skillimage: 'assets/images/PokemonArena/onix/skins/crystal/crystalpassive.webp',
            }
        ),
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
    missionsById.set(onixMission.missionId, onixMission);
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
    const nextPokemonIds = ['onix', 'aerodactyl', 'magnemite'];
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-3-1-onix',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemonIds.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemonIds.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_onix_news',
    };
};

async function syncPokemonOnixRelease(db) {
    if (!db) {
        throw new Error('A MongoDB database connection is required.');
    }
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    const completedMigration = await appState.findOne({ key: releaseMigrationKey });
    if (completedMigration?.completed) {
        return { migrated: false };
    }

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
                updatedBy: 'sync_pokemon_onix_news',
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

    await appState.updateOne(
        { key: releaseMigrationKey },
        {
            $set: {
                key: releaseMigrationKey,
                completed: true,
                completedAt: new Date(),
                updatedBy: 'sync_pokemon_onix_news',
            },
        },
        { upsert: true }
    );
    return { migrated: true };
}

async function syncPokemonOnixNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonOnixRelease(client.db(dbName));
        console.log(result.migrated
            ? 'Synced Pokemon Arena Update V.3.3.1 news, Onix mission, and latest releases.'
            : 'Pokemon Arena Update V.3.3.1 was already synced.');
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonOnixNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    mergeMissionCatalog,
    newsPost,
    onixMission,
    syncPokemonOnixNews,
    syncPokemonOnixRelease,
};
