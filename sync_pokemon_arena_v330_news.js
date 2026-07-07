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

const skillShowcase = (characterId, skillId, text, changeType = 'new', overrides = {}) => {
    const character = getCharacter(characterId);
    const skill = getSkill(character, skillId);
    return {
        text,
        changeType,
        characterId: character.characterId,
        characterName: character.name,
        facePicture: overrides.facePicture || character.facePicture,
        groupKey: overrides.groupKey || '',
        groupName: overrides.groupName || '',
        skillId: skill.id,
        skillName: overrides.skillName || skill.name,
        skillimage: overrides.skillimage || skill.skillimage,
    };
};

const now = new Date();
const pikachu = getCharacter('pikachu');
const raichuFace = 'assets/images/PokemonArena/Pikachu/skins/raichu/fp.webp';
const goldenMagikarpFace = 'assets/images/PokemonArena/magikarp/skins/gold/goldenfp.jpeg';
const redGyaradosFace = 'assets/images/PokemonArena/magikarp/skins/gold/redfp.jpeg';
const charizardFace = 'assets/images/PokemonArena/Charmander/skins/charizard/charizardfp.jpg';
const megaCharizardXFace = 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXFP.webp';
const megaCharizardYFace = 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYFP.webp';

const newsPost = {
    title: 'Pokemon Arena Update V.3.3.0',
    blocks: [
        {
            type: 'paragraph',
            text: 'Pokemon Arena Update V.3.3.0 is a bug-fix, progression, and cosmetics update focused on match stability, unlock points, and the first live skin rollout.',
        },
        {
            type: 'paragraph',
            text: 'The biggest battle fix in this pass is turn-end stability. A server-side effect-resolution crash that could leave players stuck on a broken in-game screen has been patched, and stale active-match cleanup was checked live afterward.',
        },
        {
            type: 'paragraph',
            text: 'Unlock points now have live PayPal purchase options in both Pokemon Arena and Comic Arena. Players can buy 750 points for $5 USD, 1,500 points for $10 USD, or 3,000 points for $20 USD directly from the missions and unlock flow.',
        },
        {
            type: 'paragraph',
            text: 'Players can also keep earning unlock points for free just by playing ladder. Each ranked win gives 10 unlock points, and each ranked loss still gives 3 unlock points, so skins and character unlocks can be earned without paying.',
        },
        {
            type: 'paragraph',
            text: 'This release also introduces the new Pokemon skin system. Skins are unlocked with points, and the first live skins are Raichu for Pikachu at 750 points, Golden Magikarp for 1,000 points, and Charizard for Charmander at 1,250 points. Magikarp evolves into a red Gyarados skin, while the Charizard skin branches into Mega Charizard X if Scratch triggers the evolution or Mega Charizard Y if Ember or Flamethrower triggers it.',
        },
        {
            type: 'paragraph',
            text: 'A few Pokemon Arena presentation and roster details were also cleaned up: the Pokemon missions page now uses the correct title, its Pokemon and Comic character tabs are clickable, the character roster is ordered by Pokedex number with Pokemon Trainer first, and the in-battle skill scroll now shows a Pokeball instead of the leftover Spider-Man image.',
        },
        {
            type: 'paragraph',
            text: 'Balance and ladder handling were tightened up too. Pikachu’s mission was made easier, Magneton’s Thunder Wave now costs 2 Genjutsu, and ladder surrender rewards were adjusted so surrendering players do not gain ranked points and repeat surrender quits no longer feed free ranked rewards to the winner.',
        },
    ],
    paragraphs: [
        'Pokemon Arena Update V.3.3.0 is a bug-fix, progression, and cosmetics update focused on match stability, unlock points, and the first live skin rollout.',
        'The biggest battle fix in this pass is turn-end stability. A server-side effect-resolution crash that could leave players stuck on a broken in-game screen has been patched, and stale active-match cleanup was checked live afterward.',
        'Unlock points now have live PayPal purchase options in both Pokemon Arena and Comic Arena. Players can buy 750 points for $5 USD, 1,500 points for $10 USD, or 3,000 points for $20 USD directly from the missions and unlock flow.',
        'Players can also keep earning unlock points for free just by playing ladder. Each ranked win gives 10 unlock points, and each ranked loss still gives 3 unlock points, so skins and character unlocks can be earned without paying.',
        'This release also introduces the new Pokemon skin system. Skins are unlocked with points, and the first live skins are Raichu for Pikachu at 750 points, Golden Magikarp for 1,000 points, and Charizard for Charmander at 1,250 points. Magikarp evolves into a red Gyarados skin, while the Charizard skin branches into Mega Charizard X if Scratch triggers the evolution or Mega Charizard Y if Ember or Flamethrower triggers it.',
        'A few Pokemon Arena presentation and roster details were also cleaned up: the Pokemon missions page now uses the correct title, its Pokemon and Comic character tabs are clickable, the character roster is ordered by Pokedex number with Pokemon Trainer first, and the in-battle skill scroll now shows a Pokeball instead of the leftover Spider-Man image.',
        'Balance and ladder handling were tightened up too. Pikachu’s mission was made easier, Magneton’s Thunder Wave now costs 2 Genjutsu, and ladder surrender rewards were adjusted so surrendering players do not gain ranked points and repeat surrender quits no longer feed free ranked rewards to the winner.',
    ],
    changes: [
        skillShowcase(
            'pikachu',
            'pikachu-thundershock',
            'Pikachu keeps his original Thundershock art in the first half of the skin showcase so players can compare the base version directly against Raichu.',
            'new',
            {
                facePicture: pikachu.facePicture,
                groupKey: 'pikachu-base-showcase',
                groupName: 'Pikachu',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-volt-tackle',
            'Volt Tackle remains part of Pikachu’s normal skill art set in the base showcase.',
            'new',
            {
                facePicture: pikachu.facePicture,
                groupKey: 'pikachu-base-showcase',
                groupName: 'Pikachu',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-thunder',
            'Thunder appears here with its original Pikachu art before the Raichu skin version right after it.',
            'new',
            {
                facePicture: pikachu.facePicture,
                groupKey: 'pikachu-base-showcase',
                groupName: 'Pikachu',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-agility',
            'Agility is also shown in the base Pikachu set for a direct before-and-after skin comparison.',
            'new',
            {
                facePicture: pikachu.facePicture,
                groupKey: 'pikachu-base-showcase',
                groupName: 'Pikachu',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-passive-static',
            'Static closes the normal Pikachu art set before the Raichu skin entries begin.',
            'new',
            {
                facePicture: pikachu.facePicture,
                groupKey: 'pikachu-base-showcase',
                groupName: 'Pikachu',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-thundershock',
            'Raichu is the first live Pokemon skin and replaces Pikachu’s portrait with full custom skin art.',
            'new',
            {
                facePicture: raichuFace,
                groupKey: 'pikachu-raichu-showcase',
                groupName: 'Raichu Skin',
                skillName: 'Raichu Skin Portrait',
                skillimage: raichuFace,
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-thundershock',
            'Raichu skin art for Thundershock is now live in the skill browser and selection unlock view.',
            'new',
            {
                facePicture: raichuFace,
                groupKey: 'pikachu-raichu-showcase',
                groupName: 'Raichu Skin',
                skillimage: 'assets/images/PokemonArena/Pikachu/skins/raichu/skill1.webp',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-volt-tackle',
            'Volt Tackle also gets its own Raichu swap so the first skin covers the full active kit.',
            'new',
            {
                facePicture: raichuFace,
                groupKey: 'pikachu-raichu-showcase',
                groupName: 'Raichu Skin',
                skillimage: 'assets/images/PokemonArena/Pikachu/skins/raichu/skill2.webp',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-thunder',
            'Thunder uses a dedicated Raichu art card as part of the first skin rollout.',
            'new',
            {
                facePicture: raichuFace,
                groupKey: 'pikachu-raichu-showcase',
                groupName: 'Raichu Skin',
                skillimage: 'assets/images/PokemonArena/Pikachu/skins/raichu/skill3.webp',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-agility',
            'Agility now has matching Raichu skin art so the support side of Pikachu’s kit is covered too.',
            'new',
            {
                facePicture: raichuFace,
                groupKey: 'pikachu-raichu-showcase',
                groupName: 'Raichu Skin',
                skillimage: 'assets/images/PokemonArena/Pikachu/skins/raichu/skill4.webp',
            }
        ),
        skillShowcase(
            'pikachu',
            'pikachu-passive-static',
            'Static completes the Raichu set with its own passive skin image, giving the first Pokemon skin a full 6-image package.',
            'new',
            {
                facePicture: raichuFace,
                groupKey: 'pikachu-raichu-showcase',
                groupName: 'Raichu Skin',
                skillimage: 'assets/images/PokemonArena/Pikachu/skins/raichu/skill5.webp',
            }
        ),
        skillShowcase(
            'magikarp',
            'magikarp-tackle',
            'Golden Magikarp joins the skin roster at 1,000 points with a custom portrait before the rest of its gold skill set.',
            'new',
            {
                facePicture: goldenMagikarpFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillName: 'Golden Magikarp Portrait',
                skillimage: goldenMagikarpFace,
            }
        ),
        skillShowcase(
            'magikarp',
            'magikarp-tackle',
            'Tackle now has its own golden skin art for Magikarp.',
            'new',
            {
                facePicture: goldenMagikarpFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/goldentackle.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'magikarp-splash',
            'Splash is also reskinned so Magikarp keeps the full gold look before evolution.',
            'new',
            {
                facePicture: goldenMagikarpFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/goldensplash.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'magikarp-flail',
            'Flail carries the golden Magikarp art into the rest of the base kit.',
            'new',
            {
                facePicture: goldenMagikarpFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/goldenflail.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'magikarp-struggle',
            'Struggle gets matching golden art as part of the full Magikarp skin package.',
            'new',
            {
                facePicture: goldenMagikarpFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/goldenstruggle.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'magikarp-passive-evolution-gyarados',
            'The evolution passive now previews Golden Magikarp turning into a red Gyarados skin.',
            'new',
            {
                facePicture: goldenMagikarpFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/goldenevolutiongyarados.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'gyarados-hyper-beam',
            'After evolving, the skin swaps over to a red Gyarados portrait instead of the normal blue one.',
            'new',
            {
                facePicture: redGyaradosFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillName: 'Red Gyarados Portrait',
                skillimage: redGyaradosFace,
            }
        ),
        skillShowcase(
            'magikarp',
            'gyarados-hyper-beam',
            'Hyper Beam gets its own red Gyarados skin art after the evolution.',
            'new',
            {
                facePicture: redGyaradosFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/redhyperbeam.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'gyarados-dragon-rage',
            'Dragon Rage is also part of the evolved red Gyarados skin set.',
            'new',
            {
                facePicture: redGyaradosFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/reddragonrage.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'gyarados-ice-fang',
            'Ice Fang keeps the red Gyarados look going after Magikarp evolves.',
            'new',
            {
                facePicture: redGyaradosFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/redicefang.jpeg',
            }
        ),
        skillShowcase(
            'magikarp',
            'gyarados-hydro-pump',
            'Hydro Pump completes the evolved red Gyarados skin showcase.',
            'new',
            {
                facePicture: redGyaradosFace,
                groupKey: 'magikarp-golden-showcase',
                groupName: 'Golden Magikarp Skin',
                skillimage: 'assets/images/PokemonArena/magikarp/skins/gold/redhydropump.jpeg',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-ember',
            'Charizard joins the skin shop at 1,250 points with a full custom portrait before the rest of the legendary skin set takes over.',
            'new',
            {
                facePicture: charizardFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Charizard Skin Portrait',
                skillimage: charizardFace,
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-ember',
            'Ember opens the Charizard skin set with its own custom art on Charmander’s base form.',
            'new',
            {
                facePicture: charizardFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill1.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-scratch',
            'Scratch gets matching Charizard skin art and is the branch that sends the skin into Mega Charizard X if it triggers the evolution.',
            'new',
            {
                facePicture: charizardFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill2.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-flamethrower',
            'Flamethrower keeps the Charizard skin look on the base form and is one of the evolution triggers that routes the skin into Mega Charizard Y.',
            'new',
            {
                facePicture: charizardFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill3.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-rage',
            'Rage completes the base Charizard legendary skin set with its own fourth active art card.',
            'new',
            {
                facePicture: charizardFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardskill4.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-passive-evolution-charmeleon',
            'The legendary passive text now explains the skin branch directly: Scratch creates Mega Charizard X, while Ember or Flamethrower creates Mega Charizard Y.',
            'new',
            {
                facePicture: charizardFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Legendary Evolution - Charizard',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYpassive.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-fire-punch',
            'After the normal evolution hits, the skin first presents Charizard before the branch-specific mega portraits and art swaps take over.',
            'new',
            {
                facePicture: charizardFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Charizard Portrait',
                skillimage: charizardFace,
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-fire-punch',
            'If Scratch is the proc that activates the evolution, the skin swaps to Mega Charizard X with its own portrait and Fire Punch art.',
            'new',
            {
                facePicture: megaCharizardXFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Mega Charizard X Fire Punch',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXSkill1.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-dragon-claw',
            'Mega Charizard X also gets its own Dragon Claw skin art once the Scratch branch locks in.',
            'new',
            {
                facePicture: megaCharizardXFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Mega Charizard X Dragon Claw',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXskill2.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-passive-evolution-charmeleon',
            'Mega Charizard X also has its own passive card in the skin set for the Scratch-triggered evolution branch.',
            'new',
            {
                facePicture: megaCharizardXFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Mega Charizard X Passive',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXpassive.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-charmeleon-flamethrower',
            'Mega Charizard X keeps its own Flamethrower art card once the Scratch branch is the one that triggered the evolution.',
            'new',
            {
                facePicture: megaCharizardXFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: "Mega Charizard X's Flamethrower",
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXskill3.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-charmeleon-rage',
            'Mega Charizard X Rage completes the full four-skill branch art set after Scratch procs the evolution.',
            'new',
            {
                facePicture: megaCharizardXFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: "Mega Charizard X's Rage",
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardXskill4.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-fire-punch',
            'If Ember or Flamethrower is the proc that activates the evolution, the skin instead swaps to Mega Charizard Y with its own portrait and Fire Punch art.',
            'new',
            {
                facePicture: megaCharizardYFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Mega Charizard Y Fire Punch',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill1.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-passive-evolution-charmeleon',
            'Mega Charizard Y also has its own passive card in the skin set for the Ember or Flamethrower-triggered evolution branch.',
            'new',
            {
                facePicture: megaCharizardYFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Mega Charizard Y Passive',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYpassive.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-dragon-claw',
            'Mega Charizard Y also gets its own Dragon Claw art once Ember or Flamethrower is the proc that locked in the branch.',
            'new',
            {
                facePicture: megaCharizardYFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: 'Mega Charizard Y Dragon Claw',
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill2.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-charmeleon-flamethrower',
            'Mega Charizard Y keeps its own Flamethrower art card once the Ember or Flamethrower branch is the one that triggered the evolution.',
            'new',
            {
                facePicture: megaCharizardYFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: "Mega Charizard Y's Flamethrower",
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill3.webp',
            }
        ),
        skillShowcase(
            'charmander',
            'charmander-charmeleon-rage',
            'Mega Charizard Y Rage completes the full four-skill branch art set after Ember or Flamethrower procs the evolution.',
            'new',
            {
                facePicture: megaCharizardYFace,
                groupKey: 'charmander-charizard-showcase',
                groupName: 'Charizard Skin',
                skillName: "Mega Charizard Y's Rage",
                skillimage: 'assets/images/PokemonArena/Charmander/skins/charizard/charizardYskill4.webp',
            }
        ),
        skillShowcase(
            'magnemite',
            'magnemite-thunder-wave',
            'Magneton and Magnemite thunder-wave costs were corrected so the move now spends 2 Genjutsu as intended.',
            'fix'
        ),
        skillShowcase(
            'pikachu',
            'pikachu-passive-static',
            'Pikachu mission progress was eased up to make the unlock path more reasonable for players building into the new Raichu skin.',
            'fix'
        ),
    ],
    author: 'kito',
    createdAt: now,
    updatedAt: now,
};

async function syncPokemonArenaV330News() {
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

        console.log('Synced Pokemon Arena Update V.3.3.0 news.');
    } finally {
        await client.close();
    }
}

syncPokemonArenaV330News().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
