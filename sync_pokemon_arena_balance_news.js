const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pokemon Arena V.4.2: balance pass on the reworked kits (more damage, shorter cooldowns, max 2 energy).
// Synced at server startup; the same post can also be synced manually:
//   node sync_pokemon_arena_balance_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const newsPost = {
    "title": "Pokemon Arena Update V.4.2: Balance Pass",
    "arena": "pokemon",
    "blocks": [
        {
            "type": "paragraph",
            "text": "Pokemon Arena Update V.4.2 is a balance pass on every reworked Pokemon. The V.4.0 kits had cooldowns that were too long and attacks that hit too softly, so they now sit much closer to the pace of the old kits."
        },
        {
            "type": "paragraph",
            "text": "Attacks hit harder: most single-target hits go up a step (20 becomes 25, 30 becomes 40), and two-turn damage over time, healing and shields go up a little. Area attacks keep their damage but get cheaper and come back faster."
        },
        {
            "type": "paragraph",
            "text": "Cooldowns are shorter: most attacks come back 2 turns sooner, and a lot of them can now be used every turn. Stuns come back 1 turn sooner but always keep a cooldown of at least 2, so nobody can be stunned every turn. No skill costs more than 2 energy."
        },
        {
            "type": "paragraph",
            "text": "Charmander's Flamethrower now costs 1 Bloodline energy and has no cooldown, so it can sweep Burned enemies every turn. Every Pokemon's exact changes are listed below."
        }
    ],
    "paragraphs": [
        "Pokemon Arena Update V.4.2 is a balance pass on every reworked Pokemon. The V.4.0 kits had cooldowns that were too long and attacks that hit too softly, so they now sit much closer to the pace of the old kits.",
        "Attacks hit harder: most single-target hits go up a step (20 becomes 25, 30 becomes 40), and two-turn damage over time, healing and shields go up a little. Area attacks keep their damage but get cheaper and come back faster.",
        "Cooldowns are shorter: most attacks come back 2 turns sooner, and a lot of them can now be used every turn. Stuns come back 1 turn sooner but always keep a cooldown of at least 2, so nobody can be stunned every turn. No skill costs more than 2 energy.",
        "Charmander's Flamethrower now costs 1 Bloodline energy and has no cooldown, so it can sweep Burned enemies every turn. Every Pokemon's exact changes are listed below."
    ],
    "changes": [
        {
            "text": "Ember: 10 to 15 damage, 5 to 10 damage each turn. Fire Punch (evolved): 15 to 20 damage, 10 to 15 damage each turn. Scratch: 20 to 25 damage. Dragon Claw (evolved): 25 to 35 damage. Flamethrower: cooldown 2 to 0, costs 1 Bloodline. Flamethrower (evolved): cooldown 2 to 0, costs 1 Bloodline.",
            "changeType": "buff",
            "characterId": "charmander",
            "characterName": "Charmander",
            "facePicture": "assets/images/PokemonArena/newcharmanderfp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newcharmanderfp.jpeg"
        },
        {
            "text": "Withdraw: 25 to 30 destructible defense, cooldown 2 to 1. Shell Guard (evolved): 35 to 40 destructible defense, cooldown 2 to 1. Water Gun: 20 to 25 damage. Hydro Pump (evolved): 30 to 40 damage. Bubble: 20 to 25 damage, cooldown 1 to 2. Bubblebeam (evolved): cooldown 1 to 0, costs 1 Ninjutsu + 1 Random.",
            "changeType": "buff",
            "characterId": "squirtle",
            "characterName": "Squirtle",
            "facePicture": "assets/images/PokemonArena/newsquirtlefp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newsquirtlefp.jpeg"
        },
        {
            "text": "Leech Seed: cooldown 1 to 0. Leech Seed (evolved): cooldown 1 to 0. Vine Whip: 20 to 25 damage. Vine Whip (evolved): 25 to 35 damage. Solar Beam: 40 to 50 damage, cooldown 3 to 2, costs 1 Taijutsu + 1 Random. Solar Beam (evolved): 45 to 55 damage, cooldown 3 to 2, costs 1 Taijutsu + 1 Random. Synthesis (evolved): heals 15 to 20.",
            "changeType": "buff",
            "characterId": "bulbasaur",
            "characterName": "Bulbasaur",
            "facePicture": "assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg"
        },
        {
            "text": "Thundershock: 15 to 20 damage. Volt Tackle: 30 to 40 damage. Thunder: 25 to 35 damage, cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "pikachu",
            "characterName": "Pikachu",
            "facePicture": "assets/images/PokemonArena/newpikachufp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newpikachufp.jpeg"
        },
        {
            "text": "Sleep Powder: cooldown 3 to 2. Confusion: 20 to 25 damage. Stun Spore: 15 to 20 damage.",
            "changeType": "buff",
            "characterId": "butterfree",
            "characterName": "Butterfree",
            "facePicture": "assets/images/PokemonArena/butterfree/butterfreefp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/butterfree/butterfreefp.webp"
        },
        {
            "text": "Softboil: heals 20 to 25. Softboil (evolved): heals 30 to 35. Egg Bomb: 15 to 20 damage. Egg Bomb (evolved): 20 to 25 damage. Pokémon Center Healing: heals 10 to 15, cooldown 3 to 2. Pokémon Center Healing (evolved): heals 15 to 20, cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "chansey",
            "characterName": "Chansey",
            "facePicture": "assets/images/PokemonArena/Chansey/chanseyfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Chansey/chanseyfp.webp"
        },
        {
            "text": "Smog: 10 to 15 damage, 10 to 15 damage each turn, cooldown 1 to 0. Smog (evolved): 15 to 20 damage, cooldown 1 to 0. Poison Gas: 5 to 10 damage each turn, cooldown 3 to 2. Poison Gas (evolved): 10 to 15 damage each turn, cooldown 3 to 2. Self-Destruct: cooldown 4 to 2, costs 1 Ninjutsu + 1 Random. Self-Destruct (evolved): cooldown 4 to 2, costs 1 Ninjutsu + 1 Random.",
            "changeType": "buff",
            "characterId": "koffing",
            "characterName": "Koffing",
            "facePicture": "assets/images/PokemonArena/koffing/koffingfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/koffing/koffingfp.webp"
        },
        {
            "text": "Supersonic: cooldown 2 to 1. Supersonic (evolved): cooldown 2 to 1. Bite: 20 to 25 damage. Bite (evolved): 25 to 35 damage. Leech Life: 20 to 25 damage, heals 15 to 20, cooldown 1 to 0. Leech Life (evolved): 25 to 35 damage, heals 20 to 25, cooldown 1 to 0.",
            "changeType": "buff",
            "characterId": "zubat",
            "characterName": "Zubat",
            "facePicture": "assets/images/PokemonArena/zubat/zubatfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/zubat/zubatfp.webp"
        },
        {
            "text": "Curse: cooldown 2 to 1. Curse (evolved): cooldown 2 to 1. Lick: 20 to 25 damage. Lick (evolved): 25 to 35 damage. Spite: 10 to 15 damage, cooldown 3 to 1. Spite (evolved): 20 to 25 damage, cooldown 3 to 1.",
            "changeType": "buff",
            "characterId": "gastly",
            "characterName": "Gastly",
            "facePicture": "assets/images/PokemonArena/gastley/gastleyfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/gastley/gastleyfp.webp"
        },
        {
            "text": "Calm Mind: cooldown 3 to 2. Calm Mind (evolved): cooldown 3 to 2. Psychic: 25 to 35 damage. Psychic (evolved): 30 to 40 damage, cooldown 0 to 1. Future Sight: cooldown 2 to 0. Future Sight (evolved): cooldown 2 to 0.",
            "changeType": "buff",
            "characterId": "abra",
            "characterName": "Abra",
            "facePicture": "assets/images/PokemonArena/abra/abrafp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/abra/abrafp.webp"
        },
        {
            "text": "Leer: cooldown 2 to 1. Leer (evolved): cooldown 2 to 1. Metal Claw: 20 to 25 damage. Metal Claw (evolved): 25 to 35 damage. Crabhammer: 30 to 40 damage. Crabhammer (evolved): 40 to 50 damage. Harden: cooldown 3 to 2. Harden (evolved): cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "krabby",
            "characterName": "Krabby",
            "facePicture": "assets/images/PokemonArena/Krabby/krabbyfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Krabby/krabbyfp.png"
        },
        {
            "text": "Swords Dance: cooldown 3 to 2. Fury Cutter: 20 to 25 damage. X-Cutter: 35 to 45 damage.",
            "changeType": "buff",
            "characterId": "scyther",
            "characterName": "Scyther",
            "facePicture": "assets/images/PokemonArena/scyther/scytherfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/scyther/scytherfp.webp"
        },
        {
            "text": "Swift: 15 to 20 damage. Dig: 25 to 35 damage, cooldown 2 to 0. Hidden Power: cooldown 2 to 0.",
            "changeType": "buff",
            "characterId": "eevee",
            "characterName": "Eevee",
            "facePicture": "assets/images/PokemonArena/eevee/eevee/eeveefp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/eevee/eeveefp.png"
        },
        {
            "text": "Pin Missile: 15 to 20 damage. Thunderbolt: 30 to 40 damage, cooldown 0 to 1. Thunder Fang: 20 to 25 damage.",
            "changeType": "buff",
            "characterId": "jolteon",
            "characterName": "Jolteon",
            "facePicture": "assets/images/PokemonArena/eevee/jolteon/jolteonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/jolteon/jolteonfp.png"
        },
        {
            "text": "Fire Spin: 10 to 15 damage, 10 to 15 damage each turn, cooldown 1 to 0. Fire Blast: 30 to 40 damage, cooldown 2 to 1. Heat Wave: cooldown 3 to 1.",
            "changeType": "buff",
            "characterId": "flareon",
            "characterName": "Flareon",
            "facePicture": "assets/images/PokemonArena/eevee/flareon/flareonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/flareon/flareonfp.png"
        },
        {
            "text": "Aqua Ring: cooldown 2 to 1. Aurora Beam: 20 to 25 damage. Hydro Pump: 30 to 40 damage.",
            "changeType": "buff",
            "characterId": "vaporeon",
            "characterName": "Vaporeon",
            "facePicture": "assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png"
        },
        {
            "text": "Toxic: cooldown 2 to 1. Toxic (evolved): cooldown 2 to 1. Poison Fang: 20 to 25 damage. Poison Fang (evolved): 25 to 35 damage. Wrap: 20 to 25 damage, cooldown 3 to 2. Wrap (evolved): 30 to 40 damage, cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "ekans",
            "characterName": "Ekans",
            "facePicture": "assets/images/PokemonArena/ekans/ekansfp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/ekans/ekansfp.jpg"
        },
        {
            "text": "Bulk Up: cooldown 3 to 2. Bulk Up (evolved): cooldown 3 to 2. Brick Break: 20 to 25 damage. Brick Break (evolved): 25 to 35 damage. Karate Chop: 30 to 40 damage, cooldown 2 to 1. Cross Chop (evolved): 40 to 50 damage, cooldown 2 to 1.",
            "changeType": "buff",
            "characterId": "machop",
            "characterName": "Machop",
            "facePicture": "assets/images/PokemonArena/machop/machopfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/machop/machopfp.png"
        },
        {
            "text": "Tackle: 10 to 15 damage. Dragon Rage (evolved): 30 to 40 damage, cooldown 0 to 1. Flail: 15 to 20 damage, cooldown 1 to 0. Hydro Pump (evolved): cooldown 2 to 0, costs 1 Ninjutsu + 1 Random. Struggle: 20 to 25 destructible defense, cooldown 2 to 1. Ice Fang (evolved): 25 to 35 damage, cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "magikarp",
            "characterName": "Magikarp",
            "facePicture": "assets/images/PokemonArena/magikarp/magikarpfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/magikarp/magikarpfp.png"
        },
        {
            "text": "Light Screen: 15 to 20 destructible defense, cooldown 2 to 1. Dazzling Gleam: cooldown 1 to 0. Barrier: cooldown 2 to 1.",
            "changeType": "buff",
            "characterId": "mr-mime",
            "characterName": "Mr. Mime",
            "facePicture": "assets/images/PokemonArena/Mr.mime/fp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Mr.mime/fp.jpg"
        },
        {
            "text": "Fire Punch: 15 to 20 damage, 10 to 15 damage each turn, cooldown 1 to 0. Mega Punch: 20 to 25 damage. Thunder Punch: 20 to 25 damage.",
            "changeType": "buff",
            "characterId": "hitmonchan",
            "characterName": "Hitmonchan",
            "facePicture": "assets/images/PokemonArena/hitmonchan/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/hitmonchan/fp.webp"
        },
        {
            "text": "Focus Energy: cooldown 3 to 2. Double Kick: 20 to 25 damage. High Jump Kick: 40 to 50 damage, cooldown 2 to 1.",
            "changeType": "buff",
            "characterId": "hitmonlee",
            "characterName": "Hitmonlee",
            "facePicture": "assets/images/PokemonArena/hitmonlee/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/hitmonlee/fp.webp"
        },
        {
            "text": "Thunder Wave: cooldown 3 to 2. Thunder Wave (evolved): 10 to 15 damage, cooldown 3 to 2. Spark: 20 to 25 damage. Spark (evolved): 25 to 35 damage. Discharge: cooldown 1 to 0. Discharge (evolved): cooldown 1 to 0.",
            "changeType": "buff",
            "characterId": "magnemite",
            "characterName": "Magnemite",
            "facePicture": "assets/images/PokemonArena/mangemite/magnemitefp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mangemite/magnemitefp.webp"
        },
        {
            "text": "Harden: 30 to 35 destructible defense, cooldown 3 to 2. Rock Throw: 20 to 25 damage. Iron Tail: 25 to 35 damage. Stealth Rock: cooldown 3 to 1.",
            "changeType": "buff",
            "characterId": "onix",
            "characterName": "Onix",
            "facePicture": "assets/images/PokemonArena/onix/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/onix/fp.webp"
        },
        {
            "text": "Pay Day: 10 to 15 damage, cooldown 3 to 1. Pay Day (evolved): 20 to 25 damage, cooldown 3 to 1. Fury Swipes: 20 to 25 damage. Fury Swipes (evolved): 25 to 35 damage. Night Slash: 25 to 35 damage, cooldown 2 to 0. Night Slash (evolved): 35 to 45 damage, cooldown 2 to 1.",
            "changeType": "buff",
            "characterId": "meowth",
            "characterName": "Meowth",
            "facePicture": "assets/images/PokemonArena/Meowth/meowthnewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Meowth/meowthnewfacepicture.png"
        },
        {
            "text": "Moonlight: heals 20 to 25, cooldown 1 to 0. Moonlight (evolved): heals 30 to 35, cooldown 1 to 0. Double Slap: 15 to 20 damage. Double Slap (evolved): 20 to 25 damage.",
            "changeType": "buff",
            "characterId": "clefairy",
            "characterName": "Clefairy",
            "facePicture": "assets/images/PokemonArena/clefairy/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/clefairy/fp.webp"
        },
        {
            "text": "Sing: cooldown 3 to 2. Sing (evolved): cooldown 3 to 2. Pound: 20 to 25 damage. Pound (evolved): 25 to 35 damage. Wish: cooldown 2 to 1. Wish (evolved): cooldown 2 to 1.",
            "changeType": "buff",
            "characterId": "jigglypuff",
            "characterName": "Jigglypuff",
            "facePicture": "assets/images/PokemonArena/jigglypuff/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/jigglypuff/fp.webp"
        },
        {
            "text": "Poison Sting: 10 to 15 damage, 5 to 10 damage each turn. Poison Sting (evolved): 15 to 20 damage, 10 to 15 damage each turn. Twinneedle: 25 to 35 damage, cooldown 1 to 0. Twinneedle (evolved): 30 to 40 damage. Envenom: cooldown 2 to 1. Fell Stinger (evolved): 20 to 25 damage, cooldown 2 to 0.",
            "changeType": "buff",
            "characterId": "beedrill",
            "characterName": "Beedrill",
            "facePicture": "assets/images/PokemonArena/beedrill/FP.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/beedrill/FP.png"
        },
        {
            "text": "Blizzard: cooldown 3 to 1. Ice Beam: 20 to 25 damage. Sheer Cold: 15 to 20 damage, cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "articuno",
            "characterName": "Articuno",
            "facePicture": "assets/images/PokemonArena/articuno/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/articuno/fp.png"
        },
        {
            "text": "Wildfire: 5 to 10 damage each turn, cooldown 3 to 2. Heat Wave: cooldown 1 to 0. Overheat: 40 to 50 damage, cooldown 3 to 2, costs 2 Bloodline.",
            "changeType": "buff",
            "characterId": "moltres",
            "characterName": "Moltres",
            "facePicture": "assets/images/PokemonArena/moltres/FP.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/moltres/FP.png"
        },
        {
            "text": "Thunderstorm: cooldown 3 to 2. Thunderstorm: 20 to 25 damage. Zap Cannon: 35 to 45 damage, cooldown 3 to 2, costs 2 Genjutsu.",
            "changeType": "buff",
            "characterId": "zapdos",
            "characterName": "Zapdos",
            "facePicture": "assets/images/PokemonArena/zapdos/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/zapdos/fp.png"
        },
        {
            "text": "Pink Bubble: 25 to 30 destructible defense, cooldown 2 to 1. Psychic: 25 to 35 damage. Life Dew: heals 10 to 15, cooldown 2 to 1.",
            "changeType": "buff",
            "characterId": "mew",
            "characterName": "Mew",
            "facePicture": "assets/images/PokemonArena/mew/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mew/fp.png"
        },
        {
            "text": "Psychic: 20 to 25 damage. Shadow Ball: 35 to 45 damage, cooldown 2 to 1. Drain Punch: 25 to 35 damage, heals 15 to 20, cooldown 1 to 0.",
            "changeType": "buff",
            "characterId": "mewtwo",
            "characterName": "Mewtwo",
            "facePicture": "assets/images/PokemonArena/mewtwo/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mewtwo/fp.png"
        },
        {
            "text": "Dragon Dance: cooldown 3 to 2. Dragon Claw: 20 to 25 damage. Draco Meteor: cooldown 3 to 1, costs 1 Ninjutsu + 1 Bloodline.",
            "changeType": "buff",
            "characterId": "dragonite",
            "characterName": "Dragonite",
            "facePicture": "assets/images/PokemonArena/dragonite/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/dragonite/fp.png"
        },
        {
            "text": "Ember: 10 to 15 damage, 10 to 15 damage each turn, cooldown 1 to 0. Tackle: 15 to 20 damage. Smokescreen: cooldown 3 to 2. Flame Wheel: 20 to 25 damage. Flame Wheel: 25 to 35 damage.",
            "changeType": "buff",
            "characterId": "cyndaquil",
            "characterName": "Cyndaquil",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png"
        },
        {
            "text": "Light Screen: 10 to 15 destructible defense, cooldown 2 to 1. Razor Leaf: 20 to 25 damage. Synthesis: heals 20 to 25, cooldown 2 to 1. Magical Leaf: 25 to 35 damage. Magical Leaf: 30 to 40 damage, cooldown 0 to 1.",
            "changeType": "buff",
            "characterId": "chikorita",
            "characterName": "Chikorita",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Chikorita/chikoritanewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Chikorita/chikoritanewfacepicture.png"
        },
        {
            "text": "Scary Face: cooldown 2 to 1. Water Gun: 20 to 25 damage. Aqua Tail: 25 to 35 damage, cooldown 1 to 0. Bite: 15 to 20 damage, cooldown 2 to 0. Crunch: 20 to 25 damage, cooldown 2 to 0.",
            "changeType": "buff",
            "characterId": "totodile",
            "characterName": "Totodile",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Totodile/totodilenewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Totodile/totodilenewfacepicture.png"
        },
        {
            "text": "Hypnosis: cooldown 3 to 2. Hypnosis (evolved): 10 to 15 damage, cooldown 3 to 2. Dream Eater: 15 to 20 damage, heals 10 to 15. Dream Eater (evolved): 20 to 25 damage, heals 15 to 20. Nightmare: 10 to 15 damage each turn, cooldown 2 to 1. Nightmare (evolved): 15 to 20 damage each turn, cooldown 2 to 1.",
            "changeType": "buff",
            "characterId": "drowzee",
            "characterName": "Drowzee",
            "facePicture": "assets/images/PokemonArena/Drowzee/FP.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Drowzee/FP.webp"
        },
        {
            "text": "Rage: cooldown 2 to 1. Rock Smash: 20 to 25 damage. Close Combat: 35 to 45 damage.",
            "changeType": "buff",
            "characterId": "primeape",
            "characterName": "Primeape",
            "facePicture": "assets/images/PokemonArena/Primeape/Primeape-FP.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Primeape/Primeape-FP.jpg"
        },
        {
            "text": "Bone Guard: 25 to 30 destructible defense, cooldown 3 to 2. Bone Club: 20 to 25 damage. Bonemerang: 35 to 45 damage, cooldown 1 to 0. Bone Rush: 20 to 25 damage, cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "marowak",
            "characterName": "Marowak",
            "facePicture": "assets/images/PokemonArena/marowak/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/marowak/facepicture.jpg"
        },
        {
            "text": "Vice Grip: 20 to 25 damage. X-Scissor: 25 to 35 damage, cooldown 1 to 0. Seismic Toss: 20 to 25 damage, cooldown 3 to 2.",
            "changeType": "buff",
            "characterId": "pinsir",
            "characterName": "Pinsir",
            "facePicture": "assets/images/PokemonArena/pinsir/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/pinsir/facepicture.jpg"
        },
        {
            "text": "Horn Attack: 20 to 25 damage. Take-Down: 30 to 40 damage. Earthquake: cooldown 3 to 1, costs 1 Taijutsu + 1 Random.",
            "changeType": "buff",
            "characterId": "tauros",
            "characterName": "Tauros",
            "facePicture": "assets/images/PokemonArena/tauros/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/tauros/facepicture.jpg"
        }
    ],
    "author": "kito"
};

async function syncPokemonArenaBalanceNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    await db.collection(newsCollectionName).updateOne(
        { title: newsPost.title },
        { $set: { ...newsPost, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1 };
}

async function runPokemonArenaBalanceNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncPokemonArenaBalanceNews(client.db(dbName));
        console.log('Synced Pokemon Arena V.4.2 balance news.');
    } finally {
        await client.close();
    }
}

module.exports = { newsPost, syncPokemonArenaBalanceNews };
if (require.main === module) {
    runPokemonArenaBalanceNews().catch((error) => { console.error(error); process.exit(1); });
}
