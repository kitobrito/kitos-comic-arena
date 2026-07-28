const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const releaseVersion = 'pokemon-battle-experience-update-v2';
const newsTitle = 'Pokémon Arena Battle Experience Update';

const paragraphs = [
    'Pokémon Arena’s battle presentation has received its largest animation pass yet. Confirmed Physical and Special attacks, piercing and Affliction damage, healing, stuns, shields, invulnerability, misses, counters, and evades now have distinct readable effects. Evolution and Rare Candy transformations use a full cinematic that stays centered in the new UI and respects reduced-motion, skill-animation, and death-animation settings.',
    'Pokémon Trainer now throws the selected Poké Ball, Great Ball, Ultra Ball, or Master Ball directly at the chosen portrait. The three shakes are synchronized to the supplied capture audio. Successful captures flash white and pull stars inward; failed captures break away and fade elsewhere. Top and bottom targets now use the same reliable confirmed-cast path, and capture effects no longer repeat on unrelated turns.',
    'Battle music now preloads during the intro and becomes audible as soon as the intro ends. Music and SFX controls use clear green ON and red OFF states, while iPhone volume, mute, and mobile-audio behavior remain supported.',
    'Chakra updates now apply immediately even when account-name casing differs or the rest of the battlefield has not visually changed. The chakra confirmation screen also keeps queued skill images stable instead of flashing when energy is adjusted.',
    'Chakra Exchange now trades exactly 2 energy of the same color for 1 energy of any chosen color. Mixed-color payments are no longer accepted.',
    'Wartortle’s Shell Guard now protects both Wartortle and the selected ally, and it no longer tracks or displays Squirtle’s completed evolution passive. Abra and Kadabra’s Teleport now protects both themselves and the selected ally; Kadabra also cleanses both recipients as intended. Calm Mind grants Abra 10% reduction and 5 bonus damage, increasing to 15% reduction and 10 bonus damage as Kadabra.',
    'Leech Seed’s first turn, matchmaking spinner restarts, mobile cooldown placement, battle options, death-animation controls, and new-UI animation positioning have also been corrected.',
    'Battle bots now value permanent stacking damage and repeatable pressure correctly. Beedrill will make purposeful use of Poison Sting instead of treating its stacks as redundant. Hive Swarm and Mega Hive Swarm now ignore the next 2 enemy damage effects, reduced from 3.',
    'Pokemon Trainer has been rebalanced. The ball slot is now Pokeball 40%, Great Ball 30%, Ultra Ball 25%, and Master Ball 5%. X-Stats alternates between stacking Physical and Special damage bonuses. Potion costs 1 Random, has 1 cooldown, and is limited to 2 uses per match. Revive now targets defeated allies only.',
    'Evolution pacing has been accelerated for two Pokemon: Pidgey now evolves after dealing 50 total damage, and Gastly evolves after losing 35 total HP.',
    'Koffing Smokescreen now costs 1 Random and Weezing Smokescreen costs 2 Random. Scyther Double Team lasts 2 turns, refreshes its full duration after a kill, and has 5 cooldown. During Swords Dance, Fury Cutter gains 2 stacks per use and X-Cutter can double cast after critically striking a target at 50 HP or less.',
    'Hitmonchan has stronger elemental punch utility. Thunder Punch splashes 5 piercing damage to other enemies, Fire Punch adds 5 affliction damage for 2 turns, Ice Punch increases new cooldowns by 2 for 1 turn, and Mega Punch now starts at 15 damage.',
    'Machop and Machoke have been reworked. Brick Break destroys destructible defense and gains bonus damage when it breaks any. Counter now stops a targeted enemy\'s first new damaging skill and returns its damage as Physical damage, doubled by Machoke. Bulk Up supplies destructible defense, stacks the next Brick Break, and evolves Machop after 2 uses. Taunt lasts 3 turns and reduces the target\'s Physical damage by 25%.',
];

const newsPost = {
    title: newsTitle,
    arena: 'pokemon',
    releaseVersion,
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [
        { changeType: 'new', characterName: 'Pokémon Arena', skillName: 'Confirmed Battle Animations', text: paragraphs[0] },
        { changeType: 'fix', characterId: 'pokemon-trainer', characterName: 'Pokémon Trainer', skillName: 'Ball Capture Presentation', text: paragraphs[1] },
        { changeType: 'fix', characterName: 'Pokémon Arena', skillName: 'Music and Sound Controls', text: paragraphs[2] },
        { changeType: 'fix', characterName: 'Pokémon Arena', skillName: 'Authoritative Chakra Sync', text: paragraphs[3] },
        { changeType: 'balance', characterName: 'Pokémon Arena', skillName: 'Chakra Exchange', text: paragraphs[4] },
        { changeType: 'fix', characterId: 'squirtle', characterName: 'Wartortle', skillName: 'Shell Guard', text: 'Shell Guard protects Wartortle and the selected ally without restoring Squirtle evolution tracking.' },
        { changeType: 'fix', characterId: 'abra', characterName: 'Abra / Kadabra', skillName: 'Teleport and Calm Mind', text: 'Teleport affects the user and selected ally. Calm Mind uses the intended form-specific reduction and damage bonuses.' },
        { changeType: 'fix', characterName: 'Pokémon Arena', skillName: 'New UI and Matchmaking Polish', text: paragraphs[6] },
        { changeType: 'balance', characterId: 'beedrill', characterName: 'Beedrill', skillName: 'Bot Poison Sting / Hive Swarm', text: paragraphs[7] },
        { changeType: 'balance', characterId: 'pokemon-trainer', characterName: 'Pokemon Trainer', skillName: 'Items, X-Stats, and Ball Odds', text: paragraphs[8] },
        { changeType: 'balance', characterId: 'pidgey', characterName: 'Pidgey / Gastly', skillName: 'Evolution Thresholds', text: paragraphs[9] },
        { changeType: 'balance', characterId: 'scyther', characterName: 'Koffing / Weezing / Scyther', skillName: 'Skill Updates', text: paragraphs[10] },
        { changeType: 'balance', characterId: 'hitmonchan', characterName: 'Hitmonchan', skillName: 'Elemental Punches', text: paragraphs[11] },
        { changeType: 'balance', characterId: 'machop', characterName: 'Machop / Machoke', skillName: 'Full Rework', text: paragraphs[12] },
    ],
    author: 'kito',
};

async function syncPokemonBattleExperienceNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = new Date();
    const update = {
        $set: { ...newsPost, updatedAt: now },
        $setOnInsert: { createdAt: now },
    };
    if (options.refreshNewsCreatedAt) {
        update.$set.createdAt = now;
        delete update.$setOnInsert;
    }
    await db.collection(newsCollectionName).updateOne(
        { $or: [{ releaseVersion }, { title: newsTitle }] },
        update,
        { upsert: true }
    );
    return { newsSynced: true };
}

async function run() {
    if (!uri) throw new Error('MONGODB_URI is required in the environment.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        await syncPokemonBattleExperienceNews(client.db(dbName), { refreshNewsCreatedAt: true });
        console.log(`Published ${newsTitle}.`);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    run().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}

module.exports = { newsPost, syncPokemonBattleExperienceNews };
