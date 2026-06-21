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
        changeType: 'new',
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
    title: 'Comic Arena Update V.3.1.3',
    blocks: [
        {
            type: 'paragraph',
            text: 'Comic Arena Update V.3.1.3 adds Poison Ivy to the roster with her plant-heavy control kit, her new mission art, and the kind of battlefield pressure that keeps teams rooted in place.',
        },
        {
            type: 'paragraph',
            text: 'Doctor Strange has also been rebuilt from the ground up around the new redesign template, with a fresh mystic kit that leans on Arcane Energy, Zom, and a more aggressive spell loop.',
        },
        {
            type: 'paragraph',
            text: 'On top of the character work, Pokemon Arena is now part of the game too, with its own arena flow, selection screens, and battle presentation.',
        },
        {
            type: 'paragraph',
            text: 'Below is a full skill-by-skill rundown for both new characters, including the improved forms Strange can unlock once the Book of the Vishanti starts mutating his kit.',
        },
    ],
    paragraphs: [
        'Comic Arena Update V.3.1.3 adds Poison Ivy to the roster with her plant-heavy control kit, her new mission art, and the kind of battlefield pressure that keeps teams rooted in place.',
        'Doctor Strange has also been rebuilt from the ground up around the new redesign template, with a fresh mystic kit that leans on Arcane Energy, Zom, and a more aggressive spell loop.',
        'On top of the character work, Pokemon Arena is now part of the game too, with its own arena flow, selection screens, and battle presentation.',
        'Below is a full skill-by-skill rundown for both new characters, including the improved forms Strange can unlock once the Book of the Vishanti starts mutating his kit.',
    ],
    changes: [
        skillShowcase(
            'poison-ivy',
            'poison-ivy-vine-forest-growth',
            'Vine Forest Growth is Ivy\'s setup turn: she gives her team 5 destructible defense for 3 turns, starts chipping the enemy team for 5 damage per turn, and swaps her other plant skills into stronger versions while it is active.'
        ),
        skillShowcase(
            'poison-ivy',
            'poison-ivy-carnivorous-plant',
            'Carnivorous Plant hits one enemy for 35 damage and removes 1 non-blue energy from them. While Vine Forest Growth is active, it steals 1 random energy instead, turning it into a stronger drain tool.'
        ),
        skillShowcase('poison-ivy', 'poison-ivy-lashing-thorns', 'Lashing Thorns burns the whole enemy team for 5 affliction damage each turn for 2 turns, and if Vine Forest Growth is active the effect stays up until Ivy dies.'),
        skillShowcase('poison-ivy', 'poison-ivy-vine-entanglement', 'Vine Entanglement deals 20 damage to one enemy and stuns their harmful skills for 1 turn. When Vine Forest Growth is active, it upgrades into the all-enemy version and costs an extra random energy.'),
        skillShowcase('poison-ivy', 'poison-ivy-vine-entanglement-all', 'Vine Entanglement can also hit every enemy at once while Vine Forest Growth is active, keeping the 20 damage and harmful-skill stun on the whole enemy team.'),
        skillShowcase('poison-ivy', 'poison-ivy-plant-doubles', 'Plant Doubles gives Ivy\'s whole team 15% unpierceable damage reduction for 3 turns, adds 5 more destructible defense from defense effects, and shuts off enemy energy drain and removal tricks.'),
        skillShowcase('poison-ivy', 'poison-ivy-grasping-vines', 'Grasping Vines is the Vine Forest Growth upgrade to Lashing Thorns: it deals 5 piercing damage to the enemy team for 3 turns and punishes enemies that do not answer with a new skill by stunning their non-affliction skills for 1 turn.'),
        skillShowcase('poison-ivy', 'poison-ivy-carnivorous-plant-steal', 'Carnivorous Plant\'s Vine Forest Growth version keeps the 35 damage but always steals 1 random energy, letting Ivy squeeze the enemy team harder while her forest is active.'),
        skillShowcase('poison-ivy', 'poison-ivy-branch-entanglement', 'Branch Entanglement is the hidden follow-up after Carnivorous Plant: it deals 20 damage, stuns harmful skills for 1 turn, and then swaps back into Vine Entanglement.'),
        skillShowcase('poison-ivy', 'poison-ivy-passive-healing-fruit', 'Passive: Healing Fruit gives Ivy 1 stack every time she uses a skill. At 3 stacks, she heals 30% of her missing HP and gains the same amount as destructible defense for 1 turn.'),
        skillShowcase('doctor-strange', 'doctor-strange-eldritch-manifestation', 'Eldritch Manifestation deals 20 piercing damage to one enemy, then adds up to 15 more piercing damage based on how much damage they dealt this turn. If they are marked, it adds another 10 piercing damage, stuns them for 1 turn, and readies the Book of the Vishanti.'),
        skillShowcase('doctor-strange', 'doctor-strange-shield-of-the-seraphim', 'Spell of the Seraphim protects allies by giving them 15 destructible defense and making their first damage turn into healing, while enemy targets lose helpful effects, get stunned for 1 turn, and receive Doctor Strange\'s mark.'),
        skillShowcase('doctor-strange', 'doctor-strange-bolts-of-balthakk', 'Flames of the Faltine burns all enemies for 2 turns, dealing 15 affliction damage at the start of each turn and also applying Doctor Strange\'s mark so the rest of his kit can push harder.'),
        skillShowcase('doctor-strange', 'doctor-strange-channel-zom', 'Book of the Vishanti is Strange\'s setup button: after another skill, it empowers his next skill for 2 turns, and after the third use it permanently transforms into Astral Form.'),
        skillShowcase('doctor-strange', 'doctor-strange-zoms-wrath', 'Astral Form lasts 3 turns, blocks harmful and helpful non-damage effects on Strange, and randomly upgrades one of his other skills at the start of each turn while locking that skill for the turn.'),
        skillShowcase('doctor-strange', 'doctor-strange-eldritch-manifestation-improved', 'Improved Eldritch Manifestation reflects the first harmful skill the target tries to use, hitting them back for 35 damage instead.'),
        skillShowcase('doctor-strange', 'doctor-strange-shield-of-the-seraphim-improved', 'Improved Spell of the Seraphim keeps the ally shield, healing conversion, and defense, but enemy targets are stunned for 1 turn and marked as well.'),
        skillShowcase('doctor-strange', 'doctor-strange-bolts-of-balthakk-improved', 'Improved Flames of the Faltine splits 60 affliction damage evenly across all enemies, making the burn much more explosive when Strange is in Astral Form.'),
        skillShowcase('doctor-strange', 'doctor-strange-passive-vishanti-ready', 'Passive: Prepared for the Vishanti makes Doctor Strange ready to use the Book of the Vishanti whenever he uses one of his non-Book skills.'),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
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

        const { createdAt, ...newsPostUpdate } = newsPost;
        await newsPosts.updateOne(
            { title: newsPost.title },
            { $set: { ...newsPostUpdate, updatedAt: new Date() }, $setOnInsert: { createdAt } },
            { upsert: true }
        );

        console.log('Synced Comic Arena Update V.3.1.3 news.');
    } finally {
        await client.close();
    }
}

syncPoisonIvyAndStrangeNews().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
