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

const skillShowcase = (characterId, skillId, text, options = {}) => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType: 'new',
        characterId: options.characterIdOverride || character.characterId,
        characterName: options.characterNameOverride || character.name,
        facePicture: options.facePictureOverride || character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const now = new Date();
const existingLatestPokemon = ['chansey', 'pidgey', 'koffing'];

const newsPost = {
    title: 'Pokemon Arena Update V.3.1.8',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.1.8 focuses on the three new Pokemon additions so far: Chansey, Pidgey, and Koffing. Chansey brings a full support line with healing, protection, and a late-game evolution into Blissey, while Pidgey and Koffing keep the arena moving with pressure, disruption, and momentum control.',
        },
        {
            type: 'paragraph',
            text: 'Charmander also received a major update. Its evolution now has to be earned through combat, with Charmeleon only arriving after Charmander critically strikes or burns enemies twice instead of getting the upgrade for free.',
        },
        {
            type: 'paragraph',
            text: 'Pokemon Arena is still earlier in development in terms of character count, and that is intentional. The Pokemon side is being built up step by step, and the starters had to come first because they form the base of the whole mode.',
        },
        {
            type: 'paragraph',
            text: 'Mission characters are next for Pokemon Arena. That is the part that gives the mode real forward progression, and once the starters are out of the way the roster can start growing into something that feels complete instead of just getting the first pieces rushed out early.',
        },
        {
            type: 'paragraph',
            text: 'The latest Pokemon releases panel still features Chansey, Pidgey, and Koffing, so the release announcement stays aligned with the characters the arena is actually shipping right now.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.1.8 focuses on the three new Pokemon additions so far: Chansey, Pidgey, and Koffing. Chansey brings a full support line with healing, protection, and a late-game evolution into Blissey, while Pidgey and Koffing keep the arena moving with pressure, disruption, and momentum control.',
        'Charmander also received a major update. Its evolution now has to be earned through combat, with Charmeleon only arriving after Charmander critically strikes or burns enemies twice instead of getting the upgrade for free.',
        'Pokemon Arena is still earlier in development in terms of character count, and that is intentional. The Pokemon side is being built up step by step, and the starters had to come first because they form the base of the whole mode.',
        'Mission characters are next for Pokemon Arena. That is the part that gives the mode real forward progression, and once the starters are out of the way the roster can start growing into something that feels complete instead of just getting the first pieces rushed out early.',
        'The latest Pokemon releases panel still features Chansey, Pidgey, and Koffing, so the release announcement stays aligned with the characters the arena is actually shipping right now.',
    ],
    changes: [
        skillShowcase(
            'chansey',
            'chansey-eggbomb',
            'Egg Bomb costs 1 Random and deals 20 affliction damage to one enemy while making them ignore all healing effects for 1 turn.'
        ),
        skillShowcase(
            'chansey',
            'chansey-pokemon-center-healing',
            'Pokémon Center Healing costs 2 Random and heals Chansey\'s team for 10 HP while granting them 5 destructible defense each turn for 3 turns. While it is active, Softboil always makes its target unable to die.'
        ),
        skillShowcase(
            'chansey',
            'chansey-softboil',
            'Softboil costs 1 Genjutsu and heals one ally for 25 HP. That ally has a 50% chance to become unable to die for 1 turn, so Chansey can still swing fights with a lighter touch even outside her center mode.'
        ),
        skillShowcase(
            'chansey',
            'chansey-emergency-life-support',
            'Pokémon Center Emergency Life Support costs 1 Bloodline, 1 Genjutsu, and 1 Random energy. It heals one ally for 50 HP and strips away enemy skills that are currently affecting them, then drops the Random cost by 1 while Pokémon Center Healing is active.'
        ),
        skillShowcase(
            'chansey',
            'chansey-passive-evolution-blissey',
            'Evolution - Blissey triggers after Chansey has healed 100 total HP during battle. Once that healing total is reached, Chansey evolves into Blissey and swaps into the improved kit.'
        ),
        skillShowcase(
            'charmander',
            'charmander-passive-evolution-charmeleon',
            'Charmander now evolves into Charmeleon only after he critically strikes or burns enemies twice, which makes the evolution something he has to earn in battle instead of getting it for free.'
        ),
        skillShowcase(
            'pidgey',
            'pidgey-gust',
            'Gust costs 1 Ninjutsu and deals 20 piercing damage to one enemy plus 10 physical damage to all other enemies. Pidgey becomes invulnerable to non-mental skills for 1 turn, which makes the opener both punchy and a little sticky.'
        ),
        skillShowcase(
            'pidgey',
            'pidgey-whirlwind',
            'Whirlwind costs 2 Ninjutsu and 3 cooldown. For 2 turns, it cuts the enemy team\'s non-affliction damage by 50%, while Pidgey\'s team becomes invulnerable for 1 turn.'
        ),
        skillShowcase(
            'pidgey',
            'pidgey-peck',
            'Peck costs 1 Random and deals 15 piercing damage to one enemy, then marks them. The mark does not stack, and the next Gust used against that marked enemy consumes the mark for extra piercing damage.'
        ),
        skillShowcase(
            'pidgey',
            'pidgey-sand-attack',
            'Sand-Attack costs 1 Random and gives the enemy team a 30% chance to miss their attacks for 1 turn, making Pidgey\'s side harder to pin down.'
        ),
        skillShowcase(
            'pidgey',
            'pidgey-passive-evolution-pidgeotto',
            'Evolution - Pidgeotto triggers after Pidgey has dealt 100 total damage during battle. Once the counter is filled, Pidgey evolves into Pidgeotto and upgrades the entire kit.'
        ),
        skillShowcase(
            'pidgey',
            'pidgeotto-gust',
            'Pidgeotto\'s Gust increases to 25 piercing damage on the main target and 15 physical damage to all other enemies, keeping the same non-mental protection after the cast.'
        ),
        skillShowcase(
            'pidgey',
            'pidgeotto-whirlwind',
            'Pidgeotto\'s Whirlwind extends the enemy damage reduction to 3 turns, so the evolved form can hold the pace of battle for longer.'
        ),
        skillShowcase(
            'pidgey',
            'pidgeotto-peck',
            'Pidgeotto\'s Peck rises to 20 piercing damage, and if the target is marked, the next Gust spends the mark to add 20 more piercing damage instead of 10.'
        ),
        skillShowcase(
            'pidgey',
            'pidgeotto-sand-attack',
            'Pidgeotto\'s Sand-Attack pushes the miss chance up to 60%, which turns the evolved bird into a much nastier disruption piece.'
        ),
        skillShowcase(
            'koffing',
            'koffing-smog',
            'Smog costs 1 Bloodline and deals 5 affliction damage to all enemies each turn for 4 turns. The effect stacks, so Koffing can keep layering the cloud as long as the fight goes on.'
        ),
        skillShowcase(
            'koffing',
            'koffing-haze',
            'Haze costs 1 Genjutsu and lets Koffing\'s team ignore all new enemy non-damaging effects for 1 turn, which is the clean anti-setup button in his kit.'
        ),
        skillShowcase(
            'koffing',
            'koffing-self-destruct',
            'Self-Destruct costs 1 Random, deals 20 affliction damage to all enemies, and costs Koffing 20 HP. If it defeats him, the enemy team takes 5 extra affliction damage on top of the blast.'
        ),
        skillShowcase(
            'koffing',
            'koffing-smokescreen',
            'Smokescreen costs 1 Random and gives Koffing\'s team 20% evasion for 2 turns, helping the squad slip past incoming attacks while the gas keeps spreading.'
        ),
        skillShowcase(
            'koffing',
            'koffing-passive-poison-gas',
            'Passive: Poison Gas gives Koffing a 20% chance to add a random Gas Effect for 1 turn whenever he damages an enemy: cooldown paralysis, helpful-skill lock, 50% damage reduction, or a delay until their next turn.'
        ),
        skillShowcase(
            'koffing',
            'koffing-passive-evolution-weezing',
            'Evolution - Weezing triggers after Koffing has used each of his skills at least once, then swaps him into Weezing and upgrades the whole kit.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-passive-poison-gas',
            'Weezing\'s Passive: Poison Gas jumps to a 40% chance and keeps the same four Gas Effects, making every hit much more oppressive once the evolution lands.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-smog',
            'Weezing\'s Smog keeps the 5 affliction damage cloud but swaps to 1 Random cost, letting the evolved form keep pressure up more easily.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-haze',
            'Weezing\'s Haze extends the anti-setup shield to 2 turns, so the evolved form can stall enemy plans for longer.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-self-destruct',
            'Weezing\'s Self-Destruct costs 2 Random, deals 30 affliction damage to all enemies, and still punishes a self-KO with the extra 5 affliction damage burst.'
        ),
        skillShowcase(
            'koffing',
            'koffing-weezing-smokescreen',
            'Weezing\'s Smokescreen increases the team evasion to 25% for 3 turns, turning the evolved form into a much slipperier support piece.'
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
    const nextPokemon = [
        ...existingLatestPokemon,
        ...currentPokemon
            .map((entry) => (entry && typeof entry.characterId === 'string' ? entry.characterId : ''))
            .filter((characterId) => characterId && !existingLatestPokemon.includes(characterId)),
    ].slice(0, 3);
    return {
        key: latestReleasesKey,
        version: 'update-v3-1-6-chansey',
        releases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        comicReleases: currentComic.map((entry) => ({ characterId: entry.characterId })),
        pokemonReleases: nextPokemon.map((characterId) => ({ characterId })),
        releasesByArena: {
            comic: currentComic.map((entry) => ({ characterId: entry.characterId })),
            pokemon: nextPokemon.map((characterId) => ({ characterId })),
        },
        updatedAt: new Date(),
        updatedBy: 'sync_poison_ivy_strange_pokemon_arena_news',
    };
};

async function syncPoisonIvyAndStrangeNews() {
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

        console.log('Synced Pokemon Arena Update V.3.1.8 news and Pokemon latest releases.');
    } finally {
        await client.close();
    }
}

syncPoisonIvyAndStrangeNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
