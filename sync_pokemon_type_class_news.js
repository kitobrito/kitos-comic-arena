const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const typeArt = 'assets/images/PokemonArena/found-pokeball.png';

const paragraphs = [
    'Pokemon Arena now has a complete Type-Class system. All 40 Pokemon Arena characters have their modern Pokemon type or dual typing, and all 264 roster skill entries plus their 11 nested evolved variants now begin with one move-type class such as Fire, Water, Electric, Psychic, or Fairy. The old Melee and Ranged classes have been removed from Pokemon Arena skills, while combat classes such as Physical, Mental, Energy, Affliction, Instant, Channeled, Strategic, and Passive continue to work normally.',
    'Type matchups intentionally have a small, predictable effect on damage. A super-effective skill deals 5 additional damage, while a doubly super-effective skill deals 10 additional damage. A not-very-effective skill deals 5 less damage, while a doubly resisted skill deals 10 less damage. Pokemon Arena does not use a same-type attack bonus, so matching a move to its user does not add any extra STAB damage.',
    'The full modern 18-type chart is used, but hard immunities have been redesigned as double resistance. Normal against Ghost, Electric against Ground, Fighting against Ghost, Poison against Steel, Ground against Flying, Psychic against Dark, Ghost against Normal, and Dragon against Fairy receive the -10 former-immunity penalty instead of being automatically blocked. A dual type combines both sides of the matchup and caps the result between -10 and +10; for example, Ground against Electric/Flying is -5 because Electric weakness offsets half of Flying resistance.',
    'Effectiveness is applied once per affected target when a skill is activated, even if that skill contains several immediate damage packets. Area skills calculate the adjustment separately for every enemy. The modifier applies to immediate normal, piercing, and affliction damage before the defender processes shields and damage reduction. If resistance would reduce a positive hit below 5 damage, it remains at 5 so the new system never recreates a practical damage immunity.',
    'Persistent status ticks, delayed damage, recoil, self-damage, traps, counters, reflected damage, fixed damage, and other reactive effects are deliberately excluded. Those effects keep their existing values, preventing multi-turn or multi-trigger skills from receiving the flat bonus or penalty repeatedly. Comic Arena damage and classes are also completely unchanged.',
    'Typing follows the Pokemon that is currently on the battlefield. Charizard X becomes Fire/Dragon, Charizard Y becomes Fire/Flying, and Gyarados becomes Water/Flying after evolution. Pokemon Trainer begins as Normal with Normal item and ball skills, then adopts the active typing and skills of a Pokemon she successfully captures.',
    'Character information now shows each Pokemon current type or dual type, and skill information lists the move type first in the Classes line. When effectiveness changes a hit, the target receives a brief Super Effective, Double Super Effective, Not Very Effective, or Double Not Very Effective battle cue with the applied +5, +10, -5, or -10 adjustment.',
];

const newsPost = {
    title: 'Pokemon Arena Type-Class Overhaul',
    arena: 'pokemon',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [
        {
            text: 'All 40 Pokemon Arena characters now have modern canonical defending types, and all 264 roster skill entries plus their 11 nested evolved variants have one explicit move-type class.',
            changeType: 'update',
            characterName: 'Pokemon Types',
            facePicture: typeArt,
            skillId: '',
            skillName: '',
            skillimage: typeArt,
        },
        {
            text: 'Pokemon Arena skills no longer use Melee or Ranged. Their move type is shown first while Physical, Mental, Energy, Affliction, timing, and special behavior classes remain intact.',
            changeType: 'quality',
            characterName: 'Skill Classes',
            facePicture: typeArt,
            skillId: '',
            skillName: '',
            skillimage: typeArt,
        },
        {
            text: 'Weakness and resistance use flat +/-5 damage, dual matchups cap at +/-10, and there is no STAB bonus.',
            changeType: 'balance',
            characterName: 'Type Effectiveness',
            facePicture: typeArt,
            skillId: '',
            skillName: '',
            skillimage: typeArt,
        },
        {
            text: 'The eight standard immunity matchups now count as double resistance for -10 instead of blocking a skill completely.',
            changeType: 'balance',
            characterName: 'No Hard Immunities',
            facePicture: typeArt,
            skillId: '',
            skillName: '',
            skillimage: typeArt,
        },
        {
            text: 'Effectiveness applies once per target to immediate skill damage. Status ticks, delayed and reactive damage, recoil, reflection, and fixed damage keep their previous values.',
            changeType: 'balance',
            characterName: 'Damage Scope',
            facePicture: typeArt,
            skillId: '',
            skillName: '',
            skillimage: typeArt,
        },
        {
            text: 'Active forms use active typing: Charizard X is Fire/Dragon, Charizard Y is Fire/Flying, Gyarados is Water/Flying, and Pokemon Trainer adopts a captured Pokemon typing.',
            changeType: 'update',
            characterName: 'Evolution Types',
            facePicture: typeArt,
            skillId: '',
            skillName: '',
            skillimage: typeArt,
        },
        {
            text: 'Selection and battle character details now show Pokemon typing, and battle cards display a brief effectiveness cue whenever a type modifier changes damage.',
            changeType: 'quality',
            characterName: 'Battle Feedback',
            facePicture: typeArt,
            skillId: '',
            skillName: '',
            skillimage: typeArt,
        },
    ],
    author: 'kito',
};

async function syncPokemonTypeClassNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = new Date();
    const update = {
        $set: { ...newsPost, updatedAt: now },
        $setOnInsert: { createdAt: now },
    };
    if (options.refreshCreatedAt) {
        update.$set.createdAt = now;
        delete update.$setOnInsert;
    }
    await db.collection(newsCollectionName).updateOne(
        { title: newsPost.title },
        update,
        { upsert: true }
    );
    return { newsSynced: true };
}

async function publishPokemonTypeClassNews() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        await syncPokemonTypeClassNews(client.db(dbName), { refreshCreatedAt: true });
        console.log('Published the Pokemon Arena Type-Class Overhaul news post.');
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    publishPokemonTypeClassNews().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = { newsPost, paragraphs, publishPokemonTypeClassNews, syncPokemonTypeClassNews };
