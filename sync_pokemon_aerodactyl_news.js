const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';

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

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.3.2',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.3.2 adds Aerodactyl to the live roster as a recoil-driven physical spike attacker built around Rock Head.',
        },
        {
            type: 'paragraph',
            text: 'Rock Head is the centerpiece of the build. Whenever Aerodactyl loses health from its own skills, that exact lost amount is converted into destructible defense instead, and that stored defense is what Rock Slide and Stone Edge cash out directly.',
        },
        {
            type: 'paragraph',
            text: 'Take Down is the fast opener: 20 damage to one enemy for 1 Random, while Aerodactyl loses 10 HP that cannot kill it and immediately turns that recoil into Rock Head defense.',
        },
        {
            type: 'paragraph',
            text: 'Rock Slide is the team-pressure skill: it deals 10 damage to the enemy team, has a 30% chance to stun each enemy\'s harmful skills for 1 turn, and then spends all current Rock Head defense to hit the chosen main target for that exact bonus damage.',
        },
        {
            type: 'paragraph',
            text: 'Double Edge is the heavy self-feed option: 35 damage to one enemy for 2 Random, then 15 HP recoil that cannot kill Aerodactyl and becomes an even larger Rock Head defense bank.',
        },
        {
            type: 'paragraph',
            text: 'Stone Edge is the finisher. It deals 35 damage to one enemy, has a 30% chance plus all consumed Rock Head defense as extra stun chance to stun that enemy\'s skills for 2 turns, and if the stun lands it counts as a crit for 5 additional piercing damage.',
        },
        {
            type: 'paragraph',
            text: 'This update also pushes Aerodactyl into the Pokemon Arena latest releases strip so the roster card is visible immediately from the front page.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.3.2 adds Aerodactyl to the live roster as a recoil-driven physical spike attacker built around Rock Head.',
        'Rock Head is the centerpiece of the build. Whenever Aerodactyl loses health from its own skills, that exact lost amount is converted into destructible defense instead, and that stored defense is what Rock Slide and Stone Edge cash out directly.',
        'Take Down is the fast opener: 20 damage to one enemy for 1 Random, while Aerodactyl loses 10 HP that cannot kill it and immediately turns that recoil into Rock Head defense.',
        'Rock Slide is the team-pressure skill: it deals 10 damage to the enemy team, has a 30% chance to stun each enemy\'s harmful skills for 1 turn, and then spends all current Rock Head defense to hit the chosen main target for that exact bonus damage.',
        'Double Edge is the heavy self-feed option: 35 damage to one enemy for 2 Random, then 15 HP recoil that cannot kill Aerodactyl and becomes an even larger Rock Head defense bank.',
        'Stone Edge is the finisher. It deals 35 damage to one enemy, has a 30% chance plus all consumed Rock Head defense as extra stun chance to stun that enemy\'s skills for 2 turns, and if the stun lands it counts as a crit for 5 additional piercing damage.',
        'This update also pushes Aerodactyl into the Pokemon Arena latest releases strip so the roster card is visible immediately from the front page.',
    ],
    changes: [
        skillShowcase(
            'aerodactyl',
            'aerodactyl-passive-tough-head',
            'Rock Head converts Aerodactyl\'s self-health-loss from its own skills into destructible defense, and that same defense is what his payoff moves consume.'
        ),
        skillShowcase(
            'aerodactyl',
            'aerodactyl-take-down',
            'Take Down gives Aerodactyl a cheap 20-damage opener that also loads 10 points of Rock Head defense through recoil.'
        ),
        skillShowcase(
            'aerodactyl',
            'aerodactyl-rock-slide',
            'Rock Slide pressures the whole enemy team for 10 damage, rolls a 30% harmful-skill stun on each target, and then cashes all stored Rock Head defense into the selected main target.'
        ),
        skillShowcase(
            'aerodactyl',
            'aerodactyl-double-edge',
            'Double Edge is the biggest self-feed button in the kit, dealing 35 damage while loading 15 more Rock Head defense from recoil.'
        ),
        skillShowcase(
            'aerodactyl',
            'aerodactyl-stone-edge',
            'Stone Edge acts as the payoff finisher: 35 base damage, a 30% chance plus all consumed Rock Head defense as extra stun chance, and a crit that adds 5 additional piercing damage when the stun lands.'
        ),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

const normalizeReleaseEntries = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => {
            const characterId =
                typeof entry?.characterId === 'string'
                    ? entry.characterId.trim().toLowerCase()
                    : typeof entry === 'string'
                        ? entry.trim().toLowerCase()
                        : '';
            return characterId ? { characterId } : null;
        })
        .filter(Boolean);

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const currentComic = normalizeReleaseEntries(
        state.releasesByArena?.comic || state.comicReleases || state.releases || []
    );
    const currentPokemon = normalizeReleaseEntries(
        state.releasesByArena?.pokemon || state.pokemonReleases || []
    );
    const nextPokemonIds = [
        'aerodactyl',
        ...currentPokemon
            .map((entry) => entry.characterId)
            .filter((characterId) => characterId && characterId !== 'aerodactyl')
            .slice(0, 2),
    ];

    return {
        key: latestReleasesKey,
        version: 'pokemon-release-v3-3-2-aerodactyl',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemonIds.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemonIds.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_aerodactyl_news',
    };
};

async function syncPokemonAerodactylNews() {
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

        const latestReleasesState = await appState.findOne({ key: latestReleasesKey });
        await appState.updateOne(
            { key: latestReleasesKey },
            {
                $set: buildLatestReleasesState(latestReleasesState),
            },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.3.2 news and latest releases.');
    } finally {
        await client.close();
    }
}

syncPokemonAerodactylNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
