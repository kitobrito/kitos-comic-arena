{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE OverloadedStrings #-}

module Pokemon.Engine
    ( applyAction
    , createGame
    , legalActions
    , replay
    , typeEffectiveness
    , validateAction
    , viewerState
    ) where

import Control.Monad (foldM)
import Data.Bits (shiftL, shiftR, xor)
import Data.List (find)
import qualified Data.Map.Strict as Map
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as Text
import Data.Word (Word32)

import Pokemon.Model
import Pokemon.Roster (defaultTeams, findSkill, speciesById)

maxHp :: Int
maxHp = 100

initialPool :: EnergyPool
initialPool = EnergyPool 2 2 2 2

createGame :: Int -> Player -> Game
createGame initialSeed currentPlayer =
    Game
        { protocolVersion = 1
        , seed = initialSeed
        , initialSeed
        , turnNumber = 0
        , currentPlayer
        , winner = Nothing
        , teams = Teams (makeTeam teamIdsA) (makeTeam teamIdsB)
        , energyA = initialPool
        , energyB = initialPool
        , actions = []
        , events = [Event 0 "match-start" (playerText currentPlayer <> " has the first turn.")]
        }
  where
    (teamIdsA, teamIdsB) = defaultTeams

makeTeam :: [Text] -> [Unit]
makeTeam = zipWith makeUnit [0 ..]

makeUnit :: Int -> Text -> Unit
makeUnit slot speciesId =
    Unit
        { slot
        , speciesId
        , hp = maxHp
        , shield = 0
        , alive = True
        , cooldowns = Map.empty
        , statuses = []
        }

playerText :: Player -> Text
playerText A = "A"
playerText B = "B"

unitAt :: Game -> Player -> Int -> Maybe Unit
unitAt game player wantedSlot =
    find ((== wantedSlot) . slot) $ teamFor player (teams game)

replaceUnit :: Unit -> [Unit] -> [Unit]
replaceUnit next = fmap (\unit -> if slot unit == slot next then next else unit)

setUnit :: Player -> Unit -> Game -> Game
setUnit player unit game =
    game {teams = setTeamFor player (replaceUnit unit $ teamFor player $ teams game) (teams game)}

modifyUnit :: Player -> Int -> (Unit -> Unit) -> Game -> Game
modifyUnit player wantedSlot f game =
    maybe game (\unit -> setUnit player (f unit) game) (unitAt game player wantedSlot)

activeStatus :: Status -> Bool
activeStatus Status {remainingActions = Nothing} = True
activeStatus Status {remainingActions = Just remaining} = remaining > 0

hasStatus :: (StatusKind -> Bool) -> Unit -> Bool
hasStatus predicate = any (\status -> activeStatus status && predicate (kind status)) . statuses

validateAction :: Game -> Action -> Either Text ()
validateAction game action
    | winner game /= Nothing = Left "The match is already over."
    | player action /= currentPlayer game = Left $ "It is " <> playerText (currentPlayer game) <> "'s turn."
    | otherwise = do
        actor <- maybe (Left "Actor does not exist.") Right $ unitAt game (player action) (actorSlot action)
        if not (alive actor) then Left "Actor must be alive." else pure ()
        skill <- maybe (Left "Unknown skill for this actor.") Right $ findSkill actor (skillId action)
        if Map.findWithDefault 0 (skillId skill) (cooldowns actor) > 0
            then Left "That skill is on cooldown."
            else pure ()
        if harmful skill && hasStatus (== HarmfulStun) actor
            then Left "This Pokemon's harmful skills are stunned."
            else pure ()
        _ <- spend (cost skill) (poolFor (player action) game)
        target <- maybe (Left "Target does not exist.") Right $ unitAt game (targetPlayer action) (targetSlot action)
        if not (alive target) then Left "Target must be alive." else pure ()
        validateTarget action skill

validateTarget :: Action -> Skill -> Either Text ()
validateTarget action skill =
    case targetMode skill of
        SingleEnemy
            | targetPlayer action == player action -> Left "This skill must target an enemy."
        Self
            | targetPlayer action /= player action || targetSlot action /= actorSlot action ->
                Left "This skill can only target its user."
        SelfOrSingleAlly
            | targetPlayer action /= player action -> Left "This skill must target an ally."
        _ -> Right ()

spend :: [Energy] -> EnergyPool -> Either Text EnergyPool
spend costs pool = do
    afterSpecific <- foldM spendSpecific pool $ filter (/= Random) costs
    foldM (\next _ -> spendRandom next) afterSpecific $ filter (== Random) costs

spendSpecific :: EnergyPool -> Energy -> Either Text EnergyPool
spendSpecific pool energy =
    case energy of
        Taijutsu -> takeOne taijutsu (\n next -> next {taijutsu = n}) pool
        Ninjutsu -> takeOne ninjutsu (\n next -> next {ninjutsu = n}) pool
        Bloodline -> takeOne bloodline (\n next -> next {bloodline = n}) pool
        Genjutsu -> takeOne genjutsu (\n next -> next {genjutsu = n}) pool
        Random -> spendRandom pool
  where
    takeOne getter setter next
        | getter next <= 0 = Left "Not enough energy."
        | otherwise = Right $ setter (getter next - 1) next

spendRandom :: EnergyPool -> Either Text EnergyPool
spendRandom pool
    | taijutsu pool > 0 = Right pool {taijutsu = taijutsu pool - 1}
    | ninjutsu pool > 0 = Right pool {ninjutsu = ninjutsu pool - 1}
    | bloodline pool > 0 = Right pool {bloodline = bloodline pool - 1}
    | genjutsu pool > 0 = Right pool {genjutsu = genjutsu pool - 1}
    | otherwise = Left "Not enough energy."

appendEvent :: Text -> Text -> Game -> Game
appendEvent eventKind message game =
    game {events = events game <> [Event (turnNumber game) eventKind message]}

speciesName :: Unit -> Text
speciesName unit = maybe (speciesId unit) name $ speciesById (speciesId unit)

applyAction :: Game -> Action -> Either Text Game
applyAction game action = do
    validateAction game action
    actor <- maybe (Left "Actor disappeared.") Right $ unitAt game (player action) (actorSlot action)
    target <- maybe (Left "Target disappeared.") Right $ unitAt game (targetPlayer action) (targetSlot action)
    skill <- maybe (Left "Skill disappeared.") Right $ findSkill actor (skillId action)
    nextPool <- spend (cost skill) (poolFor (player action) game)
    let paid = setPoolFor (player action) nextPool game
        recorded = paid {actions = actions paid <> [action]}
        announced =
            appendEvent
                "skill"
                (speciesName actor <> " used " <> name skill <> " on " <> speciesName target <> ".")
                recorded
    resolved <-
        if blocksSkill skill target
            then Right $ consumeGuard (targetPlayer action) (targetSlot action) skill announced
            else foldM (resolveEffect action skill) announced (effects skill)
    let cooled =
            modifyUnit
                (player action)
                (actorSlot action)
                (\unit -> unit {cooldowns = Map.insert (skillId skill) (cooldown skill + 1) (cooldowns unit)})
                resolved
    pure $ finishTurn cooled

blocksSkill :: Skill -> Unit -> Bool
blocksSkill skill target =
    harmful skill
        && (hasStatus (== Agility) target || hasStatus (== Withdraw) target)

consumeGuard :: Player -> Int -> Skill -> Game -> Game
consumeGuard targetPlayer targetSlot skill game =
    appendEvent "blocked" (name skill <> " was blocked.") $
        modifyUnit targetPlayer targetSlot consume game
  where
    consume unit =
        unit
            { statuses =
                fmap
                    (\status -> if kind status == Withdraw then status {remainingActions = Just 0} else status)
                    (statuses unit)
            }

resolveEffect :: Action -> Skill -> Game -> Effect -> Either Text Game
resolveEffect action skill game effect =
    case effect of
        Damage amount damageKind ->
            Right $ damageTarget action skill amount damageKind game
        Heal amount ->
            Right $ healTarget action (name skill) amount game
        Drain amount damageKind ->
            let before = maybe 0 hp $ unitAt game (targetPlayer action) (targetSlot action)
                damaged = damageTarget action skill amount damageKind game
                after = maybe before hp $ unitAt damaged (targetPlayer action) (targetSlot action)
             in Right $ healActor action (name skill) (before - after) damaged
        ApplyStatus statusKind statusName hidden duration ->
            Right $ addStatusToTarget action statusKind statusName hidden duration game
        ApplySelfStatus statusKind statusName hidden duration ->
            Right $ addStatusToActor action statusKind statusName hidden duration game
        Chance percent nested ->
            let (rolled, advanced) = randomPercent game
                logged =
                    appendEvent
                        "roll"
                        (name skill <> " rolled " <> Text.pack (show rolled) <> " against " <> Text.pack (show percent) <> "%.")
                        advanced
             in if rolled < percent
                    then foldM (resolveEffect action skill) logged nested
                    else Right logged
        RandomOtherEnemyDamage amount damageKind ->
            case filter ((/= targetSlot action) . slot) $ livingTeam (otherPlayer $ player action) game of
                [] -> Right game
                candidates ->
                    let (index, advanced) = randomIndex (length candidates) game
                        picked = candidates !! index
                        nextAction =
                            action
                                { targetPlayer = otherPlayer (player action)
                                , targetSlot = slot picked
                                }
                     in Right $ damageTarget nextAction skill amount damageKind advanced

nextRandom :: Game -> (Double, Game)
nextRandom game =
    let start = fromIntegral (seed game) :: Word32
        first = start `xor` (start `shiftL` 13)
        second = first `xor` (first `shiftR` 17)
        next = second `xor` (second `shiftL` 5)
        unitValue = fromIntegral next / 4294967296
     in (unitValue, game {seed = fromIntegral next})

randomPercent :: Game -> (Int, Game)
randomPercent game =
    let (unitValue, advanced) = nextRandom game
     in (floor $ unitValue * 100, advanced)

randomIndex :: Int -> Game -> (Int, Game)
randomIndex size game =
    let (unitValue, advanced) = nextRandom game
     in (floor (unitValue * fromIntegral (max 1 size)), advanced)

typeEffectiveness :: PokemonType -> [PokemonType] -> Int
typeEffectiveness attackType = (* 5) . max (-2) . min 2 . sum . fmap (against attackType)
  where
    against attack defense
        | defense `elem` immuneTo attack = -2
        | defense `elem` strongAgainst attack = 1
        | defense `elem` resistedBy attack = -1
        | otherwise = 0

    strongAgainst Normal = []
    strongAgainst Fire = [Grass, Ice, Bug, Steel]
    strongAgainst Water = [Fire, Ground, Rock]
    strongAgainst Electric = [Water, Flying]
    strongAgainst Grass = [Water, Ground, Rock]
    strongAgainst Ice = [Grass, Ground, Flying, Dragon]
    strongAgainst Fighting = [Normal, Ice, Rock, Dark, Steel]
    strongAgainst Poison = [Grass, Fairy]
    strongAgainst Ground = [Fire, Electric, Poison, Rock, Steel]
    strongAgainst Flying = [Grass, Fighting, Bug]
    strongAgainst Psychic = [Fighting, Poison]
    strongAgainst Bug = [Grass, Psychic, Dark]
    strongAgainst Rock = [Fire, Ice, Flying, Bug]
    strongAgainst Ghost = [Psychic, Ghost]
    strongAgainst Dragon = [Dragon]
    strongAgainst Dark = [Psychic, Ghost]
    strongAgainst Steel = [Ice, Rock, Fairy]
    strongAgainst Fairy = [Fighting, Dragon, Dark]

    resistedBy Normal = [Rock, Steel]
    resistedBy Fire = [Fire, Water, Rock, Dragon]
    resistedBy Water = [Water, Grass, Dragon]
    resistedBy Electric = [Electric, Grass, Dragon]
    resistedBy Grass = [Fire, Grass, Poison, Flying, Bug, Dragon, Steel]
    resistedBy Ice = [Fire, Water, Ice, Steel]
    resistedBy Fighting = [Poison, Flying, Psychic, Bug, Fairy]
    resistedBy Poison = [Poison, Ground, Rock, Ghost]
    resistedBy Ground = [Grass, Bug]
    resistedBy Flying = [Electric, Rock, Steel]
    resistedBy Psychic = [Psychic, Steel]
    resistedBy Bug = [Fire, Fighting, Poison, Flying, Ghost, Steel, Fairy]
    resistedBy Rock = [Fighting, Ground, Steel]
    resistedBy Ghost = [Dark]
    resistedBy Dragon = [Steel]
    resistedBy Dark = [Fighting, Dark, Fairy]
    resistedBy Steel = [Fire, Water, Electric, Steel]
    resistedBy Fairy = [Fire, Poison, Steel]

    immuneTo Normal = [Ghost]
    immuneTo Electric = [Ground]
    immuneTo Fighting = [Ghost]
    immuneTo Poison = [Steel]
    immuneTo Ground = [Flying]
    immuneTo Psychic = [Dark]
    immuneTo Ghost = [Normal]
    immuneTo Dragon = [Fairy]
    immuneTo _ = []

damageTarget :: Action -> Skill -> Int -> DamageKind -> Game -> Game
damageTarget action skill base damageKind game =
    case (unitAt game (player action) (actorSlot action), unitAt game (targetPlayer action) (targetSlot action)) of
        (Just actor, Just target) ->
            let defenderTypes = maybe [] pokemonTypes $ speciesById (speciesId target)
                modifier = typeEffectiveness (moveType skill) defenderTypes
                debuff =
                    if damageKind == Affliction
                        then 0
                        else sum [5 | status <- statuses actor, activeStatus status, kind status == Burn]
                adjustedBase = max 0 $ base - debuff
                typed
                    | adjustedBase <= 0 = 0
                    | modifier < 0 = max 5 $ adjustedBase + modifier
                    | otherwise = adjustedBase + modifier
                reduction =
                    if damageKind /= Affliction && hasStatus (== Rage) target
                        then 25
                        else 0
                reduced = ceiling $ fromIntegral typed * (1 - fromIntegral reduction / 100 :: Double)
                shieldHit = if damageKind == NormalDamage then min (shield target) reduced else 0
                hpHit = reduced - shieldHit
                nextHp = max 0 $ hp target - hpHit
                nextTarget =
                    target
                        { hp = nextHp
                        , shield = shield target - shieldHit
                        , alive = nextHp > 0
                        }
                message =
                    speciesName actor
                        <> "'s "
                        <> name skill
                        <> " dealt "
                        <> Text.pack (show reduced)
                        <> " damage to "
                        <> speciesName target
                        <> "."
             in appendEvent "damage" message $ setUnit (targetPlayer action) nextTarget game
        _ -> game

healUnit :: Text -> Int -> Unit -> (Int, Unit)
healUnit _ _ unit | hasStatus (== HealBlock) unit = (0, unit)
healUnit _ amount unit =
    let restored = min amount (maxHp - hp unit)
     in (restored, unit {hp = hp unit + restored})

healTarget :: Action -> Text -> Int -> Game -> Game
healTarget action reason amount game =
    case unitAt game (targetPlayer action) (targetSlot action) of
        Nothing -> game
        Just target ->
            let (restored, next) = healUnit reason amount target
             in appendEvent "heal" (speciesName target <> " restored " <> Text.pack (show restored) <> " HP.") $
                    setUnit (targetPlayer action) next game

healActor :: Action -> Text -> Int -> Game -> Game
healActor action reason amount game =
    healTarget
        action
            { targetPlayer = player action
            , targetSlot = actorSlot action
            }
        reason
        amount
        game

normalizeSourceStatus :: Action -> StatusKind -> StatusKind
normalizeSourceStatus action (LeechSeed _ _) = LeechSeed (player action) (actorSlot action)
normalizeSourceStatus _ statusKind = statusKind

addStatus :: Int -> StatusKind -> Text -> Bool -> Maybe Int -> Unit -> Unit
addStatus currentTurn statusKind statusName hidden duration unit =
    unit
        { statuses =
            statuses unit
                <> [ Status
                        { kind = statusKind
                        , name = statusName
                        , hidden
                        , remainingActions = duration
                        , appliedTurn = currentTurn
                        }
                   ]
        }

addStatusToTarget :: Action -> StatusKind -> Text -> Bool -> Maybe Int -> Game -> Game
addStatusToTarget action statusKind statusName hidden duration game =
    modifyUnit
        (targetPlayer action)
        (targetSlot action)
        (addStatus (turnNumber game) (normalizeSourceStatus action statusKind) statusName hidden duration)
        game

addStatusToActor :: Action -> StatusKind -> Text -> Bool -> Maybe Int -> Game -> Game
addStatusToActor action statusKind statusName hidden duration game =
    modifyUnit
        (player action)
        (actorSlot action)
        (addStatus (turnNumber game) statusKind statusName hidden duration)
        game

livingTeam :: Player -> Game -> [Unit]
livingTeam player = filter alive . teamFor player . teams

ageStatuses :: Game -> Game
ageStatuses game =
    foldl agePlayer game [A, B]
  where
    agePlayer current player =
        current
            { teams =
                setTeamFor
                    player
                    (fmap ageUnit $ teamFor player $ teams current)
                    (teams current)
            }
    ageUnit unit =
        unit
            { statuses =
                filter activeStatus $
                    fmap ageStatus (statuses unit)
            }
    ageStatus status@Status {remainingActions = Just remaining}
        | appliedTurn status < turnNumber game = status {remainingActions = Just (remaining - 1)}
    ageStatus status = status

decrementCooldowns :: Player -> Game -> Game
decrementCooldowns player game =
    game
        { teams =
            setTeamFor player (fmap tick $ teamFor player $ teams game) (teams game)
        }
  where
    tick unit =
        unit
            { cooldowns =
                Map.mapMaybe
                    (\remaining -> let next = remaining - 1 in if next > 0 then Just next else Nothing)
                    (cooldowns unit)
            }

resolvePeriodic :: Player -> Game -> Game
resolvePeriodic player game =
    foldl resolveUnit game $ fmap slot $ livingTeam player game
  where
    resolveUnit current wantedSlot =
        foldl (resolveStatus player wantedSlot) current $
            maybe [] statuses $ unitAt current player wantedSlot

resolveStatus :: Player -> Int -> Game -> Status -> Game
resolveStatus player wantedSlot game status
    | not (activeStatus status) = game
    | kind status == Burn = directPeriodicDamage player wantedSlot 5 "Burn" game
    | kind status == WaterGunFollowup =
        modifyUnit player wantedSlot consume $
            directPeriodicDamage player wantedSlot 10 "Water Gun" game
    | otherwise =
        case kind status of
            LeechSeed sourcePlayer sourceSlot ->
                let before = maybe 0 hp $ unitAt game player wantedSlot
                    damaged = directPeriodicDamage player wantedSlot 10 "Leech Seed" game
                    after = maybe before hp $ unitAt damaged player wantedSlot
                 in healPeriodicSource sourcePlayer sourceSlot (before - after) damaged
            _ -> game
  where
    consume unit =
        unit
            { statuses =
                fmap
                    (\entry -> if kind entry == WaterGunFollowup then entry {remainingActions = Just 0} else entry)
                    (statuses unit)
            }

directPeriodicDamage :: Player -> Int -> Int -> Text -> Game -> Game
directPeriodicDamage player wantedSlot amount reason game =
    case unitAt game player wantedSlot of
        Nothing -> game
        Just unit ->
            let nextHp = max 0 $ hp unit - amount
                next = unit {hp = nextHp, alive = nextHp > 0}
             in appendEvent "periodic" (speciesName unit <> " took " <> Text.pack (show amount) <> " from " <> reason <> ".") $
                    setUnit player next game

healPeriodicSource :: Player -> Int -> Int -> Game -> Game
healPeriodicSource player wantedSlot amount game =
    case unitAt game player wantedSlot of
        Just unit | alive unit ->
            let (_, next) = healUnit "Leech Seed" amount unit
             in setUnit player next game
        _ -> game

grantEnergy :: Player -> Game -> Game
grantEnergy player game =
    setPoolFor player (gain picked $ poolFor player game) game
  where
    cycleOrder = [Taijutsu, Ninjutsu, Bloodline, Genjutsu]
    offset = if player == B then 1 else 0
    picked = cycleOrder !! ((turnNumber game + offset) `mod` length cycleOrder)
    gain Taijutsu pool = pool {taijutsu = taijutsu pool + 1}
    gain Ninjutsu pool = pool {ninjutsu = ninjutsu pool + 1}
    gain Bloodline pool = pool {bloodline = bloodline pool + 1}
    gain Genjutsu pool = pool {genjutsu = genjutsu pool + 1}
    gain Random pool = pool

setWinner :: Game -> Game
setWinner game
    | null (livingTeam A game) = game {winner = Just B}
    | null (livingTeam B game) = game {winner = Just A}
    | otherwise = game

finishTurn :: Game -> Game
finishTurn game =
    let checked = setWinner game
     in case winner checked of
            Just _ -> checked
            Nothing ->
                let aged = ageStatuses checked
                    nextPlayer = otherPlayer (currentPlayer aged)
                    advanced =
                        aged
                            { turnNumber = turnNumber aged + 1
                            , currentPlayer = nextPlayer
                            }
                    cooled = decrementCooldowns nextPlayer advanced
                    periodic = resolvePeriodic nextPlayer cooled
                    checkedAgain = setWinner periodic
                 in case winner checkedAgain of
                        Just _ -> checkedAgain
                        Nothing -> grantEnergy nextPlayer checkedAgain

replay :: Int -> [Action] -> Either Text Game
replay initialSeed = foldM applyAction (createGame initialSeed A)

legalActions :: Game -> Player -> [Action]
legalActions game player =
    [ action
    | actor <- teamFor player (teams game)
    , actorSkill <- maybe [] skills $ speciesById (speciesId actor)
    , targetPlayer <- [A, B]
    , target <- teamFor targetPlayer (teams game)
    , let action =
            Action
                { player
                , actorSlot = slot actor
                , skillId = skillId actorSkill
                , targetPlayer
                , targetSlot = slot target
                }
    , validateAction game action == Right ()
    ]

energyTotal :: EnergyPool -> Int
energyTotal pool = taijutsu pool + ninjutsu pool + bloodline pool + genjutsu pool

censorTeam :: Bool -> [Unit] -> [Unit]
censorTeam ownTeam = fmap censor
  where
    censor unit =
        unit
            { cooldowns = if ownTeam then cooldowns unit else Map.empty
            , statuses = filter (\status -> ownTeam || not (hidden status)) (statuses unit)
            }

viewerState :: Player -> Game -> ViewerState
viewerState viewer game =
    ViewerState
        { protocolVersion = protocolVersion game
        , turnNumber = turnNumber game
        , currentPlayer = currentPlayer game
        , winner = winner game
        , viewer
        , teams =
            Teams
                (censorTeam (viewer == A) $ teamFor A $ teams game)
                (censorTeam (viewer == B) $ teamFor B $ teams game)
        , ownEnergy = poolFor viewer game
        , enemyEnergyTotal = energyTotal $ poolFor (otherPlayer viewer) game
        , legalActions = legalActions game viewer
        , recentEvents = drop (max 0 $ length (events game) - 12) (events game)
        }
