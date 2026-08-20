const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const now = new Date();
const genericArt = 'assets/images/PokemonArena/found-pokeball.png';
const articunoArt = 'assets/images/PokemonArena/articuno/fp.png';
const moltresArt = 'assets/images/PokemonArena/moltres/FP.png';
const zapdosArt = 'assets/images/PokemonArena/zapdos/fp.png';

const newsPost = {
    title: 'Pokemon Arena Update V.3.3.2',
    arena: 'pokemon',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.3.2 introduces a full weather system to battle, reworks all three legendary birds around it, and adds a battle animation layer built on top of the game\'s pixel-art effects packs. This is one of the largest single updates Pokemon Arena has shipped.',
        },
        {
            type: 'paragraph',
            text: 'Weather is a new match-wide condition that either team can summon. While active, it changes damage by move type, changes energy costs, can make certain effects unmissable, and ticks its own damage every turn. Weather is always fully visible to both players: a banner in the corner of the screen shows the current weather and how many turns are left, and a large countdown alert pops up in the middle of the screen the moment weather starts and every time its timer counts down, so it is always obvious to both players exactly what is happening and when it will end.',
        },
        {
            type: 'paragraph',
            text: 'Even players who have battle animations turned off still see weather happen: the entire arena background now changes to match whichever weather is active (a dedicated Snowstorm, Wildfire, or Lightning Storm background), on top of a new default arena background used the rest of the time.',
        },
        {
            type: 'paragraph',
            text: 'For players with animations on, each weather type also has its own full-screen ambient effect. Snowstorm covers the arena in falling snow. Wildfire sets character portraits and skill bars flickering with fire. Thunderstorm fills the screen with drifting static and strikes it with random lightning flashes, synced to a thunder sound.',
        },
        {
            type: 'paragraph',
            text: 'Articuno\'s Blizzard now costs more and summons a 4-turn Snowstorm instead of just hitting the enemy team: Ice and Water Pokemon take no damage from it while everyone else takes 3 a turn, Water skills are transformed into Ice-typed piercing damage for the duration, Ice skills besides Blizzard hit harder and cannot be evaded, and Fire skills are weakened. Ice Beam\'s stun is now guaranteed instead of a coin flip whenever Snowstorm is already up.',
        },
        {
            type: 'paragraph',
            text: 'Moltres\'s Sunny Day has been renamed Wildfire and now summons a 4-turn Wildfire weather instead of a simple self-buff: Fire skills hit harder, Water skills are weakened, Grass skills get cheaper, and Electric skills get more expensive, while Moltres herself banks extra Heat for every skill she uses while it\'s active.',
        },
        {
            type: 'paragraph',
            text: 'Zapdos\'s Thunderbolt has been renamed Thunderstorm and now summons a 4-turn Thunderstorm weather: any harmful enemy skill aimed at Zapdos\'s team gets punished with piercing damage and a cooldown penalty, Electric skills besides Thunderstorm hit harder, and a random Pokemon on the field takes piercing damage and has its cooldowns paralyzed every turn. Recasting Thunderstorm detonates it early for a burst of team-wide piercing damage and ends the weather. Zap Cannon now correctly resolves instantly off of a fully-charged Charge, matching its stated interaction.',
        },
        {
            type: 'paragraph',
            text: 'On the animation side, skills in Pokemon Arena now fly an elemental sprite from the caster to the target before bursting on impact, colored and shaped to the move\'s type, with a matching effect on faint. These use the game\'s purchased pixel-effects packs, credited on the in-game manual page.',
        },
        {
            type: 'paragraph',
            text: 'Finally, the character select screen now has its own News button (in both the classic and new selection layouts) that opens the exact same news posts players see on the front page, filtered to whichever arena you\'re browsing, without ever leaving the select screen. It opens and closes on demand and remembers nothing between visits, so it stays out of the way until you want it.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.3.2 introduces a full weather system to battle, reworks all three legendary birds around it, and adds a battle animation layer built on top of the game\'s pixel-art effects packs. This is one of the largest single updates Pokemon Arena has shipped.',
        'Weather is a new match-wide condition that either team can summon. While active, it changes damage by move type, changes energy costs, can make certain effects unmissable, and ticks its own damage every turn. Weather is always fully visible to both players: a banner in the corner of the screen shows the current weather and how many turns are left, and a large countdown alert pops up in the middle of the screen the moment weather starts and every time its timer counts down, so it is always obvious to both players exactly what is happening and when it will end.',
        'Even players who have battle animations turned off still see weather happen: the entire arena background now changes to match whichever weather is active (a dedicated Snowstorm, Wildfire, or Lightning Storm background), on top of a new default arena background used the rest of the time.',
        'For players with animations on, each weather type also has its own full-screen ambient effect. Snowstorm covers the arena in falling snow. Wildfire sets character portraits and skill bars flickering with fire. Thunderstorm fills the screen with drifting static and strikes it with random lightning flashes, synced to a thunder sound.',
        'Articuno\'s Blizzard now costs more and summons a 4-turn Snowstorm instead of just hitting the enemy team: Ice and Water Pokemon take no damage from it while everyone else takes 3 a turn, Water skills are transformed into Ice-typed piercing damage for the duration, Ice skills besides Blizzard hit harder and cannot be evaded, and Fire skills are weakened. Ice Beam\'s stun is now guaranteed instead of a coin flip whenever Snowstorm is already up.',
        'Moltres\'s Sunny Day has been renamed Wildfire and now summons a 4-turn Wildfire weather instead of a simple self-buff: Fire skills hit harder, Water skills are weakened, Grass skills get cheaper, and Electric skills get more expensive, while Moltres herself banks extra Heat for every skill she uses while it\'s active.',
        'Zapdos\'s Thunderbolt has been renamed Thunderstorm and now summons a 4-turn Thunderstorm weather: any harmful enemy skill aimed at Zapdos\'s team gets punished with piercing damage and a cooldown penalty, Electric skills besides Thunderstorm hit harder, and a random Pokemon on the field takes piercing damage and has its cooldowns paralyzed every turn. Recasting Thunderstorm detonates it early for a burst of team-wide piercing damage and ends the weather. Zap Cannon now correctly resolves instantly off of a fully-charged Charge, matching its stated interaction.',
        'On the animation side, skills in Pokemon Arena now fly an elemental sprite from the caster to the target before bursting on impact, colored and shaped to the move\'s type, with a matching effect on faint. These use the game\'s purchased pixel-effects packs, credited on the in-game manual page.',
        'Finally, the character select screen now has its own News button (in both the classic and new selection layouts) that opens the exact same news posts players see on the front page, filtered to whichever arena you\'re browsing, without ever leaving the select screen. It opens and closes on demand and remembers nothing between visits, so it stays out of the way until you want it.',
    ],
    changes: [
        {
            text: 'New match-wide weather system: Snowstorm, Wildfire, and Thunderstorm can each be summoned by a legendary bird and change damage by move type, change energy costs, and tick their own damage every turn. A corner banner and a big center-screen countdown alert always show the active weather and its remaining turns to both players.',
            changeType: 'quality',
            characterName: 'Weather System',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'The arena background now changes to a dedicated image for whichever weather is active, and there is a new default arena background otherwise, so the weather is visible even with battle animations turned off.',
            changeType: 'quality',
            characterName: 'Weather Backgrounds',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Snowstorm now covers the screen in falling snow, Wildfire sets character portraits and skill bars on fire, and Thunderstorm fills the screen with static and random lightning strikes, for players with battle animations on.',
            changeType: 'quality',
            characterName: 'Ambient Weather Effects',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Blizzard now costs more, summons a 4-turn Snowstorm (Ice/Water immune, everyone else takes 3 a turn, Water becomes piercing Ice damage, Ice hits harder and cannot be evaded, Fire is weakened), and Ice Beam\'s stun is guaranteed instead of a 50% chance whenever Snowstorm is already active.',
            changeType: 'rework',
            characterId: 'articuno',
            characterName: 'Articuno',
            facePicture: articunoArt,
            skillId: 'articuno-blizzard',
            skillName: 'Blizzard',
            skillimage: 'assets/images/PokemonArena/articuno/blizzard.png',
        },
        {
            text: 'Sunny Day has been renamed Wildfire and now summons a 4-turn Wildfire weather (Fire hits harder, Water is weakened, Grass gets cheaper, Electric gets more expensive) instead of a plain self-buff, and grants Moltres bonus Heat for every skill used while it lasts.',
            changeType: 'rework',
            characterId: 'moltres',
            characterName: 'Moltres',
            facePicture: moltresArt,
            skillId: 'moltres-sunny-day',
            skillName: 'Wildfire',
            skillimage: 'assets/images/PokemonArena/moltres/sunnyday.png',
        },
        {
            text: 'Thunderbolt has been renamed Thunderstorm and now summons a 4-turn Thunderstorm weather (harmful enemy skills against Zapdos\'s team trigger piercing counter-damage and a cooldown penalty, Electric hits harder, a random Pokemon takes piercing damage and has cooldowns paralyzed each turn); recasting detonates it early for team-wide piercing damage and ends the weather.',
            changeType: 'rework',
            characterId: 'zapdos',
            characterName: 'Zapdos',
            facePicture: zapdosArt,
            skillId: 'zapdos-thunderbolt',
            skillName: 'Thunderstorm',
            skillimage: 'assets/images/PokemonArena/zapdos/thunderbolt.webp',
        },
        {
            text: 'Zap Cannon now correctly resolves instantly once Charge has been active for 2 full turns, matching what both skills\' descriptions already promised.',
            changeType: 'quality',
            characterId: 'zapdos',
            characterName: 'Zapdos',
            facePicture: zapdosArt,
            skillId: 'zapdos-zap-cannon',
            skillName: 'Zap Cannon',
            skillimage: 'assets/images/PokemonArena/zapdos/zapcanon.png',
        },
        {
            text: 'Pokemon Arena skills now fly a type-colored elemental sprite from the caster to the target and burst on impact, with a matching effect on faint, using the game\'s purchased pixel-effects packs (credited on the manual page).',
            changeType: 'quality',
            characterName: 'Battle Animations',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'The character select screen now has a News button, in both the classic and new selection layouts, that opens the same news posts shown on the front page for the current arena without leaving the select screen.',
            changeType: 'quality',
            characterName: 'In-Game News',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncPokemonArenaV332News() {
    if (!uri) {
        throw new Error('MONGODB_URI is required.');
    }

    const client = new MongoClient(uri, { family: 4 });
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
        console.log('Synced Pokemon Arena Update V.3.3.2 news.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaV332News().catch((error) => {
    console.error(error);
    process.exit(1);
});
