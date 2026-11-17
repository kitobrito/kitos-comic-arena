const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pokemon Arena V.4.0: the roster rework (tools/pokemon-rework).
// Synced at server startup; the same post can also be synced manually:
//   node sync_pokemon_arena_rework_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const now = new Date();

const newsPost = { ...{
    "title": "Pokemon Arena Update V.4.0: Roster Rework",
    "arena": "pokemon",
    "blocks": [
        {
            "type": "paragraph",
            "text": "Pokemon Arena Update V.4.0 is a full rework of the roster, built to make Pokemon Arena much easier to pick up while keeping every Pokemon's flavor. 43 Pokemon have brand-new, simpler kits."
        },
        {
            "type": "paragraph",
            "text": "Every reworked Pokemon now has four skills: one or two attacks, one utility skill, and one way to protect itself. Every skill does what its description says in one or two short sentences, uses the same few effects (damage, piercing damage, damage over time, stuns, shields, damage reduction, damage boosts and weakens, healing and energy steal), and costs one to three energy."
        },
        {
            "type": "paragraph",
            "text": "Evolution is simple now too: every evolving Pokemon, Pidgey included, evolves automatically at the start of its 4th turn, and all of its skills get stronger. Its portrait and its full-body render in the new battle screen change to the evolved form. Rare Candy still evolves a Pokemon instantly, and the Gen 2 starters still evolve through their ranked win missions."
        },
        {
            "type": "paragraph",
            "text": "Weather is back with the legendary birds, in a simpler form: Articuno's Blizzard brings a Snowstorm, Moltres's Wildfire starts a Wildfire, and Zapdos calls a Thunderstorm. Each lasts 3 rounds, makes skills of its type deal 10 more damage, and changes the arena background for both players."
        },
        {
            "type": "paragraph",
            "text": "Community characters (Ditto, Scraggy, Dragapult, Nincada with Ninjask and Shedinja, Darkrai and Aegislash) are unchanged, as are Aerodactyl, Pokemon Trainer and Lance."
        }
    ],
    "paragraphs": [
        "Pokemon Arena Update V.4.0 is a full rework of the roster, built to make Pokemon Arena much easier to pick up while keeping every Pokemon's flavor. 43 Pokemon have brand-new, simpler kits.",
        "Every reworked Pokemon now has four skills: one or two attacks, one utility skill, and one way to protect itself. Every skill does what its description says in one or two short sentences, uses the same few effects (damage, piercing damage, damage over time, stuns, shields, damage reduction, damage boosts and weakens, healing and energy steal), and costs one to three energy.",
        "Evolution is simple now too: every evolving Pokemon, Pidgey included, evolves automatically at the start of its 4th turn, and all of its skills get stronger. Its portrait and its full-body render in the new battle screen change to the evolved form. Rare Candy still evolves a Pokemon instantly, and the Gen 2 starters still evolve through their ranked win missions.",
        "Weather is back with the legendary birds, in a simpler form: Articuno's Blizzard brings a Snowstorm, Moltres's Wildfire starts a Wildfire, and Zapdos calls a Thunderstorm. Each lasts 3 rounds, makes skills of its type deal 10 more damage, and changes the arena background for both players.",
        "Community characters (Ditto, Scraggy, Dragapult, Nincada with Ninjask and Shedinja, Darkrai and Aegislash) are unchanged, as are Aerodactyl, Pokemon Trainer and Lance."
    ],
    "changes": [
        {
            "text": "Sets enemies on fire, then hits harder as Charmeleon. Evolves into Charmeleon on its 4th turn. New skills: Ember, Scratch, Flamethrower, Protect.",
            "changeType": "rework",
            "characterId": "charmander",
            "characterName": "Charmander",
            "facePicture": "assets/images/PokemonArena/newcharmanderfp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newcharmanderfp.jpeg"
        },
        {
            "text": "Hides in its shell to protect itself and wears enemies down with water. Evolves into Wartortle on its 4th turn. New skills: Water Gun, Bubble, Withdraw, Protect.",
            "changeType": "rework",
            "characterId": "squirtle",
            "characterName": "Squirtle",
            "facePicture": "assets/images/PokemonArena/newsquirtlefp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newsquirtlefp.jpeg"
        },
        {
            "text": "Drains enemies with seeds and heals itself while it fights. Evolves into Ivysaur on its 4th turn. New skills: Leech Seed, Vine Whip, Solar Beam, Synthesis.",
            "changeType": "rework",
            "characterId": "bulbasaur",
            "characterName": "Bulbasaur",
            "facePicture": "assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg"
        },
        {
            "text": "Fast electric attacks that can stun. New skills: Thundershock, Volt Tackle, Thunder, Agility.",
            "changeType": "rework",
            "characterId": "pikachu",
            "characterName": "Pikachu",
            "facePicture": "assets/images/PokemonArena/newpikachufp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newpikachufp.jpeg"
        },
        {
            "text": "Puts enemies to sleep and weakens their attacks with powders. New skills: Confusion, Stun Spore, Sleep Powder, Protect.",
            "changeType": "rework",
            "characterId": "butterfree",
            "characterName": "Butterfree",
            "facePicture": "assets/images/PokemonArena/butterfree/butterfreefp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/butterfree/butterfreefp.webp"
        },
        {
            "text": "The team medic: heals allies and keeps them alive. Evolves into Blissey on its 4th turn. New skills: Egg Bomb, Softboil, Pokémon Center Healing, Safeguard.",
            "changeType": "rework",
            "characterId": "chansey",
            "characterName": "Chansey",
            "facePicture": "assets/images/PokemonArena/Chansey/chanseyfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Chansey/chanseyfp.webp"
        },
        {
            "text": "Fills the field with poison gas that hurts every enemy. Evolves into Weezing on its 4th turn. New skills: Smog, Poison Gas, Self-Destruct, Haze.",
            "changeType": "rework",
            "characterId": "koffing",
            "characterName": "Koffing",
            "facePicture": "assets/images/PokemonArena/koffing/koffingfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/koffing/koffingfp.webp"
        },
        {
            "text": "Bites and drains health to keep itself going. Evolves into Golbat on its 4th turn. New skills: Bite, Leech Life, Supersonic, Double Team.",
            "changeType": "rework",
            "characterId": "zubat",
            "characterName": "Zubat",
            "facePicture": "assets/images/PokemonArena/zubat/zubatfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/zubat/zubatfp.webp"
        },
        {
            "text": "A ghost that curses enemies and steals their energy. Evolves into Haunter on its 4th turn. New skills: Lick, Curse, Spite, Vanish.",
            "changeType": "rework",
            "characterId": "gastly",
            "characterName": "Gastly",
            "facePicture": "assets/images/PokemonArena/gastley/gastleyfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/gastley/gastleyfp.webp"
        },
        {
            "text": "Fragile but powerful: teleports out of danger and hits hard with Psychic. Evolves into Kadabra on its 4th turn. New skills: Psychic, Future Sight, Calm Mind, Teleport.",
            "changeType": "rework",
            "characterId": "abra",
            "characterName": "Abra",
            "facePicture": "assets/images/PokemonArena/abra/abrafp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/abra/abrafp.webp"
        },
        {
            "text": "Hard shell, huge claw: defends itself and crushes one target. Evolves into Kingler on its 4th turn. New skills: Metal Claw, Crabhammer, Leer, Harden.",
            "changeType": "rework",
            "characterId": "krabby",
            "characterName": "Krabby",
            "facePicture": "assets/images/PokemonArena/Krabby/krabbyfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Krabby/krabbyfp.png"
        },
        {
            "text": "Sharpens its blades, then slices through defenses. New skills: Fury Cutter, X-Cutter, Swords Dance, Double Team.",
            "changeType": "rework",
            "characterId": "scyther",
            "characterName": "Scyther",
            "facePicture": "assets/images/PokemonArena/scyther/scytherfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/scyther/scytherfp.webp"
        },
        {
            "text": "A balanced fighter that is easy to play. New skills: Swift, Dig, Hidden Power, Protect.",
            "changeType": "rework",
            "characterId": "eevee",
            "characterName": "Eevee",
            "facePicture": "assets/images/PokemonArena/eevee/eevee/eeveefp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/eevee/eeveefp.png"
        },
        {
            "text": "The fastest Eeveelution: cheap, quick electric hits. New skills: Pin Missile, Thunderbolt, Thunder Fang, Agility.",
            "changeType": "rework",
            "characterId": "jolteon",
            "characterName": "Jolteon",
            "facePicture": "assets/images/PokemonArena/eevee/jolteon/jolteonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/jolteon/jolteonfp.png"
        },
        {
            "text": "Burns everything and powers itself up. New skills: Fire Spin, Fire Blast, Heating Up, Double Team.",
            "changeType": "rework",
            "characterId": "flareon",
            "characterName": "Flareon",
            "facePicture": "assets/images/PokemonArena/eevee/flareon/flareonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/flareon/flareonfp.png"
        },
        {
            "text": "Heals the team with water and protects itself with Acid Armor. New skills: Aurora Beam, Hydro Pump, Aqua Ring, Acid Armor.",
            "changeType": "rework",
            "characterId": "vaporeon",
            "characterName": "Vaporeon",
            "facePicture": "assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png"
        },
        {
            "text": "Poisons one enemy and squeezes them. Evolves into Arbok on its 4th turn. New skills: Poison Fang, Toxic, Wrap, Shed Skin.",
            "changeType": "rework",
            "characterId": "ekans",
            "characterName": "Ekans",
            "facePicture": "assets/images/PokemonArena/ekans/ekansfp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/ekans/ekansfp.jpg"
        },
        {
            "text": "Punches hard and bulks up to take hits. Evolves into Machoke on its 4th turn. New skills: Brick Break, Karate Chop, Bulk Up, Detect.",
            "changeType": "rework",
            "characterId": "machop",
            "characterName": "Machop",
            "facePicture": "assets/images/PokemonArena/machop/machopfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/machop/machopfp.png"
        },
        {
            "text": "Useless at first... until it evolves into a raging Gyarados. Evolves into Gyarados on its 4th turn. New skills: Tackle, Flail, Struggle, Splash.",
            "changeType": "rework",
            "characterId": "magikarp",
            "characterName": "Magikarp",
            "facePicture": "assets/images/PokemonArena/magikarp/magikarpfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/magikarp/magikarpfp.png"
        },
        {
            "text": "Builds invisible walls that shield the whole team. New skills: Dazzling Gleam, Light Screen, Barrier, Safeguard.",
            "changeType": "rework",
            "characterId": "mr-mime",
            "characterName": "Mr. Mime",
            "facePicture": "assets/images/PokemonArena/Mr.mime/fp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Mr.mime/fp.jpg"
        },
        {
            "text": "Elemental punches: one burns, one freezes, one stuns. New skills: Mega Punch, Fire Punch, Thunder Punch, Detect.",
            "changeType": "rework",
            "characterId": "hitmonchan",
            "characterName": "Hitmonchan",
            "facePicture": "assets/images/PokemonArena/hitmonchan/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/hitmonchan/fp.webp"
        },
        {
            "text": "Focuses, then lands one devastating kick. New skills: Double Kick, High Jump Kick, Focus Energy, Detect.",
            "changeType": "rework",
            "characterId": "hitmonlee",
            "characterName": "Hitmonlee",
            "facePicture": "assets/images/PokemonArena/hitmonlee/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/hitmonlee/fp.webp"
        },
        {
            "text": "Shocks the whole enemy team and can stun one of them. Evolves into Magneton on its 4th turn. New skills: Spark, Discharge, Thunder Wave, Magnet Rise.",
            "changeType": "rework",
            "characterId": "magnemite",
            "characterName": "Magnemite",
            "facePicture": "assets/images/PokemonArena/mangemite/magnemitefp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mangemite/magnemitefp.webp"
        },
        {
            "text": "A huge rock wall that takes hits for the team. New skills: Rock Throw, Iron Tail, Stealth Rock, Harden.",
            "changeType": "rework",
            "characterId": "onix",
            "characterName": "Onix",
            "facePicture": "assets/images/PokemonArena/onix/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/onix/fp.webp"
        },
        {
            "text": "Steals energy with Pay Day and claws when the enemy is out of options. Evolves into Persian on its 4th turn. New skills: Fury Swipes, Pay Day, Night Slash, Feint.",
            "changeType": "rework",
            "characterId": "meowth",
            "characterName": "Meowth",
            "facePicture": "assets/images/PokemonArena/Meowth/meowthnewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Meowth/meowthnewfacepicture.png"
        },
        {
            "text": "Heals allies, and Metronome casts a random surprise skill. Evolves into Clefable on its 4th turn. New skills: Double Slap, Moonlight, Metronome, Protect.",
            "changeType": "rework",
            "characterId": "clefairy",
            "characterName": "Clefairy",
            "facePicture": "assets/images/PokemonArena/clefairy/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/clefairy/fp.webp"
        },
        {
            "text": "Sings enemies to sleep and protects its friends. Evolves into Wigglytuff on its 4th turn. New skills: Pound, Sing, Wish, Protect.",
            "changeType": "rework",
            "characterId": "jigglypuff",
            "characterName": "Jigglypuff",
            "facePicture": "assets/images/PokemonArena/jigglypuff/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/jigglypuff/fp.webp"
        },
        {
            "text": "Poison stings that pile up, then Mega Evolves into a living drill. Evolves into Mega Beedrill on its 4th turn. New skills: Poison Sting, Twinneedle, Envenom, Hive Swarm.",
            "changeType": "rework",
            "characterId": "beedrill",
            "characterName": "Beedrill",
            "facePicture": "assets/images/PokemonArena/beedrill/FP.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/beedrill/FP.png"
        },
        {
            "text": "Freezes enemies and brings a Snowstorm that powers up Ice skills. New skills: Ice Beam, Blizzard, Sheer Cold, Mist.",
            "changeType": "rework",
            "characterId": "articuno",
            "characterName": "Articuno",
            "facePicture": "assets/images/PokemonArena/articuno/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/articuno/fp.png"
        },
        {
            "text": "Sets the whole enemy team on fire and starts a Wildfire that powers up Fire skills. New skills: Heat Wave, Wildfire, Overheat, Roost.",
            "changeType": "rework",
            "characterId": "moltres",
            "characterName": "Moltres",
            "facePicture": "assets/images/PokemonArena/moltres/FP.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/moltres/FP.png"
        },
        {
            "text": "Calls a Thunderstorm that powers up Electric skills, then unleashes huge electric attacks. New skills: Thunderstorm, Zap Cannon, Thunderstorm, Fly.",
            "changeType": "rework",
            "characterId": "zapdos",
            "characterName": "Zapdos",
            "facePicture": "assets/images/PokemonArena/zapdos/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/zapdos/fp.png"
        },
        {
            "text": "Shields and heals the team with psychic bubbles. New skills: Psychic, Pink Bubble, Life Dew, Psychic Barrier.",
            "changeType": "rework",
            "characterId": "mew",
            "characterName": "Mew",
            "facePicture": "assets/images/PokemonArena/mew/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mew/fp.png"
        },
        {
            "text": "The strongest psychic Pokemon: big damage and self-healing. New skills: Psychic, Shadow Ball, Drain Punch, Barrier.",
            "changeType": "rework",
            "characterId": "mewtwo",
            "characterName": "Mewtwo",
            "facePicture": "assets/images/PokemonArena/mewtwo/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mewtwo/fp.png"
        },
        {
            "text": "A gentle giant: very tough, and hits like a dragon. New skills: Dragon Claw, Draco Meteor, Dragon Dance, Protect.",
            "changeType": "rework",
            "characterId": "dragonite",
            "characterName": "Dragonite",
            "facePicture": "assets/images/PokemonArena/dragonite/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/dragonite/fp.png"
        },
        {
            "text": "Sets enemies alight; its earned evolutions upgrade Tackle into Flame Wheel. New skills: Tackle, Ember, Smokescreen, Protect.",
            "changeType": "rework",
            "characterId": "cyndaquil",
            "characterName": "Cyndaquil",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png"
        },
        {
            "text": "Shields allies with leaves and heals; its earned evolutions upgrade Razor Leaf into Magical Leaf. New skills: Razor Leaf, Light Screen, Synthesis, Protect.",
            "changeType": "rework",
            "characterId": "chikorita",
            "characterName": "Chikorita",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Chikorita/chikoritanewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Chikorita/chikoritanewfacepicture.png"
        },
        {
            "text": "Bites hard and scares enemies; its earned evolutions upgrade Scary Face into a big bite. New skills: Water Gun, Aqua Tail, Scary Face, Protect.",
            "changeType": "rework",
            "characterId": "totodile",
            "characterName": "Totodile",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Totodile/totodilenewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Totodile/totodilenewfacepicture.png"
        },
        {
            "text": "Puts enemies to sleep and feeds on their dreams. Evolves into Hypno on its 4th turn. New skills: Dream Eater, Hypnosis, Nightmare, Protect.",
            "changeType": "rework",
            "characterId": "drowzee",
            "characterName": "Drowzee",
            "facePicture": "assets/images/PokemonArena/Drowzee/FP.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Drowzee/FP.webp"
        },
        {
            "text": "Gets angrier and stronger the longer the fight goes. New skills: Rock Smash, Close Combat, Rage, Detect.",
            "changeType": "rework",
            "characterId": "primeape",
            "characterName": "Primeape",
            "facePicture": "assets/images/PokemonArena/Primeape/Primeape-FP.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Primeape/Primeape-FP.jpg"
        },
        {
            "text": "Swings its bone club and throws it like a boomerang. New skills: Bone Club, Bonemerang, Bone Rush, Bone Guard.",
            "changeType": "rework",
            "characterId": "marowak",
            "characterName": "Marowak",
            "facePicture": "assets/images/PokemonArena/marowak/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/marowak/facepicture.jpg"
        },
        {
            "text": "Crushes enemies in its horns. New skills: Vice Grip, X-Scissor, Seismic Toss, Detect.",
            "changeType": "rework",
            "characterId": "pinsir",
            "characterName": "Pinsir",
            "facePicture": "assets/images/PokemonArena/pinsir/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/pinsir/facepicture.jpg"
        },
        {
            "text": "Charges straight through the enemy team. New skills: Horn Attack, Take-Down, Earthquake, Protect.",
            "changeType": "rework",
            "characterId": "tauros",
            "characterName": "Tauros",
            "facePicture": "assets/images/PokemonArena/tauros/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/tauros/facepicture.jpg"
        },
        {
            "text": "Fiery kicks, and Mega Evolves on its 4th turn. Evolves into Mega Blaziken on its 4th turn. New skills: Blaze Kick, Sky Uppercut, Heat Wave, Detect.",
            "changeType": "rework",
            "characterId": "blaziken",
            "characterName": "Blaziken",
            "facePicture": "assets/images/PokemonArena/blaziken/blazikenfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/blaziken/blazikenfp.webp"
        },
        {
            "text": "Pidgey now evolves into Pidgeotto at the start of its 4th turn, like every other evolving Pokemon. Its skills are unchanged.",
            "changeType": "change",
            "characterId": "pidgey",
            "characterName": "Pidgey",
            "facePicture": "assets/images/PokemonArena/pidgey/pidgeyfp.webp",
            "skillId": "pidgey-passive-evolution-pidgeotto",
            "skillName": "Evolution: Pidgeotto",
            "skillimage": "assets/images/PokemonArena/pidgey/pidgeyfp.webp"
        }
    ],
    "author": "kito"
}, createdAt: now, updatedAt: now };

// Reuse the server's configured database during startup; the CLI below remains available.
async function syncPokemonArenaReworkNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    const newsPosts = db.collection(newsCollectionName);
    const { createdAt, ...update } = newsPost;
    await newsPosts.updateOne(
        { title: newsPost.title },
        { $set: { ...update, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1 };
}

async function runPokemonArenaReworkNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncPokemonArenaReworkNews(client.db(dbName));
        console.log('Synced Pokemon Arena V.4.0 roster rework news.');
    } finally {
        await client.close();
    }
}

module.exports = { newsPost, syncPokemonArenaReworkNews };
if (require.main === module) {
    runPokemonArenaReworkNews().catch((error) => { console.error(error); process.exit(1); });
}
