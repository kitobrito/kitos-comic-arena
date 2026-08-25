const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const releaseVersion = 'pokemon-arena-beta-launch-v2';
const newsTitle = 'Alpha No More: Pokemon Arena Enters Beta';

const genericArt = 'assets/images/PokemonArena/found-pokeball.png';
const articunoArt = 'assets/images/PokemonArena/articuno/fp.png';
const zubatArt = 'assets/images/PokemonArena/zubat/zubatfp.webp';
const koffingArt = 'assets/images/PokemonArena/koffing/koffingfp.webp';
const scraggyArt = 'assets/images/PokemonArena/scraggy/fp.png';
const clefairyArt = 'assets/images/PokemonArena/clefairy/fp.webp';
const cyndaquilArt = 'assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png';

const paragraphs = [
    'Pokemon Arena is officially out of Alpha and into Beta. This update is almost entirely about reliability: the turn-by-turn plumbing that decides whether your skill actually confirms, whether your chakra gets spent (or refunded) correctly, and whether the game ends your match promptly once it is over. That is the bar a Beta needs to clear, and this update is what got it there.',
    'To celebrate, every ranked match played over the next 30 days grants a bonus: 30 unlock points for a win, 10 for a loss, up from the usual 10 and 3. No action needed - it applies automatically to every ranked match during the promo window.',
    'On the reliability side: skipped or interrupted actions now correctly refund any chakra you had reserved for them instead of silently eating it, a cap was added to chakra-exchange to stop it from being pushed into unresolvable states, and two separate race conditions were closed - one that could let the matchmaker double-queue a player, and one that could let a match get cleaned up out from under players who were still actively fighting in it. Matches also now end noticeably faster: the ~15 second delay between landing the finishing blow and actually seeing the win screen is gone, because the game no longer makes the winning player wait on a full ladder recalculation across the entire playerbase before showing them the result.',
    "Several UI bugs that made the game feel unreliable even when it wasn't were also fixed: the small skill-icon row at the bottom of the screen was only ever syncing to whichever character's portrait you last clicked, so clicking directly on one of your own skill icons would highlight it without actually showing that character's skills - it now updates correctly either way. A damage-preview tooltip could get trapped behind a neighboring character's portrait when you hovered a targeted skill. The character info panel showed the same information twice (once at the top, once at the bottom) with a redundant \"Skills:\" label. And on the enemy side of the board, a damage-preview popup's text was rendering mirrored and backwards. All four are fixed.",
    "Quality-of-life: double-clicking anywhere on the screen that isn't an actual button now un-queues your most recently queued skill, so backing out of a choice doesn't require hunting for the right undo control. Character-select portraits also got some life breathed into them, with small per-character idle variance and a real confirm animation when you lock a pick in - and the Pokemon evolution cinematic had its expensive blur/filter animation cut down, since it was visibly laggy and undercut the moment it's supposed to sell.",
    "A handful of skills were fixed or reworked. Articuno's Blizzard was incorrectly locking out skills you hadn't even used yet instead of applying its intended cooldown-paralysis - it now behaves like Sheer Cold's already-correct version of the same effect. Scraggy and Scrafty's Focus Blast was incorrectly tagged as a Control skill on top of being Instant; the Control tag has been removed. And a data bug meant re-using certain evolved-form skills (most visibly Golbat's Leech Life right after evolving from Zubat) could replay the evolution cinematic a second time on an already-evolved Pokemon - this affected three separate evolution chains under the hood (Zubat/Golbat, Squirtle/Wartortle, Bulbasaur/Ivysaur) and is now fixed everywhere, with a new automated test guarding against it coming back.",
    'Koffing and Weezing\'s Smokescreen has been renamed Polluted Air (it already summoned a weather by that name) and retuned: it now costs 1 Ninjutsu energy with a 5-turn cooldown, and its per-turn chip damage is now 3 (down from 5) but excludes both Poison and Steel types instead of just Poison. The weather also now fills the battlefield with a persistent drifting toxic haze for its full duration, to match the ambient effects the other weather types already had.',
    'Finally: a brand new 750-point Crobat skin is available for Zubat. It keeps Zubat\'s combat stats and evolution mechanics completely normal, but reskins his portrait (swapping to a swarming Crobat look on evolution), renames his moves (Air Slash, Supersonic, Air Cutter, Whirlwind), and renames his passive evolution skill to "Swarm - Crobat."',
    'Hotfix: a follow-up patch to the Beta launch above, focused on a stats-display bug, some character-select polish, and a couple of skill corrections.',
    "Fixed a bug where a player's in-battle win/loss record and ladder rank could show their Comic Arena stats instead of their Pokemon Arena stats during Pokemon Arena matches. Opponent profile panels shown mid-battle also now display their real win/loss/streak record instead of zeros.",
    'The character-select screen got some added flair: roster portraits now sit with a raised shadow and a slow floating bob, and adding someone to your team flies their portrait over to the team slot with a burst of stars on arrival. Filled team slots get the same floating treatment and hover sound as the roster.',
    'Fixed a layout bug where resizing your browser window to be wide but short (for example, a half-height window on a widescreen monitor) could push the roster, team slots, and match buttons entirely off-screen with no way to scroll to them. Also fixed the mobile toolbar overlapping and partially hiding your player stats card.',
    "Clefairy's Metronome now correctly costs 1 Random energy (it was incorrectly costing 2). Typhlosion's Flame Wheel now splashes 10 affliction damage to the other enemies, down from 15.",
];

