{-# LANGUAGE OverloadedStrings #-}

module Pokemon.Roster
    ( defaultTeams
    , findSkill
    , roster
    , speciesById
    ) where

import Data.List (find)
import Data.Map.Strict (Map)
import qualified Data.Map.Strict as Map
import Data.Text (Text)

import Pokemon.Model

mkSkill :: Text -> Text -> Text -> TargetMode -> [Energy] -> Int -> PokemonType -> Bool -> [Effect] -> Skill
mkSkill skillId name description targetMode cost cooldown moveType harmful effects =
    Skill {skillId, name, description, targetMode, cost, cooldown, moveType, harmful, effects}

charmander, squirtle, bulbasaur, pikachu, zubat, chansey :: Species
charmander =
    Species
        "charmander"
        "Charmander"
        [Fire]
        "/game-assets/images/PokemonArena/newcharmanderfp.jpeg"
        [ mkSkill
            "charmander-ember"
            "Ember"
            "20 affliction damage; 30% chance to Burn."
            SingleEnemy
            [Bloodline]
            0
            Fire
            True
            [Damage 20 Affliction, Chance 30 [ApplyStatus Burn "Burn" False Nothing]]
        , mkSkill
            "charmander-rage"
            "Charmander's Rage"
            "25% damage reduction through the opposing turn."
            Self
            [Bloodline]
            3
            Normal
            False
            [ApplySelfStatus Rage "Rage" True (Just 1)]
        ]

squirtle =
    Species
        "squirtle"
        "Squirtle"
        [Water]
        "/game-assets/images/PokemonArena/newsquirtlefp.jpeg"
        [ mkSkill
            "squirtle-water-gun"
            "Water Gun"
            "20 damage now and 10 next turn."
            SingleEnemy
            [Ninjutsu]
            0
            Water
            True
            [Damage 20 NormalDamage, ApplyStatus WaterGunFollowup "Water Gun" False (Just 1)]
        , mkSkill
            "squirtle-withdraw"
            "Withdraw"
            "Blocks the next harmful skill."
            SelfOrSingleAlly
            [Random, Random]
            2
            Water
            False
            [ApplyStatus Withdraw "Withdraw" True (Just 1)]
        ]

bulbasaur =
    Species
        "bulbasaur"
        "Bulbasaur"
        [Grass, Poison]
        "/game-assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg"
        [ mkSkill
            "bulbasaur-leech-seed"
            "Leech Seed"
            "Steals 10 HP over three target turns."
            SingleEnemy
            [Taijutsu]
            1
            Grass
            True
            [ApplyStatus (LeechSeed A 0) "Leech Seed" False (Just 5)]
        , mkSkill
            "bulbasaur-vine-whip"
            "Vine Whip"
            "25 piercing damage and a harmful-skill stun."
            SingleEnemy
            [Taijutsu, Random]
            1
            Grass
            True
            [Damage 25 Piercing, ApplyStatus HarmfulStun "Harmful Skills Stunned" False (Just 1)]
        ]

pikachu =
    Species
        "pikachu"
        "Pikachu"
        [Electric]
        "/game-assets/images/PokemonArena/newpikachufp.jpeg"
        [ mkSkill
            "pikachu-thundershock"
            "Thundershock"
            "20 piercing damage plus 15 to another enemy."
            SingleEnemy
            [Genjutsu]
            0
            Electric
            True
            [Damage 20 Piercing, RandomOtherEnemyDamage 15 Piercing]
        , mkSkill
            "pikachu-agility"
            "Pikachu Agility"
            "Invulnerable through the opposing turn."
            Self
            [Random, Random]
            4
            Electric
            False
            [ApplySelfStatus Agility "Agility" False (Just 1)]
        ]

zubat =
    Species
        "zubat"
        "Zubat"
        [Poison, Flying]
        "/game-assets/images/PokemonArena/zubat/zubatfp.webp"
        [ mkSkill
            "zubat-leech-life"
            "Leech Life"
            "Steals 25 HP."
            SingleEnemy
            [Bloodline]
            1
            Bug
            True
            [Drain 25 NormalDamage]
        , mkSkill
            "zubat-bite"
            "Bite"
            "20 damage and empowers Leech Life."
            SingleEnemy
            [Taijutsu]
            0
            Dark
            True
            [Damage 20 NormalDamage, ApplySelfStatus BiteEmpower "Bite Empowerment" True (Just 2)]
        ]

chansey =
    Species
        "chansey"
        "Chansey"
        [Normal]
        "/game-assets/images/PokemonArena/Chansey/chanseyfp.webp"
        [ mkSkill
            "chansey-eggbomb"
            "Egg Bomb"
            "20 affliction damage and blocks healing."
            SingleEnemy
            [Random]
            1
            Normal
            True
            [Damage 20 Affliction, ApplyStatus HealBlock "Healing Blocked" False (Just 1)]
        , mkSkill
            "chansey-softboil"
            "Softboil"
            "Heals one ally for 25 HP."
            SelfOrSingleAlly
            [Genjutsu]
            1
            Normal
            False
            [Heal 25]
        ]

roster :: Map Text Species
roster = Map.fromList [(speciesId species, species) | species <- allSpecies]
  where
    allSpecies = [charmander, squirtle, bulbasaur, pikachu, zubat, chansey]

speciesById :: Text -> Maybe Species
speciesById ident = Map.lookup ident roster

findSkill :: Unit -> Text -> Maybe Skill
findSkill unit ident = do
    species <- speciesById (speciesId unit)
    find ((== ident) . skillId) (skills species)

defaultTeams :: ([Text], [Text])
defaultTeams =
    ( ["charmander", "squirtle", "bulbasaur"]
    , ["pikachu", "zubat", "chansey"]
    )
