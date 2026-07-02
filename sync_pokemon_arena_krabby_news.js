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

const sectionNote = (sectionName, text, changeType = 'quality') => ({
    text,
    changeType,
    characterName: sectionName,
    facePicture: '',
    skillId: '',
    skillName: '',
    skillimage: '',
});

const now = new Date();

const krabbyMission = {
    missionId: 'krabby-tide-trial',
    title: 'Krabby Tide Trial',
    level_requirement: 7,
    rank: '7',
    reward_character: 'krabby',
    reward_character_name: 'Krabby',
    reward: 'Unlock Krabby.',
    arena: 'pokemon',
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    win_streak: { character_id: '', character_name: '', wins: 0 },
    image: 'assets/images/PokemonArena/Krabby/krabbyfp.png',
    imageAlt: 'Krabby mission artwork',
    characterName: 'Krabby',
    portrait: 'assets/images/PokemonArena/Krabby/krabbyfp.png',
    portraitAlt: 'Krabby portrait',
    requirements: [
        'Krabby unlocks through a mid-ladder bruiser mission built around defense and physical pressure.',
        'Clear a 4-win streak with Squirtle and Scyther on the same team.',
    ],
    goals: [
        { type: 'win_matches', character_id: 'squirtle', character_name: 'Squirtle', wins: 8 },
        { type: 'win_matches', character_id: 'scyther', character_name: 'Scyther', wins: 8 },
        {
            type: 'win_streak_same_team',
            character_ids: ['squirtle', 'scyther'],
            character_names: ['Squirtle', 'Scyther'],
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
    sortOrder: 7,
};

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.5',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.5 adds Krabby to the roster, brings Kingler in as his live evolution, and opens a new Krabby mission in Pokemon Arena.',
        },
        {
            type: 'paragraph',
            text: 'Krabby is a bruiser built around permanent stat growth. Metal Claw chips through defenses with piercing damage and can permanently boost Krabby\'s non-affliction damage, Bubble permanently opens one enemy up to extra physical punishment, Crabhammer stuns and can crit for a burst spike, and Harden stacks permanent destructible defense while buying time with damage reduction.',
        },
        {
            type: 'paragraph',
            text: 'After Krabby has spent 3 turns with Harden\'s destructible defense active, it evolves into Kingler. Kingler doubles down on the same identity with stronger Metal Claw scaling, a harsher Bubble mark, a heavier Crabhammer, and a more durable Harden window.',
        },
        {
            type: 'paragraph',
            text: 'Pokemon Trainer\'s Rare Candy now supports Krabby too, so evolution-focused teams can skip the usual Harden timer and bring Kingler online immediately.',
        },
        {
            type: 'divider',
        },
        {
            type: 'paragraph',
            text: 'Bug Fixes',
        },
        {
            type: 'paragraph',
            text: 'Recent fixes cover match flow, mobile controls, and evolution cleanup. Match timeout recovery no longer force-clears the cached account and boots players to login, ended matches no longer trap players in a repeated victory-screen loop, and mobile players can now press-and-drag to reorder queued skills directly from the in-game skill list.',
        },
        {
            type: 'paragraph',
            text: 'Pokemon Trainer\'s Rare Candy evolution statuses are now unremovable, so evolved targets cannot be unevolved by later cleanse or status-removal effects. Pokemon piercing skills were also cleaned up so moves that are only supposed to ignore normal damage reduction no longer incorrectly bypass destructible defense through old override data.',
        },
        {
            type: 'paragraph',
            text: 'Matchmaking join recovery was also hardened around stale or half-hydrated active matches, which should reduce cases where players get stranded in broken queue or match-join states.',
        },
        {
            type: 'divider',
        },
        {
            type: 'paragraph',
            text: 'Animations',
        },
        {
            type: 'paragraph',
            text: 'The animation rollout now spans four Pokemon Arena batches. The first batch covered Ivysaur\'s Solar Beam and Leech Seed, Pikachu\'s Thunder, Charmeleon\'s Flamethrower, Wartortle\'s Hydro Pump, Kadabra\'s Future Sight, Golbat\'s Supersonic, Blissey\'s Pokemon Center Healing, Weezing\'s Smog, and Scyther\'s X-Cutter.',
        },
        {
            type: 'paragraph',
            text: 'The second batch added Butterfree\'s Psybeam, Stun Spore, Whirlwind, and Sleep Powder, plus Pokemon Trainer FX for Pokeball, Great Ball, Ultra Ball, Master Ball, X-Stats, and Rare Candy.',
        },
        {
            type: 'paragraph',
            text: 'The third batch added Psychic, Calm Mind, and Teleport for both Abra and Kadabra, along with Leech Life and Bite for both Zubat and Golbat.',
        },
        {
            type: 'paragraph',
            text: 'The newest Krabby/Kingler batch adds Metal Claw, Bubble, Crabhammer, and Harden, and evolved Kingler now also gets a live portrait aura with snapping crab pincers on every corner and rising bubbles around the face card.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.5 adds Krabby to the roster, brings Kingler in as his live evolution, and opens a new Krabby mission in Pokemon Arena.',
        'Krabby is a bruiser built around permanent stat growth. Metal Claw chips through defenses with piercing damage and can permanently boost Krabby\'s non-affliction damage, Bubble permanently opens one enemy up to extra physical punishment, Crabhammer stuns and can crit for a burst spike, and Harden stacks permanent destructible defense while buying time with damage reduction.',
        'After Krabby has spent 3 turns with Harden\'s destructible defense active, it evolves into Kingler. Kingler doubles down on the same identity with stronger Metal Claw scaling, a harsher Bubble mark, a heavier Crabhammer, and a more durable Harden window.',
        'Pokemon Trainer\'s Rare Candy now supports Krabby too, so evolution-focused teams can skip the usual Harden timer and bring Kingler online immediately.',
        'Bug Fixes',
        'Recent fixes cover match flow, mobile controls, and evolution cleanup. Match timeout recovery no longer force-clears the cached account and boots players to login, ended matches no longer trap players in a repeated victory-screen loop, and mobile players can now press-and-drag to reorder queued skills directly from the in-game skill list.',
        'Pokemon Trainer\'s Rare Candy evolution statuses are now unremovable, so evolved targets cannot be unevolved by later cleanse or status-removal effects. Pokemon piercing skills were also cleaned up so moves that are only supposed to ignore normal damage reduction no longer incorrectly bypass destructible defense through old override data.',
        'Matchmaking join recovery was also hardened around stale or half-hydrated active matches, which should reduce cases where players get stranded in broken queue or match-join states.',
        'Animations',
        'The animation rollout now spans four Pokemon Arena batches. The first batch covered Ivysaur\'s Solar Beam and Leech Seed, Pikachu\'s Thunder, Charmeleon\'s Flamethrower, Wartortle\'s Hydro Pump, Kadabra\'s Future Sight, Golbat\'s Supersonic, Blissey\'s Pokemon Center Healing, Weezing\'s Smog, and Scyther\'s X-Cutter.',
        'The second batch added Butterfree\'s Psybeam, Stun Spore, Whirlwind, and Sleep Powder, plus Pokemon Trainer FX for Pokeball, Great Ball, Ultra Ball, Master Ball, X-Stats, and Rare Candy.',
        'The third batch added Psychic, Calm Mind, and Teleport for both Abra and Kadabra, along with Leech Life and Bite for both Zubat and Golbat.',
        'The newest Krabby/Kingler batch adds Metal Claw, Bubble, Crabhammer, and Harden, and evolved Kingler now also gets a live portrait aura with snapping crab pincers on every corner and rising bubbles around the face card.',
    ],
    changes: [
        skillShowcase('krabby', 'krabby-metal-claw', 'Metal Claw deals piercing damage and has a 30% chance to permanently add more non-affliction damage to Krabby\'s kit.'),
        skillShowcase('krabby', 'krabby-leer', 'Bubble permanently increases the physical damage one enemy takes, which makes Krabby excellent at setting up later melee pressure.'),
        skillShowcase('krabby', 'krabby-crabhammer', 'Crabhammer is the direct punish tool: it stuns all of the target\'s skills for 1 turn and can burst harder on a critical strike.'),
        skillShowcase('krabby', 'krabby-harden', 'Harden adds permanent destructible defense immediately, grants a 2-turn damage reduction shell, and feeds Krabby\'s evolution clock into Kingler.'),
        skillShowcase('krabby', 'krabby-passive-evolution-kingler', 'Evolution - Kingler triggers after 3 turns protected by Harden\'s defense and upgrades the full Krabby kit.'),
        skillShowcase('pokemon-trainer', 'pokemon-trainer-rare-candy', 'Rare Candy now includes Krabby among its instant-evolution targets, letting Pokemon Trainer jump straight to Kingler.'),
        sectionNote('Bug Fixes', 'Match timeout expiry now sends players back toward selection without forcibly logging them out, and finished matches can be dismissed cleanly without the victory overlay reopening in a loop.'),
        sectionNote('Bug Fixes', 'Mobile queue previews now support touch drag-and-drop reordering, so phone players can change queued skill order the same way desktop players can.'),
        sectionNote('Bug Fixes', 'Rare Candy evolution states are now marked unremovable, which prevents cleanse-style effects from stripping an evolved form and undoing Pokemon Trainer progress.'),
        sectionNote('Bug Fixes', 'Pokemon piercing cleanup removed mistaken destructible-defense bypass flags from skills and override records that were only meant to ignore standard damage reduction.'),
        sectionNote('Bug Fixes', 'Matchmaking join recovery now rehydrates stale active matches more safely so players are less likely to get stuck in broken join or queue states.'),
        sectionNote('Animations', 'Batch 1 added custom portrait FX for Solar Beam, Leech Seed, Thunder, Flamethrower, Hydro Pump, Future Sight, Supersonic, Pokemon Center Healing, Smog, and X-Cutter.', 'new'),
        sectionNote('Animations', 'Batch 2 added Psybeam, Stun Spore, Whirlwind, Sleep Powder, Pokeball, Great Ball, Ultra Ball, Master Ball, X-Stats, and Rare Candy.', 'new'),
        sectionNote('Animations', 'Batch 3 added Psychic, Calm Mind, and Teleport for Abra/Kadabra plus Leech Life and Bite for Zubat/Golbat.', 'new'),
        sectionNote('Animations', 'Krabby and Kingler now animate Metal Claw, Bubble, Crabhammer, and Harden.', 'new'),
        sectionNote('Animations', 'Evolved Kingler now projects a live portrait aura with snapping claw corners and floating bubbles when Krabby has evolved.', 'new'),
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
    missionsById.set(krabbyMission.missionId, krabbyMission);
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
    const currentPokemon = Array.isArray(state.releasesByArena?.pokemon)
        ? state.releasesByArena.pokemon
        : Array.isArray(state.pokemonReleases)
            ? state.pokemonReleases
            : [];
    const nextPokemonIds = [
        'krabby',
        ...currentPokemon
            .map((entry) => (typeof entry?.characterId === 'string' ? entry.characterId : ''))
            .filter((characterId) => characterId && characterId !== 'krabby'),
    ].slice(0, 3);
    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-2-5-krabby',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemonIds.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemonIds.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_arena_krabby_news',
    };
};

async function syncPokemonArenaKrabbyNews() {
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
        await appState.updateOne(
            { key: missionsKey },
            {
                $set: {
                    key: missionsKey,
                    missions: mergeMissionCatalog(
                        Array.isArray(missionState?.missions) ? missionState.missions : []
                    ),
                    updatedAt: new Date(),
                    updatedBy: 'sync_pokemon_arena_krabby_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.5 Krabby news, mission, and latest releases.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaKrabbyNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
