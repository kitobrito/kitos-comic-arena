const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';
const migrationKey = 'release_migration:pokemon-community-latest-releases-v2';
const releaseVersion = 'pokemon-ditto-scraggy-community-batch';
const ditto = characters.find((character) => character?.id === 'ditto');
const scraggy = characters.find((character) => character?.id === 'scraggy');
const previousNewsTitle = 'Ditto Joins the Community Roster';
const newsTitle = 'Ditto and Scraggy Join the Community Roster';

const paragraphs = [
    'The next Pokemon Arena community-character batch is here. Scraggy, designed by Cheshire, builds Focus Energy through patient turns, Leer, and successful Hi Jump Kicks before evolving into Scrafty with four improved active skills. Leer stuns Physical skills instead of the retired Melee class, and Hi Jump Kick now clearly displays MISS when its 25% miss chance triggers but cannot miss a stunned target.',
    'Ditto was designed by KiruKasai and automatically transforms into the opposing Pokemon directly across from it, copying that Pokemon and its equipped skin. Ditto can copy Scraggy and build Focus Energy to evolve into Scrafty, while Pokemon Trainer can immediately evolve an allied Scraggy with Rare Candy.',
    'When Ditto faces another Ditto, it keeps four Transform skills that can copy a living ally or enemy. Pokemon Trainer also copies base Ditto instead of the Pokemon Ditto already transformed into, then must use Transform herself to choose a new form.',
    'Complete the Scraggy Focus Energy Trial with Hitmonlee and Koffing or unlock Scraggy for 300 points. Ditto remains available through the Ditto Perfect Copy Trial with Eevee and Pokemon Trainer or for 300 points. Shiny Ditto costs 500 points and copies the target Pokemon\'s equipped appearance instead of inventing a shiny version of every transformation.',
    'Aegislash, designed by fghop for the original Anime Arena community, remains part of this growing community-character wave. Slash has been renamed Cut, and inactivity no longer changes Aegislash\'s stance. More preserved community designs are planned for future Pokemon Arena releases.',
    'Poison Gas now triggers only when Koffing or Weezing itself deals damage, not when an ally attacks. Smog\'s immediate hit and every later damage tick now roll Poison Gas independently for each enemy damaged.',
    'Chikorita Sweet Scent now cycles through Physical, Special, and Affliction damage reduction. Affliction is reduced independently from the Physical or Special primary class attached to an Affliction skill.',
    'Pokemon Arena damage classes use Physical and Special, with Affliction retained as a secondary class after its Physical or Special class. The iPhone volume slider and mute controls have also been corrected for touch and mobile-audio playback.',
    'This update begins the Pokemon Arena battle-animation overhaul. Confirmed Physical attacks now land with directional punch impacts, Special attacks use colored travel effects, and piercing damage, Affliction, healing, stuns, shields, and invulnerability each have distinct readable feedback. Misses, counters, evades, and ignored damage do not incorrectly display successful-hit effects because animations are driven by confirmed battle results for both players.',
    'Aegislash, Ditto, and Scraggy or Scrafty now have character-specific stance, transformation, Focus Energy, evolution, and attack effects. The animations are kept clear of health bars, status icons, and skill text on iPhone, and they respect the skill-animation, death-animation, SFX mute, and reduced-motion options.',
    'Pokemon Trainer now throws the selected Pokeball, Great Ball, Ultra Ball, or Master Ball directly into the targeted Pokemon portrait. The supplied game audio controls three individually synchronized ball shakes. A successful catch flashes the ball white, pulls stars inward, then fades back to the ball\'s original color; a failed catch knocks the ball away from the portrait and fades it out elsewhere on the screen.',
    'As a balance adjustment, every failed ball capture now stuns its target and makes that target invulnerable for only 1 turn. Pokeball, Great Ball, and Ultra Ball keep their existing catch thresholds, while Master Ball remains a guaranteed catch.',
    'There will be one more community character release tomorrow. After that release, the following update will continue the focus on adding and improving battle animations.',
];

const buildCharacterChanges = (character, groupKey) =>
    (character?.skills || []).flatMap((skill) => {
        const entries = [skill, skill?.evolvesTo].filter(Boolean);
        return entries.map((entry) => ({
            groupKey,
            groupName: character?.name || '',
            collapsible: true,
            characterId: character?.id || '',
            characterName: character?.name || '',
            facePicture: character?.facePicture,
            skillId: entry.id,
            skillName: entry.name,
            skillimage: entry.skillimage,
            text: entry.skilldescription,
            changeType: 'new',
        }));
    });

const dittoChanges = buildCharacterChanges(ditto, 'pokemon-community:ditto');
const scraggyChanges = buildCharacterChanges(scraggy, 'pokemon-community:scraggy');

