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
            "text": "Pokemon Arena Update V.4.0 is a full rework of the roster, built to make Pokemon Arena much easier to pick up while keeping every Pokemon's flavor. 42 Pokemon have brand-new, simpler kits."
        },
        {
            "type": "paragraph",
            "text": "Every reworked Pokemon has four skills, and they all work together. Each Pokemon has one main skill that puts a named mark on enemies (like Burned, Static, Poisoned or Asleep) or puts the Pokemon in a stance (like In its shell, Focused or Raging). Every other skill says plainly how it uses that mark: \"+10 damage to Burned enemies\", \"if the target is Asleep, it takes 20 each turn instead\", \"while Squirtle is in its shell, also stuns it\". Even the defensive skill pays off: it heals a little if the Pokemon used its main skill last turn, or while it is in its stance."
        },
        {
            "type": "paragraph",
            "text": "Critical hits are in: many attacks have a chance to crit for extra piercing damage, shown right in the description. Some stances raise that chance, like Abra's Calm Mind, Scyther's Swords Dance and Hitmonlee's Focus Energy."
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
            "text": "Community characters (Ditto, Scraggy, Dragapult, Nincada with Ninjask and Shedinja, Darkrai and Aegislash) are unchanged, as are Blaziken, Aerodactyl, Pokemon Trainer and Lance."
        }
    ],
    "paragraphs": [
        "Pokemon Arena Update V.4.0 is a full rework of the roster, built to make Pokemon Arena much easier to pick up while keeping every Pokemon's flavor. 42 Pokemon have brand-new, simpler kits.",
        "Every reworked Pokemon has four skills, and they all work together. Each Pokemon has one main skill that puts a named mark on enemies (like Burned, Static, Poisoned or Asleep) or puts the Pokemon in a stance (like In its shell, Focused or Raging). Every other skill says plainly how it uses that mark: \"+10 damage to Burned enemies\", \"if the target is Asleep, it takes 20 each turn instead\", \"while Squirtle is in its shell, also stuns it\". Even the defensive skill pays off: it heals a little if the Pokemon used its main skill last turn, or while it is in its stance.",
        "Critical hits are in: many attacks have a chance to crit for extra piercing damage, shown right in the description. Some stances raise that chance, like Abra's Calm Mind, Scyther's Swords Dance and Hitmonlee's Focus Energy.",
        "Evolution is simple now too: every evolving Pokemon, Pidgey included, evolves automatically at the start of its 4th turn, and all of its skills get stronger. Its portrait and its full-body render in the new battle screen change to the evolved form. Rare Candy still evolves a Pokemon instantly, and the Gen 2 starters still evolve through their ranked win missions.",
        "Weather is back with the legendary birds, in a simpler form: Articuno's Blizzard brings a Snowstorm, Moltres's Wildfire starts a Wildfire, and Zapdos calls a Thunderstorm. Each lasts 3 rounds, makes skills of its type deal 10 more damage, and changes the arena background for both players.",
        "Community characters (Ditto, Scraggy, Dragapult, Nincada with Ninjask and Shedinja, Darkrai and Aegislash) are unchanged, as are Blaziken, Aerodactyl, Pokemon Trainer and Lance."
    ],
    "changes": [
        {
            "text": "Ember Burns enemies, and every other skill hits Burned enemies harder. Evolves into Charmeleon on its 4th turn. Main skill: Ember. Skills: Ember, Scratch, Flamethrower, Protect.",
            "changeType": "rework",
            "characterId": "charmander",
            "characterName": "Charmander",
            "facePicture": "assets/images/PokemonArena/newcharmanderfp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newcharmanderfp.jpeg"
        },
        {
            "text": "Withdraw puts Squirtle in its shell; its water attacks hit harder while it is inside. Evolves into Wartortle on its 4th turn. Main skill: Withdraw. Skills: Withdraw, Water Gun, Bubble, Protect.",
            "changeType": "rework",
            "characterId": "squirtle",
            "characterName": "Squirtle",
            "facePicture": "assets/images/PokemonArena/newsquirtlefp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newsquirtlefp.jpeg"
        },
        {
            "text": "Leech Seed drains an enemy; Bulbasaur's other skills are stronger against Seeded enemies. Evolves into Ivysaur on its 4th turn. Main skill: Leech Seed. Skills: Leech Seed, Vine Whip, Solar Beam, Synthesis.",
            "changeType": "rework",
            "characterId": "bulbasaur",
            "characterName": "Bulbasaur",
            "facePicture": "assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg"
        },
        {
            "text": "Thundershock gives Static; Volt Tackle and Thunder punish enemies with Static. Main skill: Thundershock. Skills: Thundershock, Volt Tackle, Thunder, Agility.",
            "changeType": "rework",
            "characterId": "pikachu",
            "characterName": "Pikachu",
            "facePicture": "assets/images/PokemonArena/newpikachufp.jpeg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/newpikachufp.jpeg"
        },
        {
            "text": "Sleep Powder makes enemies Drowsy; its other skills punish Drowsy enemies. Main skill: Sleep Powder. Skills: Sleep Powder, Confusion, Stun Spore, Protect.",
            "changeType": "rework",
            "characterId": "butterfree",
            "characterName": "Butterfree",
            "facePicture": "assets/images/PokemonArena/butterfree/butterfreefp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/butterfree/butterfreefp.webp"
        },
        {
            "text": "Softboil heals an ally and puts Chansey on duty as a Nurse; her other skills are stronger while Nursing. Evolves into Blissey on its 4th turn. Main skill: Softboil. Skills: Softboil, Egg Bomb, Pokémon Center Healing, Safeguard.",
            "changeType": "rework",
            "characterId": "chansey",
            "characterName": "Chansey",
            "facePicture": "assets/images/PokemonArena/Chansey/chanseyfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Chansey/chanseyfp.webp"
        },
        {
            "text": "Smog Poisons an enemy; Poison Gas and Self-Destruct hit Poisoned enemies harder. Evolves into Weezing on its 4th turn. Main skill: Smog. Skills: Smog, Poison Gas, Self-Destruct, Haze.",
            "changeType": "rework",
            "characterId": "koffing",
            "characterName": "Koffing",
            "facePicture": "assets/images/PokemonArena/koffing/koffingfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/koffing/koffingfp.webp"
        },
        {
            "text": "Supersonic Confuses an enemy; Zubat's bites hit Confused enemies harder. Evolves into Golbat on its 4th turn. Main skill: Supersonic. Skills: Supersonic, Bite, Leech Life, Double Team.",
            "changeType": "rework",
            "characterId": "zubat",
            "characterName": "Zubat",
            "facePicture": "assets/images/PokemonArena/zubat/zubatfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/zubat/zubatfp.webp"
        },
        {
            "text": "Curse haunts an enemy; Lick and Spite are stronger against Cursed enemies. Evolves into Haunter on its 4th turn. Main skill: Curse. Skills: Curse, Lick, Spite, Vanish.",
            "changeType": "rework",
            "characterId": "gastly",
            "characterName": "Gastly",
            "facePicture": "assets/images/PokemonArena/gastley/gastleyfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/gastley/gastleyfp.webp"
        },
        {
            "text": "Calm Mind Focuses Abra; its psychic attacks hit harder and crit more while Focused. Evolves into Kadabra on its 4th turn. Main skill: Calm Mind. Skills: Calm Mind, Psychic, Future Sight, Teleport.",
            "changeType": "rework",
            "characterId": "abra",
            "characterName": "Abra",
            "facePicture": "assets/images/PokemonArena/abra/abrafp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/abra/abrafp.webp"
        },
        {
            "text": "Leer Exposes an enemy; Krabby's claws crush Exposed enemies. Evolves into Kingler on its 4th turn. Main skill: Leer. Skills: Leer, Metal Claw, Crabhammer, Harden.",
            "changeType": "rework",
            "characterId": "krabby",
            "characterName": "Krabby",
            "facePicture": "assets/images/PokemonArena/Krabby/krabbyfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Krabby/krabbyfp.png"
        },
        {
            "text": "Swords Dance Sharpens Scyther's blades; its cuts hit harder and crit more while Sharpened. Main skill: Swords Dance. Skills: Swords Dance, Fury Cutter, X-Cutter, Double Team.",
            "changeType": "rework",
            "characterId": "scyther",
            "characterName": "Scyther",
            "facePicture": "assets/images/PokemonArena/scyther/scytherfp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/scyther/scytherfp.webp"
        },
        {
            "text": "Swift Locks On to an enemy; Dig and Hidden Power hit the Locked On enemy harder. Main skill: Swift. Skills: Swift, Dig, Hidden Power, Protect.",
            "changeType": "rework",
            "characterId": "eevee",
            "characterName": "Eevee",
            "facePicture": "assets/images/PokemonArena/eevee/eevee/eeveefp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/eevee/eeveefp.png"
        },
        {
            "text": "Pin Missile Paralyzes an enemy; Thunderbolt and Thunder Fang punish Paralyzed enemies. Main skill: Pin Missile. Skills: Pin Missile, Thunderbolt, Thunder Fang, Agility.",
            "changeType": "rework",
            "characterId": "jolteon",
            "characterName": "Jolteon",
            "facePicture": "assets/images/PokemonArena/eevee/jolteon/jolteonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/jolteon/jolteonfp.png"
        },
        {
            "text": "Fire Spin Burns an enemy; Fire Blast and Heating Up punish Burned enemies. Main skill: Fire Spin. Skills: Fire Spin, Fire Blast, Heat Wave, Double Team.",
            "changeType": "rework",
            "characterId": "flareon",
            "characterName": "Flareon",
            "facePicture": "assets/images/PokemonArena/eevee/flareon/flareonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/flareon/flareonfp.png"
        },
        {
            "text": "Aqua Ring surrounds the team with water; Vaporeon hits harder and heals more while in its Aqua Ring. Main skill: Aqua Ring. Skills: Aqua Ring, Aurora Beam, Hydro Pump, Acid Armor.",
            "changeType": "rework",
            "characterId": "vaporeon",
            "characterName": "Vaporeon",
            "facePicture": "assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/eevee/vaporeon/vaporeonfp.png"
        },
        {
            "text": "Toxic Poisons an enemy; Poison Fang and Wrap are stronger against Poisoned enemies. Evolves into Arbok on its 4th turn. Main skill: Toxic. Skills: Toxic, Poison Fang, Wrap, Shed Skin.",
            "changeType": "rework",
            "characterId": "ekans",
            "characterName": "Ekans",
            "facePicture": "assets/images/PokemonArena/ekans/ekansfp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/ekans/ekansfp.jpg"
        },
        {
            "text": "Bulk Up powers Machop up; its punches hit harder and crit more while Bulked Up. Evolves into Machoke on its 4th turn. Main skill: Bulk Up. Skills: Bulk Up, Brick Break, Karate Chop, Detect.",
            "changeType": "rework",
            "characterId": "machop",
            "characterName": "Machop",
            "facePicture": "assets/images/PokemonArena/machop/machopfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/machop/machopfp.png"
        },
        {
            "text": "Splash makes Magikarp Determined; it fights a little better while Determined, and becomes a raging Gyarados. Evolves into Gyarados on its 4th turn. Main skill: Splash. Skills: Splash, Tackle, Flail, Struggle.",
            "changeType": "rework",
            "characterId": "magikarp",
            "characterName": "Magikarp",
            "facePicture": "assets/images/PokemonArena/magikarp/magikarpfp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/magikarp/magikarpfp.png"
        },
        {
            "text": "Light Screen Screens the team; Mr. Mime's other skills get stronger while it is Screened. Main skill: Light Screen. Skills: Light Screen, Dazzling Gleam, Barrier, Safeguard.",
            "changeType": "rework",
            "characterId": "mr-mime",
            "characterName": "Mr. Mime",
            "facePicture": "assets/images/PokemonArena/Mr.mime/fp.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Mr.mime/fp.jpg"
        },
        {
            "text": "Fire Punch Burns an enemy; Mega Punch and Thunder Punch punish Burned enemies. Main skill: Fire Punch. Skills: Fire Punch, Mega Punch, Thunder Punch, Detect.",
            "changeType": "rework",
            "characterId": "hitmonchan",
            "characterName": "Hitmonchan",
            "facePicture": "assets/images/PokemonArena/hitmonchan/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/hitmonchan/fp.webp"
        },
        {
            "text": "Focus Energy Focuses Hitmonlee; its kicks hit harder and crit far more while Focused. Main skill: Focus Energy. Skills: Focus Energy, Double Kick, High Jump Kick, Detect.",
            "changeType": "rework",
            "characterId": "hitmonlee",
            "characterName": "Hitmonlee",
            "facePicture": "assets/images/PokemonArena/hitmonlee/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/hitmonlee/fp.webp"
        },
        {
            "text": "Thunder Wave Paralyzes an enemy; Spark and Discharge hit Paralyzed enemies harder. Evolves into Magneton on its 4th turn. Main skill: Thunder Wave. Skills: Thunder Wave, Spark, Discharge, Magnet Rise.",
            "changeType": "rework",
            "characterId": "magnemite",
            "characterName": "Magnemite",
            "facePicture": "assets/images/PokemonArena/mangemite/magnemitefp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mangemite/magnemitefp.webp"
        },
        {
            "text": "Harden turns Onix to stone; it hits back harder while Hardened. Main skill: Harden. Skills: Harden, Rock Throw, Iron Tail, Stealth Rock.",
            "changeType": "rework",
            "characterId": "onix",
            "characterName": "Onix",
            "facePicture": "assets/images/PokemonArena/onix/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/onix/fp.webp"
        },
        {
            "text": "Pay Day steals energy and makes Meowth Lucky; its claws hit harder and crit more while Lucky. Evolves into Persian on its 4th turn. Main skill: Pay Day. Skills: Pay Day, Fury Swipes, Night Slash, Feint.",
            "changeType": "rework",
            "characterId": "meowth",
            "characterName": "Meowth",
            "facePicture": "assets/images/PokemonArena/Meowth/meowthnewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Meowth/meowthnewfacepicture.png"
        },
        {
            "text": "Moonlight heals an ally and makes Clefairy Moonlit; its slaps hit harder while Moonlit, and Metronome casts a random surprise. Evolves into Clefable on its 4th turn. Main skill: Moonlight. Skills: Moonlight, Double Slap, Metronome, Protect.",
            "changeType": "rework",
            "characterId": "clefairy",
            "characterName": "Clefairy",
            "facePicture": "assets/images/PokemonArena/clefairy/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/clefairy/fp.webp"
        },
        {
            "text": "Sing puts an enemy to Sleep; Pound and Wish are stronger after singing. Evolves into Wigglytuff on its 4th turn. Main skill: Sing. Skills: Sing, Pound, Wish, Protect.",
            "changeType": "rework",
            "characterId": "jigglypuff",
            "characterName": "Jigglypuff",
            "facePicture": "assets/images/PokemonArena/jigglypuff/fp.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/jigglypuff/fp.webp"
        },
        {
            "text": "Poison Sting Poisons an enemy; Twinneedle and Envenom punish Poisoned enemies, then it Mega Evolves. Evolves into Mega Beedrill on its 4th turn. Main skill: Poison Sting. Skills: Poison Sting, Twinneedle, Envenom, Hive Swarm.",
            "changeType": "rework",
            "characterId": "beedrill",
            "characterName": "Beedrill",
            "facePicture": "assets/images/PokemonArena/beedrill/FP.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/beedrill/FP.png"
        },
        {
            "text": "Blizzard brings a Snowstorm; Ice Beam and Sheer Cold are stronger in the snow. Main skill: Blizzard. Skills: Blizzard, Ice Beam, Sheer Cold, Mist.",
            "changeType": "rework",
            "characterId": "articuno",
            "characterName": "Articuno",
            "facePicture": "assets/images/PokemonArena/articuno/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/articuno/fp.png"
        },
        {
            "text": "Wildfire Burns everyone and starts a Wildfire; Heat Wave and Overheat punish Burned enemies. Main skill: Wildfire. Skills: Wildfire, Heat Wave, Overheat, Roost.",
            "changeType": "rework",
            "characterId": "moltres",
            "characterName": "Moltres",
            "facePicture": "assets/images/PokemonArena/moltres/FP.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/moltres/FP.png"
        },
        {
            "text": "Thunderstorm Charges Zapdos up; its lightning hits harder and stuns while Charged. Main skill: Thunderstorm. Skills: Thunderstorm, Thunderstorm, Zap Cannon, Fly.",
            "changeType": "rework",
            "characterId": "zapdos",
            "characterName": "Zapdos",
            "facePicture": "assets/images/PokemonArena/zapdos/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/zapdos/fp.png"
        },
        {
            "text": "Pink Bubble shields an ally; Mew's psychic power and Life Dew are stronger for Bubbled allies. Main skill: Pink Bubble. Skills: Pink Bubble, Psychic, Life Dew, Psychic Barrier.",
            "changeType": "rework",
            "characterId": "mew",
            "characterName": "Mew",
            "facePicture": "assets/images/PokemonArena/mew/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mew/fp.png"
        },
        {
            "text": "Psychic Mind Locks an enemy; Shadow Ball and Drain Punch tear through Mind Locked enemies. Main skill: Psychic. Skills: Psychic, Shadow Ball, Drain Punch, Barrier.",
            "changeType": "rework",
            "characterId": "mewtwo",
            "characterName": "Mewtwo",
            "facePicture": "assets/images/PokemonArena/mewtwo/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/mewtwo/fp.png"
        },
        {
            "text": "Dragon Dance makes Dragonite Dancing; it hits harder and takes less damage while Dancing. Main skill: Dragon Dance. Skills: Dragon Dance, Dragon Claw, Draco Meteor, Protect.",
            "changeType": "rework",
            "characterId": "dragonite",
            "characterName": "Dragonite",
            "facePicture": "assets/images/PokemonArena/dragonite/fp.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/dragonite/fp.png"
        },
        {
            "text": "Ember Burns an enemy; Tackle and Flame Wheel hit Burned enemies harder. Main skill: Ember. Skills: Ember, Tackle, Smokescreen, Protect.",
            "changeType": "rework",
            "characterId": "cyndaquil",
            "characterName": "Cyndaquil",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/cyndaquilmaybefacepicture.png"
        },
        {
            "text": "Light Screen Screens the team; Razor Leaf and Synthesis are stronger while Screened. Main skill: Light Screen. Skills: Light Screen, Razor Leaf, Synthesis, Protect.",
            "changeType": "rework",
            "characterId": "chikorita",
            "characterName": "Chikorita",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Chikorita/chikoritanewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Chikorita/chikoritanewfacepicture.png"
        },
        {
            "text": "Scary Face Scares an enemy; Water Gun and Aqua Tail hit Scared enemies harder. Main skill: Scary Face. Skills: Scary Face, Water Gun, Aqua Tail, Protect.",
            "changeType": "rework",
            "characterId": "totodile",
            "characterName": "Totodile",
            "facePicture": "assets/images/PokemonArena/Cyndaquil/Totodile/totodilenewfacepicture.png",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Cyndaquil/Totodile/totodilenewfacepicture.png"
        },
        {
            "text": "Hypnosis puts an enemy to Sleep; Dream Eater and Nightmare feast on Sleeping enemies. Evolves into Hypno on its 4th turn. Main skill: Hypnosis. Skills: Hypnosis, Dream Eater, Nightmare, Protect.",
            "changeType": "rework",
            "characterId": "drowzee",
            "characterName": "Drowzee",
            "facePicture": "assets/images/PokemonArena/Drowzee/FP.webp",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Drowzee/FP.webp"
        },
        {
            "text": "Rage makes Primeape Raging; it hits harder and crits more while Raging. Main skill: Rage. Skills: Rage, Rock Smash, Close Combat, Detect.",
            "changeType": "rework",
            "characterId": "primeape",
            "characterName": "Primeape",
            "facePicture": "assets/images/PokemonArena/Primeape/Primeape-FP.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/Primeape/Primeape-FP.jpg"
        },
        {
            "text": "Bone Guard readies Marowak's bone; its bone attacks are stronger while Bone Ready. Main skill: Bone Guard. Skills: Bone Guard, Bone Club, Bonemerang, Bone Rush.",
            "changeType": "rework",
            "characterId": "marowak",
            "characterName": "Marowak",
            "facePicture": "assets/images/PokemonArena/marowak/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/marowak/facepicture.jpg"
        },
        {
            "text": "Vice Grip Grips an enemy; X-Scissor and Seismic Toss punish Gripped enemies. Main skill: Vice Grip. Skills: Vice Grip, X-Scissor, Seismic Toss, Detect.",
            "changeType": "rework",
            "characterId": "pinsir",
            "characterName": "Pinsir",
            "facePicture": "assets/images/PokemonArena/pinsir/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/pinsir/facepicture.jpg"
        },
        {
            "text": "Horn Attack makes Tauros Enraged; Take-Down and Earthquake are stronger while Enraged. Main skill: Horn Attack. Skills: Horn Attack, Take-Down, Earthquake, Protect.",
            "changeType": "rework",
            "characterId": "tauros",
            "characterName": "Tauros",
            "facePicture": "assets/images/PokemonArena/tauros/facepicture.jpg",
            "skillId": "",
            "skillName": "",
            "skillimage": "assets/images/PokemonArena/tauros/facepicture.jpg"
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
