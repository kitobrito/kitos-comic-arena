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

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.0',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.0 brings four new characters into the roster: Zubat, Gastly, Abra, and Scyther.',
        },
        {
            type: 'paragraph',
            text: 'Zubat is a life-draining nuisance that grows into Golbat after stealing 50 total HP. Leech Life steals HP and can punish enemies for trying new skills, Supersonic makes enemy casts fail, Bite primes the next Leech Life, and Draining Fangs turns the bat into an energy thief.',
        },
        {
            type: 'paragraph',
            text: 'Gastly enters as a missing-health Ghost type that gets stronger the more it has been hurt. Lick scales its stun pressure from missing HP, Curse marks a target with unavoidable damage over time, Spite clamps enemy output while boosting affliction damage taken, and Glare punishes skill usage before Haunter upgrades the full kit.',
        },
        {
            type: 'paragraph',
            text: 'Abra keeps things simple until Calm Mind has been used three times, then evolves into Kadabra. Future Sight sets up delayed damage, Psychic hits harder when that mark is active, Calm Mind builds defense and damage, and Teleport keeps Abra or an ally safe for a turn.',
        },
        {
            type: 'paragraph',
            text: 'Scyther has arrived as a Pokemon Arena roster character, and his kit is meant to feel fast, sharp, and worth choosing right away. Gastly\'s Haunted Tower mission is still here as the rank 6 grindy challenge, so Pokemon Arena has both a starter spike and a long-term mission ladder to chase.',
        },
        {
            type: 'paragraph',
            text: 'The latest Pokemon releases panel now features Zubat, Gastly, and Abra, which keeps the release board aligned with the new wave of Pokemon Arena content.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.0 brings four new characters into the roster: Zubat, Gastly, Abra, and Scyther.',
        'Zubat is a life-draining nuisance that grows into Golbat after stealing 50 total HP. Leech Life steals HP and can punish enemies for trying new skills, Supersonic makes enemy casts fail, Bite primes the next Leech Life, and Draining Fangs turns the bat into an energy thief.',
        'Gastly enters as a missing-health Ghost type that gets stronger the more it has been hurt. Lick scales its stun pressure from missing HP, Curse marks a target with unavoidable damage over time, Spite clamps enemy output while boosting affliction damage taken, and Glare punishes skill usage before Haunter upgrades the full kit.',
        'Abra keeps things simple until Calm Mind has been used three times, then evolves into Kadabra. Future Sight sets up delayed damage, Psychic hits harder when that mark is active, Calm Mind builds defense and damage, and Teleport keeps Abra or an ally safe for a turn.',
        'Scyther has arrived as a Pokemon Arena roster character, and his kit is meant to feel fast, sharp, and worth choosing right away. Gastly\'s Haunted Tower mission is still here as the rank 6 grindy challenge, so Pokemon Arena has both a starter spike and a long-term mission ladder to chase.',
        'The latest Pokemon releases panel now features Zubat, Gastly, and Abra, which keeps the release board aligned with the new wave of Pokemon Arena content.',
    ],
    changes: [
        skillShowcase('zubat', 'zubat-leech-life', 'Leech Life steals 10 HP, gains another 10 HP against Supersonic targets, and can also convert a target\'s next skill into extra Zubat healing and damage.'),
        skillShowcase('zubat', 'zubat-supersonic', 'Supersonic gives an enemy a 40% chance to fail any skill they use, and failed casts cost them 15 HP.'),
        skillShowcase('zubat', 'zubat-bite', 'Bite deals 20 damage and sets up the next Leech Life to steal 10 extra HP.'),
        skillShowcase('zubat', 'zubat-draining-fangs', 'Draining Fangs makes Leech Life and Bite remove random energy, or steal it outright once Zubat evolves.'),
        skillShowcase('zubat', 'zubat-passive-evolution-golbat', 'Evolution - Golbat triggers after Zubat has stolen 50 total HP and upgrades the whole kit.'),
        skillShowcase('gastly', 'gastly-lick', 'Lick deals 20 affliction damage and scales its harmful-skill stun chance from the amount of HP Gastly is missing.'),
        skillShowcase('gastly', 'gastly-curse', 'Curse permanently marks one enemy and burns them for 15 affliction damage every turn while also costing Gastly 35 HP.'),
        skillShowcase('gastly', 'gastly-spite', 'Spite keeps an enemy\'s damage in check while making affliction attacks hit harder.'),
        skillShowcase('gastly', 'gastly-glare', 'Glare guard breaks an enemy, paralyzes cooldowns, and punishes new skill usage with extra affliction damage.'),
        skillShowcase('gastly', 'gastly-passive-evolution-haunter', 'Evolution - Haunter triggers after Gastly has lost 50 total HP and unlocks the improved kit.'),
        skillShowcase('abra', 'abra-future-sight', 'Future Sight marks an enemy and detonates when the mark expires.'),
        skillShowcase('abra', 'abra-psychic', 'Psychic hits harder when Future Sight is already lined up on the same target.'),
        skillShowcase('abra', 'abra-calm-mind', 'Calm Mind builds damage reduction and damage at the same time, and it now feeds Abra\'s evolution tracker.'),
        skillShowcase('abra', 'abra-teleport', 'Teleport makes Abra or an ally invulnerable for a turn so the team can reset the pace of battle.'),
        skillShowcase('abra', 'abra-passive-evolution-kadabra', 'Evolution - Kadabra triggers after Abra has used Calm Mind three times.'),
        skillShowcase('scyther', 'scyther-fury-cutter', 'Fury Cutter permanently gains damage every time it is used, which makes Scyther a strong roster pick right away.'),
        skillShowcase('scyther', 'scyther-swords-dance', 'Swords Dance gives Scyther a real burst window by boosting all damaging skills for 3 turns.'),
        skillShowcase('scyther', 'scyther-x-cutter', 'X-Cutter lands a heavy piercing hit and can spike much harder against low HP enemies or during Swords Dance.'),
        skillShowcase('scyther', 'scyther-double-team', 'Double Team gives Scyther full evasion for a turn and can extend itself when Scyther picks up a kill.'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

const gastlyMission = {
    missionId: 'gastly-haunted-tower',
    title: 'The Haunted Tower',
    level_requirement: 6,
    rank: '6',
    reward_character: 'gastly',
    reward_character_name: 'Gastly',
    reward: 'Unlock Gastly.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/gastley/gastleymissionpic.jpeg',
    imageAlt: 'Gastly mission artwork',
    characterName: 'Gastly',
    portrait: 'assets/images/PokemonArena/gastley/gastleyfp.webp',
    portraitAlt: 'Gastly portrait',
    requirements: [
        'A grindy early Pokemon mission that asks for patience before it pays out.',
        'Clear a 4-win streak with Zubat and Abra on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'chansey', character_name: 'Chansey', wins: 8 },
        { type: 'win_matches', character_id: 'koffing', character_name: 'Koffing', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['zubat', 'abra'],
            character_names: ['Zubat', 'Abra'],
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
    sortOrder: 6,
};

const starterMissions = [
    {
        missionId: 'squirtle-starter-path',
        title: 'Squirtle Starter Path',
        level_requirement: 1,
        rank: '1',
        reward_character: 'squirtle',
        reward_character_name: 'Squirtle',
        reward: 'Unlock Squirtle.',
        arena: 'pokemon',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: '', character_name: '', wins: 0 },
        image: 'assets/images/PokemonArena/squirtlemissionpic.jpeg',
        imageAlt: 'Squirtle starter mission artwork',
        characterName: 'Squirtle',
        portrait: 'assets/images/PokemonArena/squirtle/squirtlefp.jpg',
        portraitAlt: 'Squirtle portrait',
        requirements: ['Choose a starter when you first enter Pokemon Arena.'],
        goals: [
            { type: 'win_matches', character_id: 'bulbasaur', character_name: 'Bulbasaur', wins: 16 },
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
        sortOrder: 1,
    },
    {
        missionId: 'charmander-starter-path',
        title: 'Charmander Starter Path',
        level_requirement: 1,
        rank: '1',
        reward_character: 'charmander',
        reward_character_name: 'Charmander',
        reward: 'Unlock Charmander.',
        arena: 'pokemon',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: '', character_name: '', wins: 0 },
        image: 'assets/images/PokemonArena/charmandermissionpic.jpeg',
        imageAlt: 'Charmander starter mission artwork',
        characterName: 'Charmander',
        portrait: 'assets/images/PokemonArena/Charmander/charmanderfp.jpg',
        portraitAlt: 'Charmander portrait',
        requirements: ['Choose a starter when you first enter Pokemon Arena.'],
        goals: [
            { type: 'win_matches', character_id: 'squirtle', character_name: 'Squirtle', wins: 16 },
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
        sortOrder: 2,
    },
    {
        missionId: 'pikachu-starter-path',
        title: 'Pikachu Starter Path',
        level_requirement: 1,
        rank: '1',
        reward_character: 'pikachu',
        reward_character_name: 'Pikachu',
        reward: 'Unlock Pikachu.',
        arena: 'pokemon',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: '', character_name: '', wins: 0 },
        image: 'assets/images/PokemonArena/newpikachufp.jpeg',
        imageAlt: 'Pikachu starter mission artwork',
        characterName: 'Pikachu',
        portrait: 'assets/images/PokemonArena/Pikachu/pikachufp.jpeg',
        portraitAlt: 'Pikachu portrait',
        requirements: ['Choose a starter when you first enter Pokemon Arena.'],
        goals: [
            { type: 'win_matches', character_id: 'pidgey', character_name: 'Pidgey', wins: 16 },
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
        sortOrder: 3,
    },
    {
        missionId: 'bulbasaur-starter-path',
        title: 'Bulbasaur Starter Path',
        level_requirement: 1,
        rank: '1',
        reward_character: 'bulbasaur',
        reward_character_name: 'Bulbasaur',
        reward: 'Unlock Bulbasaur.',
        arena: 'pokemon',
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        win_streak: { character_id: '', character_name: '', wins: 0 },
        image: 'assets/images/PokemonArena/bulbasaurmissionpic.jpeg',
        imageAlt: 'Bulbasaur starter mission artwork',
        characterName: 'Bulbasaur',
        portrait: 'assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg',
        portraitAlt: 'Bulbasaur portrait',
        requirements: ['Choose a starter when you first enter Pokemon Arena.'],
        goals: [
            { type: 'win_matches', character_id: 'charmander', character_name: 'Charmander', wins: 16 },
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
    },
];

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const currentComic = Array.isArray(state.releasesByArena?.comic)
        ? state.releasesByArena.comic
        : Array.isArray(state.comicReleases)
            ? state.comicReleases
            : Array.isArray(state.releases)
                ? state.releases
                : [];
    const nextPokemon = ['zubat', 'gastly', 'abra'];
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-2-0',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemon.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemon.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_arena_zubat_gastly_abra_scyther_news',
    };
};

const mergeMissionCatalog = (currentMissions = []) => {
    const nextMissions = Array.isArray(currentMissions) ? currentMissions.slice() : [];
    const missionsById = new Map(nextMissions.map((mission) => [mission.missionId, mission]));
    starterMissions.forEach((mission) => {
        missionsById.set(mission.missionId, mission);
    });
    missionsById.set(gastlyMission.missionId, gastlyMission);
    return Array.from(missionsById.values()).sort(
        (left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0)
    );
};

async function syncPokemonArenaNews() {
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

        const latestState = await appState.findOne({ key: latestReleasesKey });
        await appState.updateOne(
            { key: latestReleasesKey },
            { $set: buildLatestReleasesState(latestState) },
            { upsert: true }
        );

        const missionState = await appState.findOne({ key: missionsKey });
        const mergedMissions = mergeMissionCatalog(
            Array.isArray(missionState?.missions) ? missionState.missions : []
        );
        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: mergedMissions,
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_arena_zubat_gastly_abra_scyther_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.0 news, latest releases, and Pokemon missions.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
