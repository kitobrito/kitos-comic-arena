const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const characterOverridesKey = 'character_overrides';

const darthMaul = characters.find((character) => character && character.characterId === 'darth-maul');

if (!darthMaul) {
    throw new Error('Darth Maul is missing from characters.js.');
}

const getSkill = (skillId) => {
    const skill = Array.isArray(darthMaul.skills)
        ? darthMaul.skills.find((entry) => entry && entry.id === skillId)
        : null;
    if (!skill) {
        throw new Error(`Darth Maul skill is missing: ${skillId}`);
    }
    return skill;
};

const buildSkillShowcase = (skillId, text) => {
    const skill = getSkill(skillId);
    return {
        text,
        changeType: 'new',
        characterId: darthMaul.characterId,
        characterName: darthMaul.name,
        facePicture: darthMaul.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const now = new Date();
const title = 'Darth Maul Joins Comic Arena';

const newsPost = {
    title,
    blocks: [
        {
            type: 'paragraph',
            text: 'Darth Maul has arrived in Comic Arena as a relentless bruiser who locks enemies down, punishes counterplay, and turns every failed attempt to stop him into permanent damage.'
        },
        {
            type: 'paragraph',
            text: 'His kit mixes targeted control, execution pressure, ally scaling, and reactive defense, with Hatred permanently ignoring execution effects while rewarding Darth Maul whenever one of his skills is countered or ignored.'
        },
        {
            type: 'paragraph',
            text: 'This release also adds Darth Maul to the Comic Arena latest releases panel so players can find him immediately from the front page.'
        },
        {
            type: 'paragraph',
            text: 'Design credit for Darth Maul goes to ckretstyle.'
        }
    ],
    paragraphs: [
        'Darth Maul has arrived in Comic Arena as a relentless bruiser who locks enemies down, punishes counterplay, and turns every failed attempt to stop him into permanent damage.',
        'His kit mixes targeted control, execution pressure, ally scaling, and reactive defense, with Hatred permanently ignoring execution effects while rewarding Darth Maul whenever one of his skills is countered or ignored.',
        'This release also adds Darth Maul to the Comic Arena latest releases panel so players can find him immediately from the front page.',
        'Design credit for Darth Maul goes to ckretstyle.'
    ],
    changes: [
        buildSkillShowcase(
            'darth-maul-force-choke',
            'Force Choke costs 1 Genjutsu, stuns one enemy for 1 turn, immediately increases all of their cooldowns by 2 if they already have an active skill on them, and for 2 turns makes any skill they use gain 2 extra cooldown.'
        ),
        buildSkillShowcase(
            'darth-maul-dual-sided-saber',
            'Dual-Sided Saber costs 1 Bloodline and 1 Random, deals 15 piercing damage plus 15 affliction damage to one enemy, punishes them with 15 energy damage if they use a skill next turn, and executes them at 25 HP or below if Force Choke was already affecting them.'
        ),
        buildSkillShowcase(
            'darth-maul-sith-code',
            'Sith Code costs 2 Random, lets one ally gain 5 permanent damage every time a non-mental skill is used on them for 2 turns, and gives Darth Maul 1 random energy whenever a mental skill is used on him or that ally.'
        ),
        buildSkillShowcase(
            'darth-maul-parry',
            'Parry costs 1 Random, makes Darth Maul invulnerable for 1 turn, and causes any enemy that uses a new skill on him during that window to take 15 bleed damage.'
        ),
        buildSkillShowcase(
            'darth-maul-passive-hatred',
            'Passive: Hatred permanently makes Darth Maul ignore execution effects, and every time one of his skills is countered or ignored he gains 10 permanent damage for the rest of the match.'
        ),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
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
    const nextComicIds = [
        darthMaul.characterId,
        ...currentComic
            .map((entry) => (typeof entry?.characterId === 'string' ? entry.characterId : ''))
            .filter((characterId) => characterId && characterId !== darthMaul.characterId),
    ].slice(0, 3);
    return {
        key: latestReleasesKey,
        version: 'comic-release-darth-maul',
        releases: nextComicIds.map((characterId) => ({ characterId })),
        comicReleases: nextComicIds.map((characterId) => ({ characterId })),
        pokemonReleases: currentPokemon.map((entry) => ({ characterId: entry.characterId })),
        releasesByArena: {
            comic: nextComicIds.map((characterId) => ({ characterId })),
            pokemon: currentPokemon.map((entry) => ({ characterId: entry.characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_darth_maul_news',
    };
};

async function syncDarthMaulNews() {
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

        const overrideState = await appState.findOne({ key: characterOverridesKey });
        const currentOverrides = Array.isArray(overrideState?.overrides)
            ? overrideState.overrides
            : Array.isArray(overrideState?.value?.overrides)
                ? overrideState.value.overrides
                : [];
        const nextOverrides = [
            ...currentOverrides.filter((entry) => entry && entry.characterId !== darthMaul.characterId),
            {
                characterId: darthMaul.characterId,
                character: darthMaul,
                updatedAt: new Date(),
                updatedBy: 'sync_darth_maul_news',
            },
        ];

        await appState.updateOne(
            { key: characterOverridesKey },
            {
                $set: {
                    key: characterOverridesKey,
                    overrides: nextOverrides,
                    updatedAt: new Date(),
                    updatedBy: 'sync_darth_maul_news',
                },
            },
            { upsert: true }
        );

        console.log('Synced Darth Maul news, Comic Arena latest releases, and character override.');
    } finally {
        await client.close();
    }
}

syncDarthMaulNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
