const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const now = new Date();
const genericArt = 'assets/images/PokemonArena/found-pokeball.png';
const magikarpArt = 'assets/images/PokemonArena/magikarp/magikarpfp.png';
const battleArt = 'assets/images/PokemonArena/newbattlepic/1783150082785.png';

const newsPost = {
    title: 'Pokemon Arena Update V.3.3.1',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.3.1 is a full site-presentation and battle-fix update focused on the naruto-arena.com-style homepage rollout, cleaner page consistency across the public site, and a long list of in-game bug fixes that were directly affecting live matches.',
        },
        {
            type: 'paragraph',
            text: 'The public site was overhauled to mirror the original naruto-arena.com layout much more closely while keeping the project comic-and-Pokemon themed. The homepage, linked public pages, navigation flow, and overall presentation were rebuilt around that classic layout, while the selection page and the in-game battle screen were intentionally kept on their own separate battle-specific layouts instead of inheriting homepage art by mistake.',
        },
        {
            type: 'paragraph',
            text: 'Several presentation regressions were cleaned up across the live flow: the Anime Arena partner banner was restored on the front page, the Play Comic Arena and Play Pokemon Arena links were repositioned in the main navigation, and character templates were tightened up so players no longer have to scroll just to read a full template cleanly.',
        },
        {
            type: 'paragraph',
            text: 'A major Pokemon Arena battle cleanup also landed. Pokemon matches now keep the same battle background for the full match instead of changing when skills are clicked or energy is assigned, skin face pictures now load correctly in battle, skin skill icons now appear in battle, and the in-game battle image was updated to use the current newbattlepic art instead of drifting between inconsistent assets.',
        },
        {
            type: 'paragraph',
            text: 'Match flow and ranked handling were tightened up too. The selection and in-game screens were separated back out after homepage styling bled into battle, ladder surrender handling was fixed so surrendering players lose the ranked experience they are supposed to lose, and stuck-match recovery was improved so battle state can resync more reliably when the live turn flow stalls.',
        },
        {
            type: 'paragraph',
            text: 'The health and protection display received a hard cleanup as well. The blue protection overlay that could fully cover an evolved Pokemon health bar was removed from battle rendering altogether, so HP stays readable after evolution instead of being replaced by a misleading blue strip.',
        },
        {
            type: 'paragraph',
            text: 'A large batch of move and status fixes also shipped. Magikarp can use Struggle correctly again, Gyarados no longer leaves Dragon Rage icons stuck on targets after death, Dragon Rage now deals its damage at the end of Gyarados\'s turns instead of waiting for the opponent\'s turn cycle, and both Hyper Beam versions now sit at a 3-turn cooldown.',
        },
        {
            type: 'paragraph',
            text: 'Battle responsiveness was improved directly on the client too. Queued skills now reserve chakra immediately instead of waiting on a delayed server response, opponent portrait clicks now open their wins, losses, streak, and clan in the same right-side info panel used for skills, and a new timeout failsafe now forces a live match resync if the enemy timer hits 0 but the turn does not actually advance.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.3.1 is a full site-presentation and battle-fix update focused on the naruto-arena.com-style homepage rollout, cleaner page consistency across the public site, and a long list of in-game bug fixes that were directly affecting live matches.',
        'The public site was overhauled to mirror the original naruto-arena.com layout much more closely while keeping the project comic-and-Pokemon themed. The homepage, linked public pages, navigation flow, and overall presentation were rebuilt around that classic layout, while the selection page and the in-game battle screen were intentionally kept on their own separate battle-specific layouts instead of inheriting homepage art by mistake.',
        'Several presentation regressions were cleaned up across the live flow: the Anime Arena partner banner was restored on the front page, the Play Comic Arena and Play Pokemon Arena links were repositioned in the main navigation, and character templates were tightened up so players no longer have to scroll just to read a full template cleanly.',
        'A major Pokemon Arena battle cleanup also landed. Pokemon matches now keep the same battle background for the full match instead of changing when skills are clicked or energy is assigned, skin face pictures now load correctly in battle, skin skill icons now appear in battle, and the in-game battle image was updated to use the current newbattlepic art instead of drifting between inconsistent assets.',
        'Match flow and ranked handling were tightened up too. The selection and in-game screens were separated back out after homepage styling bled into battle, ladder surrender handling was fixed so surrendering players lose the ranked experience they are supposed to lose, and stuck-match recovery was improved so battle state can resync more reliably when the live turn flow stalls.',
        'The health and protection display received a hard cleanup as well. The blue protection overlay that could fully cover an evolved Pokemon health bar was removed from battle rendering altogether, so HP stays readable after evolution instead of being replaced by a misleading blue strip.',
        'A large batch of move and status fixes also shipped. Magikarp can use Struggle correctly again, Gyarados no longer leaves Dragon Rage icons stuck on targets after death, Dragon Rage now deals its damage at the end of Gyarados\'s turns instead of waiting for the opponent\'s turn cycle, and both Hyper Beam versions now sit at a 3-turn cooldown.',
        'Battle responsiveness was improved directly on the client too. Queued skills now reserve chakra immediately instead of waiting on a delayed server response, opponent portrait clicks now open their wins, losses, streak, and clan in the same right-side info panel used for skills, and a new timeout failsafe now forces a live match resync if the enemy timer hits 0 but the turn does not actually advance.',
    ],
    changes: [
        {
            text: 'The homepage and linked public pages were rebuilt around a naruto-arena.com-inspired layout while keeping the site comic and Pokemon themed.',
            changeType: 'quality',
            characterName: 'Site Layout',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'The Anime Arena partner banner was restored on the homepage, public navigation was rearranged, and template screens were cleaned up so full character templates are readable without extra scrolling.',
            changeType: 'quality',
            characterName: 'Homepage Cleanup',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Selection and in-game screens were split back away from homepage styling so battle pages no longer inherit the wrong surrounding layout.',
            changeType: 'quality',
            characterName: 'Battle Layout Separation',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Pokemon battle backgrounds now stay fixed through the full match, skin portraits and skin skill icons load correctly in battle, and the live battle image now uses the newbattlepic art consistently.',
            changeType: 'quality',
            characterName: 'Pokemon Battle Presentation',
            facePicture: battleArt,
            skillId: '',
            skillName: '',
            skillimage: battleArt,
        },
        {
            text: 'Ladder surrender results were corrected so surrendering players lose ranked experience instead of slipping out without the proper penalty.',
            changeType: 'quality',
            characterName: 'Ladder Results',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'The blue protection overlay was removed from the in-game health display so evolved Pokemon health bars stay readable.',
            changeType: 'quality',
            characterName: 'Health Bar Cleanup',
            facePicture: genericArt,
            skillId: '',
            skillName: '',
            skillimage: genericArt,
        },
        {
            text: 'Magikarp can use Struggle correctly again, and Gyarados no longer leaves Dragon Rage status icons stuck on enemies after dying.',
            changeType: 'quality',
            characterId: 'magikarp',
            characterName: 'Magikarp / Gyarados',
            facePicture: magikarpArt,
            skillId: 'magikarp-struggle',
            skillName: 'Struggle',
            skillimage: 'assets/images/PokemonArena/magikarp/magikarpstruggle.png',
        },
        {
            text: 'Dragon Rage now ticks at the end of Gyarados\'s turns, and both Hyper Beam versions now have a 3-turn cooldown.',
            changeType: 'balance',
            characterId: 'magikarp',
            characterName: 'Gyarados',
            facePicture: magikarpArt,
            skillId: 'gyarados-dragon-rage',
            skillName: 'Dragon Rage',
            skillimage: 'assets/images/PokemonArena/magikarp/dragonrage.png',
        },
        {
            text: 'Queued skills now reserve chakra immediately, opponent portrait clicks open stats in the skill info panel, and stalled enemy timers now trigger a live resync instead of waiting for a manual refresh.',
            changeType: 'quality',
            characterName: 'Battle Responsiveness',
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

async function syncPokemonArenaV331News() {
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
        console.log('Synced Pokemon Arena Update V.3.3.1 news.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaV331News().catch((error) => {
    console.error(error);
    process.exit(1);
});
