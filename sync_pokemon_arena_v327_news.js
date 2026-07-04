const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.7',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.7 is a polish and progression update focused on easier character unlocking, cleaner avatar control, and sharper battle kits for Zubat, Krabby, and Kingler.',
        },
        {
            type: 'paragraph',
            text: 'The new Pokemon Arena unlock-points system gives players another path toward mission-locked characters. Winning Pokemon Arena ladder games now earns unlock points, and eligible mission characters can be purchased directly from the mission screen once you have enough points.',
        },
        {
            type: 'paragraph',
            text: 'Eevee evolutions now have their own massive save-up route too. After completing Eevee Evolution Path and making the first permanent evolution choice, the other Eeveelutions can be unlocked for 500 points each.',
        },
        {
            type: 'paragraph',
            text: 'That keeps the first Eevee mission choice meaningful while still giving dedicated players a long-term way to collect Jolteon, Flareon, and Vaporeon on the same account.',
        },
        {
            type: 'paragraph',
            text: 'Zubat has been redesigned around a clearer Supersonic hunting pattern. Supersonic now disrupts enemy skill use and raises random energy costs, Leech Life hits harder against marked targets, Bite can punish a Supersonic target with cooldown pressure, and Draining Fangs now actually makes Leech Life and Bite steal random energy.',
        },
        {
            type: 'paragraph',
            text: 'Krabby and Kingler also have a stronger Bubble identity. Bubble now drenches the main target, pushes cooldown pressure, and makes physical follow-up damage more threatening instead of feeling like a small filler hit.',
        },
        {
            type: 'paragraph',
            text: 'The main site now lets players set Comic Arena and Pokemon Arena avatars separately, and the Pokemon Arena character select scroll has been cleaned up with Pokeball art. Unused Pokemon Arena assets were moved into their own unused-assets folder so the active asset tree is easier to maintain.',
        },
    ],
    changes: [
        {
            text: 'Pokemon Arena ladder wins now feed the unlock-points system for eligible mission character purchases, including 500-point post-mission purchases for extra Eeveelutions.',
            changeType: 'new',
            characterName: 'Unlock Points',
            facePicture: 'assets/images/PokemonArena/found-pokeball.png',
            skillId: '',
            skillName: '',
            skillimage: 'assets/images/PokemonArena/found-pokeball.png',
        },
        {
            text: 'Zubat now has stronger Supersonic setup, conditional Leech Life drain, Bite cooldown punishment, and real random-energy theft through Draining Fangs.',
            changeType: 'balance',
            characterId: 'zubat',
            characterName: 'Zubat',
            facePicture: 'assets/images/PokemonArena/zubat/zubatfp.webp',
            skillId: 'zubat-supersonic',
            skillName: 'Supersonic',
            skillimage: 'assets/images/PokemonArena/zubat/supersonic.webp',
        },
        {
            text: 'Krabby and Kingler Bubble now apply a drenched pressure state that makes physical follow-up damage and cooldown timing more impactful.',
            changeType: 'balance',
            characterId: 'krabby',
            characterName: 'Krabby',
            facePicture: 'assets/images/PokemonArena/Krabby/krabbyfp.png',
            skillId: 'krabby-leer',
            skillName: 'Bubble',
            skillimage: 'assets/images/PokemonArena/Krabby/krabbybubble.png',
        },
        {
            text: 'Comic Arena and Pokemon Arena avatars can now be updated separately from the main profile surfaces.',
            changeType: 'quality',
            characterName: 'Profile Avatars',
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

async function syncPokemonArenaV327News() {
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
        console.log('Synced Pokemon Arena Update V.3.2.7 news with unlock-points details.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaV327News().catch((error) => {
    console.error(error);
    process.exit(1);
});