const newsPost = {
    title: newsTitle,
    arena: 'pokemon',
    releaseVersion,
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [
        {
            text: 'Pokemon Arena is officially out of Alpha and into Beta.',
            changeType: 'quality',
            characterName: 'Beta Launch',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'For 30 days starting today, ranked wins grant 30 unlock points (up from 10) and ranked losses grant 10 (up from 3). Applies automatically, no action needed.',
            changeType: 'new',
            characterName: 'Ranked Launch Bonus',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Skipped or interrupted actions now correctly refund reserved chakra instead of losing it, chakra-exchange is now capped, and two matchmaking/cleanup race conditions that could double-queue a player or tear down a match still in progress are closed.',
            changeType: 'quality',
            characterName: 'Turn Engine Reliability',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'The ~15 second delay between winning a match and seeing the win screen is gone - the game no longer waits on a full playerbase ladder recalculation before showing you the result.',
            changeType: 'quality',
            characterName: 'Match-End Speed',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: "Fixed the skill-info panel not syncing its small icon row when clicking directly on one of your own skill icons, a damage-preview tooltip rendering behind a neighboring character's portrait, a duplicated info block with a redundant \"Skills:\" label in the character panel, and mirrored/backwards damage-preview text on the enemy side of the board.",
            changeType: 'quality',
            characterName: 'UI Fixes',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Double-clicking anywhere that is not an actual button now un-queues your most recently queued skill. Character-select portraits gained per-character idle variance and a real confirm animation, and the evolution cinematic had its laggy blur/filter animation trimmed down.',
            changeType: 'quality',
            characterName: 'Quality of Life',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: "Blizzard was incorrectly locking out unused skills instead of applying its intended cooldown-paralysis; it now matches Sheer Cold's already-correct behavior.",
            changeType: 'quality',
            characterId: 'articuno',
            characterName: 'Articuno',
            facePicture: articunoArt,
            skillId: 'articuno-blizzard',
            skillName: 'Blizzard',
            skillimage: 'assets/images/PokemonArena/articuno/blizzard.png',
        },
        {
            text: 'Removed the incorrect Control tag from Focus Blast (Instant remains).',
            changeType: 'quality',
            characterId: 'scraggy',
            characterName: 'Scraggy',
            facePicture: scraggyArt,
            skillId: 'scraggy-focus-blast',
            skillName: 'Focus Blast',
            skillimage: genericArt,
        },
        {
            text: "Fixed a data bug that could replay the evolution cinematic on an already-evolved Pokemon when reusing certain evolved-form skills. Affected Zubat/Golbat, Squirtle/Wartortle, and Bulbasaur/Ivysaur; a new automated test guards against it recurring.",
            changeType: 'quality',
            characterId: 'zubat',
            characterName: 'Evolution Animations',
            facePicture: zubatArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Smokescreen has been renamed Polluted Air, now costs 1 Ninjutsu energy with a 5-turn cooldown, and its per-turn tick is now 3 damage excluding both Poison and Steel types (previously 5, Poison-only). The weather now fills the battlefield with a persistent drifting toxic haze for its full duration.',
            changeType: 'rework',
            characterId: 'koffing',
            characterName: 'Koffing / Weezing',
            facePicture: koffingArt,
            skillId: 'koffing-smokescreen',
            skillName: 'Polluted Air',
            skillimage: 'assets/images/PokemonArena/koffing/koffingsmokescreen.webp',
        },
        {
            text: 'New 750-point Crobat skin for Zubat: reskinned portrait (swaps to a swarming Crobat look on evolution), renamed moves (Air Slash, Supersonic, Air Cutter, Whirlwind), and the passive evolution skill renamed "Swarm - Crobat." Combat stats and evolution mechanics are unchanged.',
            changeType: 'new',
            characterId: 'zubat',
            characterName: 'Zubat',
            facePicture: 'assets/images/PokemonArena/zubat/skins/crobat/fp.png',
            skillId: 'zubat-crobat',
            skillName: 'Crobat Skin',
            skillimage: 'assets/images/PokemonArena/zubat/skins/crobat/evolution.png',
        },
        {
            text: "Fixed a player's in-battle win/loss record and ladder rank sometimes displaying their Comic Arena stats instead of their Pokemon Arena stats. Opponent profile panels shown mid-battle now also display a real win/loss/streak record instead of zeros.",
            changeType: 'quality',
            characterName: 'Arena Stat Display',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Roster portraits now sit with a raised shadow and a slow floating bob, and adding someone to your team flies their portrait over to the team slot with a burst of stars on arrival. Filled team slots share the same floating treatment and hover sound as the roster.',
            changeType: 'quality',
            characterName: 'Character Select Polish',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Fixed a layout bug where a wide-but-short browser window could push the roster, team slots, and match buttons entirely off-screen with no way to reach them, and fixed the mobile toolbar overlapping and hiding the player stats card.',
            changeType: 'quality',
            characterName: 'Selection Screen Layout',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Metronome now correctly costs 1 Random energy (was incorrectly costing 2).',
            changeType: 'quality',
            characterId: 'clefairy',
            characterName: 'Clefairy',
            facePicture: clefairyArt,
            skillId: 'clefairy-metronome',
            skillName: 'Metronome',
            skillimage: 'assets/images/PokemonArena/clefairy/metronome.png',
        },
        {
            text: 'Flame Wheel now splashes 10 affliction damage to the other enemies, down from 15.',
            changeType: 'balance',
            characterId: 'cyndaquil',
            characterName: 'Typhlosion',
            facePicture: cyndaquilArt,
            skillId: 'cyndaquil-typhlosion-flame-wheel',
            skillName: 'Flame Wheel',
            skillimage: 'assets/images/PokemonArena/Cyndaquil/typhlosion/typhlosionflamewheel.png',
        },
    ],
    author: 'kito',
};

async function syncPokemonArenaBetaLaunchNews(db, options = {}) {
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
    const client = new MongoClient(uri, { family: 4 });
    try {
        await client.connect();
        await syncPokemonArenaBetaLaunchNews(client.db(dbName));
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

module.exports = { newsPost, syncPokemonArenaBetaLaunchNews };
