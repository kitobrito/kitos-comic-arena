const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.8',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.8 focuses on battle presentation, avatar flexibility, and a few big matchup quality-of-life changes across the roster.',
        },
        {
            type: 'paragraph',
            text: 'The in-game Pokemon Arena battle picture now uses the new battle art from the newbattlepic folder, and player avatars can now be uploaded directly on the site from either profile surface. Uploaded images are automatically resized to 75x75, so the avatar works no matter what size the original file was.',
        },
        {
            type: 'paragraph',
            text: 'Pokemon Trainer\'s Pokeball slot now cycles by itself every turn with weighted odds: Pokeball 40%, Great Ball 30%, Ultra Ball 20%, and Master Ball 10%. That means the ball family now rotates automatically without any manual input while still keeping each upgrade rare enough to feel different.',
        },
        {
            type: 'paragraph',
            text: 'Every Pokemon evolution skill now heals 10 HP when it applies, including the override-aware evolution paths, so a forced evolution always gives a small recovery bump on top of the new form and skill replacement package.',
        },
        {
            type: 'paragraph',
            text: 'Ended match recovery was also cleaned up so players do not get trapped on a repeated WINNER screen after a force-end or stale match state. The live match cleanup now pushes them back toward a clean exit instead of leaving the battle overlay stuck.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.8 focuses on battle presentation, avatar flexibility, and a few big matchup quality-of-life changes across the roster.',
        'The in-game Pokemon Arena battle picture now uses the new battle art from the newbattlepic folder, and player avatars can now be uploaded directly on the site from either profile surface. Uploaded images are automatically resized to 75x75, so the avatar works no matter what size the original file was.',
        'Pokemon Trainer\'s Pokeball slot now cycles by itself every turn with weighted odds: Pokeball 40%, Great Ball 30%, Ultra Ball 20%, and Master Ball 10%. That means the ball family now rotates automatically without any manual input while still keeping each upgrade rare enough to feel different.',
        'Every Pokemon evolution skill now heals 10 HP when it applies, including the override-aware evolution paths, so a forced evolution always gives a small recovery bump on top of the new form and skill replacement package.',
        'Ended match recovery was also cleaned up so players do not get trapped on a repeated WINNER screen after a force-end or stale match state. The live match cleanup now pushes them back toward a clean exit instead of leaving the battle overlay stuck.',
    ],
    changes: [
        {
            text: 'Pokemon Arena now uses the new battle picture art from the newbattlepic folder for the in-game battle screen.',
            changeType: 'quality',
            characterName: 'Battle Background',
            facePicture: 'assets/images/PokemonArena/newbattlepic/1783150082785.png',
            skillId: '',
            skillName: '',
            skillimage: 'assets/images/PokemonArena/newbattlepic/1783150082785.png',
        },
        {
            text: 'Players can upload their own avatar image directly on the site, and the image is always resized to 75x75 no matter the original file size.',
            changeType: 'quality',
            characterName: 'Profile Avatars',
            facePicture: 'assets/images/PokemonArena/found-pokeball.png',
            skillId: '',
            skillName: '',
            skillimage: 'assets/images/PokemonArena/found-pokeball.png',
        },
        {
            text: 'Pokemon Trainer\'s Pokeball slot now rotates automatically each turn with weighted odds for Pokeball, Great Ball, Ultra Ball, and Master Ball.',
            changeType: 'balance',
            characterId: 'pokemon-trainer',
            characterName: 'Pokemon Trainer',
            facePicture: 'assets/images/PokemonArena/pokemontrainer/FP.jpg',
            skillId: 'pokemon-trainer-pokeball',
            skillName: 'Pokeball',
            skillimage: 'assets/images/PokemonArena/pokemontrainer/Pokeball.jpeg',
        },
        {
            text: 'Pokemon evolution skills now heal 10 HP when they apply, including the later override-aware evolution paths.',
            changeType: 'quality',
            characterName: 'Evolution Skills',
            facePicture: 'assets/images/PokemonArena/found-pokeball.png',
            skillId: '',
            skillName: '',
            skillimage: 'assets/images/PokemonArena/found-pokeball.png',
        },
        {
            text: 'Ended matches and force-end recovery no longer leave players stuck on a repeated WINNER overlay.',
            changeType: 'quality',
            characterName: 'Match Recovery',
            facePicture: 'assets/images/PokemonArena/found-pokeball.png',
            skillId: '',
            skillName: '',
            skillimage: 'assets/images/PokemonArena/found-pokeball.png',
        },
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncPokemonArenaV328News() {
    if (!uri) {
        throw new Error('MONGODB_URI is required.');
    }

    const client = new MongoClient(uri);
    await client.connect();
    try {
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);
        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );
        console.log('Synced Pokemon Arena Update V.3.2.8 news.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaV328News().catch((error) => {
    console.error(error);
    process.exit(1);
});