const newsPost = {
    title: newsTitle,
    arena: 'pokemon',
    releaseVersion,
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [
        ...scraggyChanges,
        ...dittoChanges,
        {
            changeType: 'new',
            characterId: 'scraggy',
            characterName: 'Scraggy',
            skillName: 'Scraggy Focus Energy Trial',
            text: 'Win 8 matches and earn a 4-match streak with Hitmonlee and Koffing, or unlock Scraggy for 300 points.',
        },
        {
            changeType: 'balance',
            characterId: 'scraggy',
            characterName: 'Scraggy',
            skillName: 'Energy Costs and Class Corrections',
            text: 'Scraggy costs are Headbutt: 1 Taijutsu; Leer: 1 Genjutsu; Hi Jump Kick: 1 Taijutsu and 1 Random; Focus Blast: 1 Taijutsu and 1 Genjutsu. Scrafty costs are Headbutt: 1 Taijutsu and 1 Random; Leer: 1 Random; Hi Jump Kick: 1 Taijutsu and 1 Random; Focus Blast: 1 Taijutsu and 1 Genjutsu. Leer now stuns Physical skills, Focus Blast grants Physical invulnerability, and Hi Jump Kick cannot miss stunned targets.',
        },
        {
            changeType: 'new',
            characterId: 'ditto',
            characterName: 'Ditto',
            skillName: 'Shiny Ditto',
            text: 'A blue Shiny Ditto skin is available for 500 unlock points.',
        },
        {
            changeType: 'balance',
            characterId: 'koffing',
            characterName: 'Koffing',
            skillName: 'Poison Gas / Smog',
            text: 'Poison Gas is owner-only and now rolls from every successful immediate or periodic Smog damage packet.',
        },
        {
            changeType: 'balance',
            characterId: 'chikorita',
            characterName: 'Chikorita',
            skillName: 'Sweet Scent',
            text: 'Sweet Scent cycles 5 Physical, Special, and Affliction damage reduction as separate classes.',
        },
        {
            changeType: 'fix',
            characterId: '',
            characterName: 'Pokemon Arena',
            skillName: 'iPhone Sound Controls',
            text: 'The volume slider and mute controls now respond correctly on iPhone and resume mobile audio as expected.',
        },
        {
            changeType: 'new',
            characterId: '',
            characterName: 'Pokemon Arena',
            skillName: 'Confirmed Battle Animation Overhaul',
            text: 'Physical and Special attacks, piercing and Affliction damage, healing, stuns, shields, and invulnerability now have distinct confirmed-result effects that respect mobile layout, animation settings, and reduced motion.',
        },
        {
            changeType: 'new',
            characterId: 'pokemon-trainer',
            characterName: 'Pokemon Trainer',
            skillName: 'Audio-Synchronized Ball Captures',
            text: 'Each supplied ball now strikes the selected Pokemon portrait and shakes three times in sync with its result audio. Successful captures flash white and pull stars inward; failed captures are knocked away and fade elsewhere on screen.',
        },
        {
            changeType: 'balance',
            characterId: 'pokemon-trainer',
            characterName: 'Pokemon Trainer',
            skillName: 'Ball Control Duration',
            text: 'Every failed ball capture now stuns and makes its target invulnerable for only 1 turn. Existing catch thresholds and Master Ball\'s guaranteed catch are unchanged.',
        },
    ],
    author: 'kito',
};

const normalizeReleaseEntries = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            characterId: typeof entry?.characterId === 'string' ? entry.characterId.trim() : '',
        }))
        .filter((entry) => entry.characterId);

const buildLatestReleasesState = (existingState = null) => {
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    const value = state.value && typeof state.value === 'object' ? state.value : {};
    const comic = normalizeReleaseEntries(
        state.releasesByArena?.comic ||
            value.releasesByArena?.comic ||
            state.comicReleases ||
            value.comicReleases ||
            state.releases ||
            value.releases ||
            []
    );
    const previousPokemon = normalizeReleaseEntries(
        state.releasesByArena?.pokemon ||
            value.releasesByArena?.pokemon ||
            state.pokemonReleases ||
            value.pokemonReleases ||
            []
    );
    const pokemon = [
        { characterId: 'aegislash' },
        { characterId: 'ditto' },
        { characterId: 'scraggy' },
        ...previousPokemon.filter(
            (entry) => !['scraggy', 'ditto', 'aegislash'].includes(entry.characterId)
        ),
    ].slice(0, 3);
    return {
        key: latestReleasesKey,
        version: releaseVersion,
        releases: comic,
        comicReleases: comic,
        pokemonReleases: pokemon,
        releasesByArena: { comic, pokemon },
        value: {
            version: releaseVersion,
            releases: comic,
            comicReleases: comic,
            pokemonReleases: pokemon,
            releasesByArena: { comic, pokemon },
        },
        updatedAt: new Date(),
        updatedBy: 'sync_pokemon_ditto_release',
    };
};

async function syncPokemonDittoRelease(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    const now = new Date();
    const newsUpdate = {
        $set: { ...newsPost, updatedAt: now },
        $setOnInsert: { createdAt: now },
    };
    if (options.refreshNewsCreatedAt) {
        newsUpdate.$set.createdAt = now;
        delete newsUpdate.$setOnInsert;
    }
    await newsPosts.updateOne(
        {
            $or: [
                { releaseVersion },
                { title: newsTitle },
                { title: previousNewsTitle },
            ],
        },
        newsUpdate,
        { upsert: true }
    );

    const completed = await appState.findOne({ key: migrationKey });
    if (completed?.completed) return { migrated: false, newsSynced: true };

    const existingLatestReleases = await appState.findOne({ key: latestReleasesKey });
    await appState.updateOne(
        { key: latestReleasesKey },
        { $set: buildLatestReleasesState(existingLatestReleases) },
        { upsert: true }
    );
    await appState.updateOne(
        { key: migrationKey },
        {
            $set: {
                key: migrationKey,
                completed: true,
                completedAt: now,
                updatedBy: 'sync_pokemon_ditto_release',
            },
        },
        { upsert: true }
    );
    return { migrated: true, newsSynced: true };
}

async function syncPokemonDittoNews() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const result = await syncPokemonDittoRelease(client.db(dbName), {
            refreshNewsCreatedAt: true,
        });
        console.log(result.migrated
            ? 'Published the Ditto and Scraggy community-character batch.'
            : 'Refreshed the Ditto and Scraggy release news.');
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    syncPokemonDittoNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLatestReleasesState,
    newsPost,
    syncPokemonDittoNews,
    syncPokemonDittoRelease,
};
