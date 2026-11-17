const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pokemon Arena V.4.1: every reworked kit has one main skill that the others connect to, plus crits.
// Synced at server startup; the same post can also be synced manually:
//   node sync_pokemon_arena_combos_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const newsPost = {
    "title": "Pokemon Arena Update V.4.1: Combos & Crits",
    "arena": "pokemon",
    "blocks": [
        {
            "type": "paragraph",
            "text": "Pokemon Arena Update V.4.1 makes every reworked kit work as a team. Each Pokemon now has one main skill, and every other skill connects back to it."
        },
        {
            "type": "paragraph",
            "text": "The main skill either puts a named mark on enemies, like Burned, Static, Poisoned, Confused or Asleep, or puts the Pokemon in a stance, like In its shell, Focused or Raging. The other skills say plainly how they use it: Charmander's Scratch deals 10 more damage to Burned enemies, Pikachu's Thunder stuns for 2 turns if the target has Static, and Squirtle's Water Gun hits harder while it is in its shell."
        },
        {
            "type": "paragraph",
            "text": "Even the defensive skill pays off: Protect, Detect and the others heal a little if the Pokemon used its main skill last turn, or while it is in its stance. Evolved forms keep the same combo with bigger numbers."
        },
        {
            "type": "paragraph",
            "text": "Critical hits are in. Many attacks have a chance to crit for extra piercing damage, shown right in the skill description, and some stances raise that chance, like Abra's Calm Mind, Scyther's Swords Dance, Hitmonlee's Focus Energy and Meowth's Pay Day."
        },
        {
            "type": "paragraph",
            "text": "Blaziken goes back to its kit from before V.4.0. Community characters, Pidgey, Aerodactyl, Pokemon Trainer and Lance are unchanged."
        }
    ],
    "paragraphs": [
        "Pokemon Arena Update V.4.1 makes every reworked kit work as a team. Each Pokemon now has one main skill, and every other skill connects back to it.",
        "The main skill either puts a named mark on enemies, like Burned, Static, Poisoned, Confused or Asleep, or puts the Pokemon in a stance, like In its shell, Focused or Raging. The other skills say plainly how they use it: Charmander's Scratch deals 10 more damage to Burned enemies, Pikachu's Thunder stuns for 2 turns if the target has Static, and Squirtle's Water Gun hits harder while it is in its shell.",
        "Even the defensive skill pays off: Protect, Detect and the others heal a little if the Pokemon used its main skill last turn, or while it is in its stance. Evolved forms keep the same combo with bigger numbers.",
        "Critical hits are in. Many attacks have a chance to crit for extra piercing damage, shown right in the skill description, and some stances raise that chance, like Abra's Calm Mind, Scyther's Swords Dance, Hitmonlee's Focus Energy and Meowth's Pay Day.",
        "Blaziken goes back to its kit from before V.4.0. Community characters, Pidgey, Aerodactyl, Pokemon Trainer and Lance are unchanged."
    ],
    "changes": [
        {
            "text": "Ember Burns enemies, and every other skill hits Burned enemies harder. Main skill: Ember. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "charmander",
            "characterName": "Charmander",
            "facePicture": "assets/images/PokemonArena/newcharmanderfp.jpeg",
            "skillId": "charmander-ember",
            "skillName": "Ember",
            "skillimage": "assets/images/PokemonArena/Charmander/ember.jpg"
        },
        {
            "text": "Withdraw puts Squirtle in its shell; its water attacks hit harder while it is inside. Main skill: Withdraw. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "squirtle",
            "characterName": "Squirtle",
            "facePicture": "assets/images/PokemonArena/newsquirtlefp.jpeg",
            "skillId": "squirtle-withdraw",
            "skillName": "Withdraw",
            "skillimage": "assets/images/PokemonArena/squirtle/withdraw.webp"
        },
        {
            "text": "Leech Seed drains an enemy; Bulbasaur's other skills are stronger against Seeded enemies. Main skill: Leech Seed. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "bulbasaur",
            "characterName": "Bulbasaur",
            "facePicture": "assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg",
            "skillId": "bulbasaur-leech-seed",
            "skillName": "Leech Seed",
            "skillimage": "assets/images/PokemonArena/Bulbasaur/bulbasaurleechseed.jpg"
        },
        {
            "text": "Thundershock gives Static; Volt Tackle and Thunder punish enemies with Static. Main skill: Thundershock. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "pikachu",
            "characterName": "Pikachu",
            "facePicture": "assets/images/PokemonArena/newpikachufp.jpeg",
            "skillId": "pikachu-thundershock",
            "skillName": "Thundershock",
            "skillimage": "assets/images/PokemonArena/Pikachu/thundershock.jpg"
        },
        {
            "text": "Sleep Powder makes enemies Drowsy; its other skills punish Drowsy enemies. Main skill: Sleep Powder.",
            "changeType": "buff",
            "characterId": "butterfree",
            "characterName": "Butterfree",
            "facePicture": "assets/images/PokemonArena/butterfree/butterfreefp.webp",
            "skillId": "butterfree-sleep-powder",
            "skillName": "Sleep Powder",
            "skillimage": "assets/images/PokemonArena/butterfree/sleeppowder.webp"
        },
        {
            "text": "Softboil heals an ally and puts Chansey on duty as a Nurse; her other skills are stronger while Nursing. Main skill: Softboil.",
            "changeType": "buff",
            "characterId": "chansey",
            "characterName": "Chansey",
            "facePicture": "assets/images/PokemonArena/Chansey/chanseyfp.webp",
            "skillId": "chansey-softboil",
            "skillName": "Softboil",
            "skillimage": "assets/images/PokemonArena/Chansey/softboilforchanseyandblissey.webp"
        },
        {
            "text": "Smog Poisons an enemy; Poison Gas and Self-Destruct hit Poisoned enemies harder. Main skill: Smog.",
            "changeType": "buff",
            "characterId": "koffing",
            "characterName": "Koffing",
            "facePicture": "assets/images/PokemonArena/koffing/koffingfp.webp",
            "skillId": "koffing-smog",
            "skillName": "Smog",
            "skillimage": "assets/images/PokemonArena/koffing/koffingsmog.webp"
        },
        {
            "text": "Supersonic Confuses an enemy; Zubat's bites hit Confused enemies harder. Main skill: Supersonic. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "zubat",
            "characterName": "Zubat",
            "facePicture": "assets/images/PokemonArena/zubat/zubatfp.webp",
            "skillId": "zubat-supersonic",
            "skillName": "Supersonic",
            "skillimage": "assets/images/PokemonArena/zubat/supersonic.webp"
        },
        {
            "text": "Curse haunts an enemy; Lick and Spite are stronger against Cursed enemies. Main skill: Curse.",
            "changeType": "buff",
            "characterId": "gastly",
            "characterName": "Gastly",
            "facePicture": "assets/images/PokemonArena/gastley/gastleyfp.webp",
            "skillId": "gastly-curse",
            "skillName": "Curse",
            "skillimage": "assets/images/PokemonArena/gastley/curse.webp"
        },
        {
            "text": "Calm Mind Focuses Abra; its psychic attacks hit harder and crit more while Focused. Main skill: Calm Mind. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "abra",
            "characterName": "Abra",
            "facePicture": "assets/images/PokemonArena/abra/abrafp.webp",
            "skillId": "abra-calm-mind",
            "skillName": "Calm Mind",
            "skillimage": "assets/images/PokemonArena/abra/calmmind.webp"
        },
        {
            "text": "Leer Exposes an enemy; Krabby's claws crush Exposed enemies. Main skill: Leer. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "krabby",
            "characterName": "Krabby",
            "facePicture": "assets/images/PokemonArena/Krabby/krabbyfp.png",
            "skillId": "krabby-leer",
            "skillName": "Leer",
            "skillimage": "assets/images/PokemonArena/Krabby/krabbybubble.png"
        },
        {
            "text": "Swords Dance Sharpens Scyther's blades; its cuts hit harder and crit more while Sharpened. Main skill: Swords Dance. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "scyther",
            "characterName": "Scyther",
            "facePicture": "assets/images/PokemonArena/scyther/scytherfp.webp",
            "skillId": "scyther-swords-dance",
            "skillName": "Swords Dance",
            "skillimage": "assets/images/PokemonArena/scyther/swordsdance.webp"
        },
        {
            "text": "Swift Locks On to an enemy; Dig and Hidden Power hit the Locked On enemy harder. Main skill: Swift. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "eevee",
            "characterName": "Eevee",
            "facePicture": "assets/images/PokemonArena/eevee/eevee/eeveefp.png",
            "skillId": "eevee-swift",
            "skillName": "Swift",
            "skillimage": "assets/images/PokemonArena/eevee/eevee/swift.png"
        },
        {
            "text": "Pin Missile Paralyzes an enemy; Thunderbolt and Thunder Fang punish Paralyzed enemies. Main skill: Pin Missile. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "jolteon",
            "characterName": "Jolteon",
            "facePicture": "assets/images/PokemonArena/eevee/jolteon/jolteonfp.png",
            "skillId": "jolteon-pin-missile",
            "skillName": "Pin Missile",
            "skillimage": "assets/images/PokemonArena/eevee/jolteon/pinmissile.png"
        },
        {
            "text": "Fire Spin Burns an enemy; Fire Blast and Heating Up punish Burned enemies. Main skill: Fire Spin. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "flareon",
            "characterName": "Flareon",
            "facePicture": "assets/images/PokemonArena/eevee/flareon/flareonfp.png",
            "skillId": "flareon-fire-spin",
            "skillName": "Fire Spin",
            "skillimage": "assets/images/PokemonArena/eevee/flareon/firespin.png"
        },
        {
            "text": "Aqua Ring surrounds the team with water; Vaporeon hits harder and heals more while in its Aqua Ring. Main skill: Aqua Ring. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "vaporeon",
            "characterName": "Vaporeon",
            "facePicture": "assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png",
            "skillId": "vaporeon-sand-attack",
            "skillName": "Aqua Ring",
            "skillimage": "assets/images/PokemonArena/eevee/vaporeon/sandattack.png"
        },
        {
            "text": "Toxic Poisons an enemy; Poison Fang and Wrap are stronger against Poisoned enemies. Main skill: Toxic. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "ekans",
            "characterName": "Ekans",
            "facePicture": "assets/images/PokemonArena/ekans/ekansfp.jpg",
            "skillId": "ekans-toxic",
            "skillName": "Toxic",
            "skillimage": "assets/images/PokemonArena/ekans/skill2.jpg"
        },
        {
            "text": "Bulk Up powers Machop up; its punches hit harder and crit more while Bulked Up. Main skill: Bulk Up. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "machop",
            "characterName": "Machop",
            "facePicture": "assets/images/PokemonArena/machop/machopfp.png",
            "skillId": "machop-bulk-up",
            "skillName": "Bulk Up",
            "skillimage": "assets/images/PokemonArena/machop/machopbulkup.png"
        },
        {
            "text": "Splash makes Magikarp Determined; it fights a little better while Determined, and becomes a raging Gyarados. Main skill: Splash. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "magikarp",
            "characterName": "Magikarp",
            "facePicture": "assets/images/PokemonArena/magikarp/magikarpfp.png",
            "skillId": "magikarp-splash",
            "skillName": "Splash",
            "skillimage": "assets/images/PokemonArena/magikarp/magikarpsplash.png"
        },
        {
            "text": "Light Screen Screens the team; Mr. Mime's other skills get stronger while it is Screened. Main skill: Light Screen.",
            "changeType": "buff",
            "characterId": "mr-mime",
            "characterName": "Mr. Mime",
            "facePicture": "assets/images/PokemonArena/Mr.mime/fp.jpg",
            "skillId": "mr-mime-light-screen",
            "skillName": "Light Screen",
            "skillimage": "assets/images/PokemonArena/Mr.mime/lightscreen.jpg"
        },
        {
            "text": "Fire Punch Burns an enemy; Mega Punch and Thunder Punch punish Burned enemies. Main skill: Fire Punch. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "hitmonchan",
            "characterName": "Hitmonchan",
            "facePicture": "assets/images/PokemonArena/hitmonchan/fp.webp",
            "skillId": "hitmonchan-fire-punch",
            "skillName": "Fire Punch",
            "skillimage": "assets/images/PokemonArena/hitmonchan/firepunch.webp"
        },
        {
            "text": "Focus Energy Focuses Hitmonlee; its kicks hit harder and crit far more while Focused. Main skill: Focus Energy. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "hitmonlee",
            "characterName": "Hitmonlee",
            "facePicture": "assets/images/PokemonArena/hitmonlee/fp.webp",
            "skillId": "hitmonlee-focus-energy",
            "skillName": "Focus Energy",
            "skillimage": "assets/images/PokemonArena/hitmonlee/focusenergy.webp"
        },
        {
            "text": "Thunder Wave Paralyzes an enemy; Spark and Discharge hit Paralyzed enemies harder. Main skill: Thunder Wave. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "magnemite",
            "characterName": "Magnemite",
            "facePicture": "assets/images/PokemonArena/mangemite/magnemitefp.webp",
            "skillId": "magnemite-thunder-wave",
            "skillName": "Thunder Wave",
            "skillimage": "assets/images/PokemonArena/mangemite/magnemitethunderwave.webp"
        },
        {
            "text": "Harden turns Onix to stone; it hits back harder while Hardened. Main skill: Harden.",
            "changeType": "buff",
            "characterId": "onix",
            "characterName": "Onix",
            "facePicture": "assets/images/PokemonArena/onix/fp.webp",
            "skillId": "onix-harden",
            "skillName": "Harden",
            "skillimage": "assets/images/PokemonArena/onix/harden.webp"
        },
        {
            "text": "Pay Day steals energy and makes Meowth Lucky; its claws hit harder and crit more while Lucky. Main skill: Pay Day. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "meowth",
            "characterName": "Meowth",
            "facePicture": "assets/images/PokemonArena/Meowth/meowthnewfacepicture.png",
            "skillId": "meowth-pay-day",
            "skillName": "Pay Day",
            "skillimage": "assets/images/PokemonArena/Meowth/payday.png"
        },
        {
            "text": "Moonlight heals an ally and makes Clefairy Moonlit; its slaps hit harder while Moonlit, and Metronome casts a random surprise. Main skill: Moonlight.",
            "changeType": "buff",
            "characterId": "clefairy",
            "characterName": "Clefairy",
            "facePicture": "assets/images/PokemonArena/clefairy/fp.webp",
            "skillId": "clefairy-moonlight",
            "skillName": "Moonlight",
            "skillimage": "assets/images/PokemonArena/clefairy/moonlight.webp"
        },
        {
            "text": "Sing puts an enemy to Sleep; Pound and Wish are stronger after singing. Main skill: Sing.",
            "changeType": "buff",
            "characterId": "jigglypuff",
            "characterName": "Jigglypuff",
            "facePicture": "assets/images/PokemonArena/jigglypuff/fp.webp",
            "skillId": "jigglypuff-sing",
            "skillName": "Sing",
            "skillimage": "assets/images/PokemonArena/jigglypuff/sing.webp"
        },
        {
            "text": "Poison Sting Poisons an enemy; Twinneedle and Envenom punish Poisoned enemies, then it Mega Evolves. Main skill: Poison Sting. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "beedrill",
            "characterName": "Beedrill",
            "facePicture": "assets/images/PokemonArena/beedrill/FP.png",
            "skillId": "beedrill-poison-sting",
            "skillName": "Poison Sting",
            "skillimage": "assets/images/PokemonArena/beedrill/poisonsting.webp"
        },
        {
            "text": "Blizzard brings a Snowstorm; Ice Beam and Sheer Cold are stronger in the snow. Main skill: Blizzard. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "articuno",
            "characterName": "Articuno",
            "facePicture": "assets/images/PokemonArena/articuno/fp.png",
            "skillId": "articuno-blizzard",
            "skillName": "Blizzard",
            "skillimage": "assets/images/PokemonArena/articuno/blizzard.png"
        },
        {
            "text": "Wildfire Burns everyone and starts a Wildfire; Heat Wave and Overheat punish Burned enemies. Main skill: Wildfire. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "moltres",
            "characterName": "Moltres",
            "facePicture": "assets/images/PokemonArena/moltres/FP.png",
            "skillId": "moltres-fire-spin",
            "skillName": "Wildfire",
            "skillimage": "assets/images/PokemonArena/moltres/firespin.png"
        },
        {
            "text": "Thunderstorm Charges Zapdos up; its lightning hits harder and stuns while Charged. Main skill: Thunderstorm. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "zapdos",
            "characterName": "Zapdos",
            "facePicture": "assets/images/PokemonArena/zapdos/fp.png",
            "skillId": "zapdos-charge",
            "skillName": "Thunderstorm",
            "skillimage": "assets/images/PokemonArena/zapdos/charge.webp"
        },
        {
            "text": "Pink Bubble shields an ally; Mew's psychic power and Life Dew are stronger for Bubbled allies. Main skill: Pink Bubble. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "mew",
            "characterName": "Mew",
            "facePicture": "assets/images/PokemonArena/mew/fp.png",
            "skillId": "mew-pink-bubble",
            "skillName": "Pink Bubble",
            "skillimage": "assets/images/PokemonArena/mew/pinkbarrier.png"
        },
        {
            "text": "Psychic Mind Locks an enemy; Shadow Ball and Drain Punch tear through Mind Locked enemies. Main skill: Psychic. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "mewtwo",
            "characterName": "Mewtwo",
            "facePicture": "assets/images/PokemonArena/mewtwo/fp.png",
            "skillId": "mewtwo-psychic",
            "skillName": "Psychic",
            "skillimage": "assets/images/PokemonArena/mewtwo/psychic.png"
        },
        {
            "text": "Dragon Dance makes Dragonite Dancing; it hits harder and takes less damage while Dancing. Main skill: Dragon Dance. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "dragonite",
            "characterName": "Dragonite",
            "facePicture": "assets/images/PokemonArena/dragonite/fp.png",
            "skillId": "dragonite-dragon-boost",
            "skillName": "Dragon Dance",
            "skillimage": "assets/images/PokemonArena/dragonite/skill 4.png"
        },
        {
            "text": "Ember Burns an enemy; Tackle and Flame Wheel hit Burned enemies harder. Main skill: Ember. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "cyndaquil",
            "characterName": "Cyndaquil",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png",
            "skillId": "cyndaquil-aerial-flamethrower",
            "skillName": "Ember",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/S2.webp"
        },
        {
            "text": "Light Screen Screens the team; Razor Leaf and Synthesis are stronger while Screened. Main skill: Light Screen.",
            "changeType": "buff",
            "characterId": "chikorita",
            "characterName": "Chikorita",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Chikorita/chikoritanewfacepicture.png",
            "skillId": "chikorita-light-screen",
            "skillName": "Light Screen",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Chikorita/s2.webp"
        },
        {
            "text": "Scary Face Scares an enemy; Water Gun and Aqua Tail hit Scared enemies harder. Main skill: Scary Face. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "totodile",
            "characterName": "Totodile",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Totodile/totodilenewfacepicture.png",
            "skillId": "totodile-scary-face",
            "skillName": "Scary Face",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Totodile/S2.webp"
        },
        {
            "text": "Hypnosis puts an enemy to Sleep; Dream Eater and Nightmare feast on Sleeping enemies. Main skill: Hypnosis.",
            "changeType": "buff",
            "characterId": "drowzee",
            "characterName": "Drowzee",
            "facePicture": "assets/images/PokemonArena/Drowzee/FP.webp",
            "skillId": "drowzee-hypnosis",
            "skillName": "Hypnosis",
            "skillimage": "assets/images/PokemonArena/Drowzee/S1.webp"
        },
        {
            "text": "Rage makes Primeape Raging; it hits harder and crits more while Raging. Main skill: Rage. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "primeape",
            "characterName": "Primeape",
            "facePicture": "assets/images/PokemonArena/Primeape/Primeape-FP.jpg",
            "skillId": "primeape-rage-fist",
            "skillName": "Rage",
            "skillimage": "assets/images/PokemonArena/Primeape/Rage-Fist.jpg"
        },
        {
            "text": "Bone Guard readies Marowak's bone; its bone attacks are stronger while Bone Ready. Main skill: Bone Guard. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "marowak",
            "characterName": "Marowak",
            "facePicture": "assets/images/PokemonArena/marowak/facepicture.jpg",
            "skillId": "marowak-bone-guard",
            "skillName": "Bone Guard",
            "skillimage": "assets/images/PokemonArena/marowak/boneguard.jpg"
        },
        {
            "text": "Vice Grip Grips an enemy; X-Scissor and Seismic Toss punish Gripped enemies. Main skill: Vice Grip. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "pinsir",
            "characterName": "Pinsir",
            "facePicture": "assets/images/PokemonArena/pinsir/facepicture.jpg",
            "skillId": "pinsir-vice-grip",
            "skillName": "Vice Grip",
            "skillimage": "assets/images/PokemonArena/pinsir/vicegrip.jpg"
        },
        {
            "text": "Horn Attack makes Tauros Enraged; Take-Down and Earthquake are stronger while Enraged. Main skill: Horn Attack. Has skills that can crit.",
            "changeType": "buff",
            "characterId": "tauros",
            "characterName": "Tauros",
            "facePicture": "assets/images/PokemonArena/tauros/facepicture.jpg",
            "skillId": "tauros-horn-attack",
            "skillName": "Horn Attack",
            "skillimage": "assets/images/PokemonArena/tauros/hornattack.jpg"
        },
        {
            "text": "Blaziken goes back to its kit from before V.4.0, exactly as it was.",
            "changeType": "",
            "characterId": "blaziken",
            "characterName": "Blaziken",
            "facePicture": "assets/images/PokemonArena/blaziken/blazikenfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/blaziken/blazikenfp.webp"
        }
    ],
    "author": "kito"
};

async function syncPokemonArenaCombosNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    await db.collection(newsCollectionName).updateOne(
        { title: newsPost.title },
        { $set: { ...newsPost, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1 };
}

async function runPokemonArenaCombosNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncPokemonArenaCombosNews(client.db(dbName));
        console.log('Synced Pokemon Arena V.4.1 combos news.');
    } finally {
        await client.close();
    }
}

module.exports = { newsPost, syncPokemonArenaCombosNews };
if (require.main === module) {
    runPokemonArenaCombosNews().catch((error) => { console.error(error); process.exit(1); });
}
