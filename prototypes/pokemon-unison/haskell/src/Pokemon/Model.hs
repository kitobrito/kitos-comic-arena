{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

module Pokemon.Model
    ( Action (..)
    , DamageKind (..)
    , Effect (..)
    , Energy (..)
    , EnergyPool (..)
    , Event (..)
    , Game (..)
    , Player (..)
    , PokemonType (..)
    , Skill (..)
    , Species (..)
    , Status (..)
    , StatusKind (..)
    , TargetMode (..)
    , Teams (..)
    , Unit (..)
    , ViewerState (..)
    , otherPlayer
    , poolFor
    , setPoolFor
    , setTeamFor
    , teamFor
    ) where

import Data.Aeson (FromJSON (..), ToJSON (..), object, withObject, (.:), (.=))
import Data.Map.Strict (Map)
import Data.Text (Text)
import GHC.Generics (Generic)

data Player = A | B
    deriving stock (Eq, Ord, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

otherPlayer :: Player -> Player
otherPlayer A = B
otherPlayer B = A

data Energy = Taijutsu | Ninjutsu | Bloodline | Genjutsu | Random
    deriving stock (Bounded, Enum, Eq, Ord, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data PokemonType
    = Bug
    | Dark
    | Dragon
    | Electric
    | Fairy
    | Fighting
    | Fire
    | Flying
    | Ghost
    | Grass
    | Ground
    | Ice
    | Normal
    | Poison
    | Psychic
    | Rock
    | Steel
    | Water
    deriving stock (Bounded, Enum, Eq, Ord, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data DamageKind = NormalDamage | Piercing | Affliction
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data TargetMode = SingleEnemy | Self | SelfOrSingleAlly
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data StatusKind
    = Burn
    | Rage
    | WaterGunFollowup
    | Withdraw
    | LeechSeed Player Int
    | HarmfulStun
    | Agility
    | HealBlock
    | BiteEmpower
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Status = Status
    { kind :: StatusKind
    , name :: Text
    , hidden :: Bool
    , remainingActions :: Maybe Int
    , appliedTurn :: Int
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Effect
    = Damage Int DamageKind
    | Heal Int
    | Drain Int DamageKind
    | ApplyStatus StatusKind Text Bool (Maybe Int)
    | ApplySelfStatus StatusKind Text Bool (Maybe Int)
    | Chance Int [Effect]
    | RandomOtherEnemyDamage Int DamageKind
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Skill = Skill
    { skillId :: Text
    , name :: Text
    , description :: Text
    , targetMode :: TargetMode
    , cost :: [Energy]
    , cooldown :: Int
    , moveType :: PokemonType
    , harmful :: Bool
    , effects :: [Effect]
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Species = Species
    { speciesId :: Text
    , name :: Text
    , pokemonTypes :: [PokemonType]
    , facePicture :: Text
    , skills :: [Skill]
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Unit = Unit
    { slot :: Int
    , speciesId :: Text
    , hp :: Int
    , shield :: Int
    , alive :: Bool
    , cooldowns :: Map Text Int
    , statuses :: [Status]
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data EnergyPool = EnergyPool
    { taijutsu :: Int
    , ninjutsu :: Int
    , bloodline :: Int
    , genjutsu :: Int
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Teams = Teams
    { teamA :: [Unit]
    , teamB :: [Unit]
    }
    deriving stock (Eq, Show, Generic)

instance ToJSON Teams where
    toJSON Teams {teamA, teamB} = object ["A" .= teamA, "B" .= teamB]

instance FromJSON Teams where
    parseJSON = withObject "Teams" $ \value ->
        Teams <$> value .: "A" <*> value .: "B"

data Action = Action
    { player :: Player
    , actorSlot :: Int
    , skillId :: Text
    , targetPlayer :: Player
    , targetSlot :: Int
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Event = Event
    { turn :: Int
    , eventKind :: Text
    , message :: Text
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data Game = Game
    { protocolVersion :: Int
    , seed :: Int
    , initialSeed :: Int
    , turnNumber :: Int
    , currentPlayer :: Player
    , winner :: Maybe Player
    , teams :: Teams
    , energyA :: EnergyPool
    , energyB :: EnergyPool
    , actions :: [Action]
    , events :: [Event]
    }
    deriving stock (Eq, Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

data ViewerState = ViewerState
    { protocolVersion :: Int
    , turnNumber :: Int
    , currentPlayer :: Player
    , winner :: Maybe Player
    , viewer :: Player
    , teams :: Teams
    , ownEnergy :: EnergyPool
    , enemyEnergyTotal :: Int
    , legalActions :: [Action]
    , recentEvents :: [Event]
    }
    deriving stock (Eq, Show, Generic)

instance ToJSON ViewerState where
    toJSON ViewerState {..} =
        object
            [ "protocolVersion" .= protocolVersion
            , "turnNumber" .= turnNumber
            , "currentPlayer" .= currentPlayer
            , "winner" .= winner
            , "viewer" .= viewer
            , "teams" .= teams
            , "energy"
                .= case viewer of
                    A -> object ["A" .= ownEnergy, "B" .= object ["total" .= enemyEnergyTotal]]
                    B -> object ["A" .= object ["total" .= enemyEnergyTotal], "B" .= ownEnergy]
            , "legalActions" .= legalActions
            , "recentEvents" .= recentEvents
            ]

teamFor :: Player -> Teams -> [Unit]
teamFor A = teamA
teamFor B = teamB

setTeamFor :: Player -> [Unit] -> Teams -> Teams
setTeamFor A next pair = pair {teamA = next}
setTeamFor B next pair = pair {teamB = next}

poolFor :: Player -> Game -> EnergyPool
poolFor A = energyA
poolFor B = energyB

setPoolFor :: Player -> EnergyPool -> Game -> Game
setPoolFor A next game = game {energyA = next}
setPoolFor B next game = game {energyB = next}
