const { MongoClient } = require('mongodb');
require('dotenv').config();

const characters = require('./characters');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

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

const skillShowcase = (characterId, skillId, text) => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType: 'update',
        characterId: character.characterId,
        characterName: character.name,
        facePicture: character.facePicture,
        skillId: skill.id,
        skillName: skill.name,
        skillimage: skill.skillimage,
    };
};

const now = new Date();

const newsPost = {
    title: 'Pokemon Arena Update V.3.2.3',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.2.3 is a bug-fix and quality-of-life pass focused on match stability, cleaner status info, and a smoother first-match experience.',
        },
        {
            type: 'paragraph',
            text: 'Refreshing during Pokemon matches should no longer dump players into a blank default Comic Arena template, and unauthorized match-state errors now route players back through the proper Pokemon login flow instead of leaving them stranded in battle.',
        },
        {
            type: 'paragraph',
            text: 'Status icons and tooltips were cleaned up so Pokemon effects stop borrowing unrelated Iron Man or chakra text, Koffing now tracks its evolution progress in one icon instead of spamming duplicates, and target selection should feel much more stable instead of dropping clicks after a skill is chosen.',
        },
        {
            type: 'paragraph',
            text: 'This patch also fixes several roster-specific issues: Gastly now deals Curse damage immediately and properly tracks damage taken for evolution, Abra now cashes in Calm Mind correctly on Psychic, Pokemon bot teams can roll from the full Pokemon roster, and several evolution requirements were eased to help forms come online faster.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.2.3 is a bug-fix and quality-of-life pass focused on match stability, cleaner status info, and a smoother first-match experience.',
        'Refreshing during Pokemon matches should no longer dump players into a blank default Comic Arena template, and unauthorized match-state errors now route players back through the proper Pokemon login flow instead of leaving them stranded in battle.',
        'Status icons and tooltips were cleaned up so Pokemon effects stop borrowing unrelated Iron Man or chakra text, Koffing now tracks its evolution progress in one icon instead of spamming duplicates, and target selection should feel much more stable instead of dropping clicks after a skill is chosen.',
        'This patch also fixes several roster-specific issues: Gastly now deals Curse damage immediately and properly tracks damage taken for evolution, Abra now cashes in Calm Mind correctly on Psychic, Pokemon bot teams can roll from the full Pokemon roster, and several evolution requirements were eased to help forms come online faster.',
    ],
    changes: [
        skillShowcase('gastly', 'gastly-curse', 'Gastly and Haunter now deal Curse damage immediately on cast, so the first application no longer feels like a dead turn.'),
        skillShowcase('gastly', 'gastly-passive-evolution-haunter', 'Gastly now correctly tracks battle damage taken toward evolution instead of missing skill-based self-loss and incoming damage cases.'),
        skillShowcase('abra', 'abra-psychic', 'Abra now properly converts Calm Mind into Psychic bonus damage, so the passive payoff matches the kit text.'),
        skillShowcase('koffing', 'koffing-passive-evolution-weezing', 'Koffing now keeps one clean evolution-progress icon instead of spawning multiple duplicate passive trackers and mismatched tooltip text.'),
        skillShowcase('pikachu', 'pikachu-thundershock', 'Pokemon energy wording now uses the updated color language, including Green on Thunder setup text instead of old chakra terms.'),
        skillShowcase('squirtle', 'squirtle-passive-evolution-wartortle', 'Several Pokemon evolution conditions were relaxed, making forms like Wartortle, Ivysaur, Blissey, Pidgeotto, Kadabra, and Charmeleon come online faster.'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncPokemonArenaBugfixQolNews() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);

        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );

        console.log('Synced Pokemon Arena Update V.3.2.3 bug-fix and quality-of-life news.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaBugfixQolNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
