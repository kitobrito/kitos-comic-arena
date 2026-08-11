port module Main exposing (main)

import Browser
import Html exposing (Html, button, div, h1, h2, img, li, ol, p, small, span, strong, text)
import Html.Attributes exposing (alt, class, disabled, src, style)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


port submitAction : Encode.Value -> Cmd msg


port stateChanged : (Decode.Value -> msg) -> Sub msg


type alias Unit =
    { slot : Int
    , speciesId : String
    , hp : Int
    , shield : Int
    , alive : Bool
    , statuses : List Status
    }


type alias Status =
    { name : String }


type alias Teams =
    { teamA : List Unit
    , teamB : List Unit
    }


type alias Action =
    { player : String
    , actorSlot : Int
    , skillId : String
    , targetPlayer : String
    , targetSlot : Int
    }


type alias Event =
    { turn : Int
    , message : String
    }


type alias ViewState =
    { protocolVersion : Int
    , turnNumber : Int
    , currentPlayer : String
    , winner : Maybe String
    , viewer : String
    , teams : Teams
    , legalActions : List Action
    , recentEvents : List Event
    }


type Model
    = Ready ViewState
    | Invalid String


type Msg
    = ReceivedState Decode.Value
    | Submit Action


main : Program Decode.Value Model Msg
main =
    Browser.element
        { init = \flags -> ( decodeState flags, Cmd.none )
        , update = update
        , view = view
        , subscriptions = \_ -> stateChanged ReceivedState
        }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ReceivedState value ->
            ( decodeState value, Cmd.none )

        Submit action ->
            ( model, submitAction (encodeAction action) )


decodeState : Decode.Value -> Model
decodeState value =
    case Decode.decodeValue viewStateDecoder value of
        Ok state ->
            Ready state

        Err problem ->
            Invalid (Decode.errorToString problem)


view : Model -> Html Msg
view model =
    case model of
        Invalid problem ->
            div [ class "panel" ]
                [ h1 [] [ text "Viewer state rejected" ]
                , p [] [ text problem ]
                ]

        Ready state ->
            div [ class "shell" ]
                [ div [ class "hero" ]
                    [ div []
                        [ p [ class "eyebrow" ] [ text ("PROTOCOL v" ++ String.fromInt state.protocolVersion) ]
                        , h1 [] [ text "Pokémon Unison" ]
                        , p [ class "subtitle" ] [ text "Elm renders only viewer-scoped authoritative state." ]
                        ]
                    , div [ class "turn-card" ]
                        [ span [] [ text ("Turn " ++ String.fromInt (state.turnNumber + 1)) ]
                        , strong [] [ text ("Player " ++ state.currentPlayer) ]
                        ]
                    ]
                , div [ class "arena" ]
                    [ teamView state state.teams.teamA "A"
                    , div [ class "versus" ] [ text "VS" ]
                    , teamView state state.teams.teamB "B"
                    ]
                , div [ class "command-grid" ]
                    [ div [ class "panel" ]
                        [ h2 [] [ text "Legal actions" ]
                        , div [ class "target-list" ] (List.map actionView state.legalActions)
                        ]
                    , div [ class "panel event-panel" ]
                        [ h2 [] [ text "Event stream" ]
                        , ol [ class "event-log" ] (List.map eventView (List.reverse state.recentEvents))
                        ]
                    ]
                ]


teamView : ViewState -> List Unit -> String -> Html Msg
teamView state units player =
    div []
        [ div [ class "team-heading" ]
            [ span [] [ text ("TEAM " ++ player) ]
            , small [] [ text (if player == state.viewer then "your full state" else "censored state") ]
            ]
        , div [ class "team" ] (List.map (unitView state player) units)
        ]


unitView : ViewState -> String -> Unit -> Html Msg
unitView state player unit =
    let
        species =
            speciesInfo unit.speciesId

        canAct =
            player == state.currentPlayer
                && unit.alive
                && List.any (\action -> action.actorSlot == unit.slot) state.legalActions
    in
    div
        [ class
            (String.join " "
                [ "unit"
                , if unit.alive then "" else "defeated"
                , if canAct then "selectable" else ""
                ]
            )
        ]
        [ img [ src species.face, alt species.name ] []
        , div [ class "unit-body" ]
            [ div [ class "unit-name" ]
                [ strong [] [ text species.name ]
                , span [] [ text species.types ]
                ]
            , div [ class "hp-track" ]
                [ div [ class "hp-fill", style "width" (String.fromInt unit.hp ++ "%") ] [] ]
            , div [ class "unit-stats" ]
                [ span [] [ text (String.fromInt unit.hp ++ " HP") ]
                , span [] [ text (String.fromInt unit.shield ++ " shield") ]
                ]
            , div [ class "status-list" ] (List.map statusView unit.statuses)
            ]
        ]


statusView : Status -> Html Msg
statusView status =
    span [ class "status" ] [ text status.name ]


actionView : Action -> Html Msg
actionView action =
    button
        [ onClick (Submit action)
        , disabled False
        ]
        [ text
            ("P"
                ++ action.player
                ++ " slot "
                ++ String.fromInt action.actorSlot
                ++ " · "
                ++ action.skillId
                ++ " → P"
                ++ action.targetPlayer
                ++ " slot "
                ++ String.fromInt action.targetSlot
            )
        ]


eventView : Event -> Html Msg
eventView event =
    li []
        [ span [] [ text ("T" ++ String.fromInt (event.turn + 1)) ]
        , span [] [ text event.message ]
        ]


type alias SpeciesInfo =
    { name : String
    , face : String
    , types : String
    }


speciesInfo : String -> SpeciesInfo
speciesInfo ident =
    case ident of
        "charmander" ->
            SpeciesInfo "Charmander" "/game-assets/images/PokemonArena/newcharmanderfp.jpeg" "Fire"

        "squirtle" ->
            SpeciesInfo "Squirtle" "/game-assets/images/PokemonArena/newsquirtlefp.jpeg" "Water"

        "bulbasaur" ->
            SpeciesInfo "Bulbasaur" "/game-assets/images/PokemonArena/Bulbasaur/bulbasaurfp.jpg" "Grass / Poison"

        "pikachu" ->
            SpeciesInfo "Pikachu" "/game-assets/images/PokemonArena/newpikachufp.jpeg" "Electric"

        "zubat" ->
            SpeciesInfo "Zubat" "/game-assets/images/PokemonArena/zubat/zubatfp.webp" "Poison / Flying"

        "chansey" ->
            SpeciesInfo "Chansey" "/game-assets/images/PokemonArena/Chansey/chanseyfp.webp" "Normal"

        _ ->
            SpeciesInfo ident "" "Unknown"


viewStateDecoder : Decoder ViewState
viewStateDecoder =
    Decode.map8 ViewState
        (Decode.field "protocolVersion" Decode.int)
        (Decode.field "turnNumber" Decode.int)
        (Decode.field "currentPlayer" Decode.string)
        (Decode.field "winner" (Decode.nullable Decode.string))
        (Decode.field "viewer" Decode.string)
        teamsDecoder
        (Decode.oneOf [ Decode.field "legalActions" (Decode.list actionDecoder), Decode.succeed [] ])
        (Decode.field "recentEvents" (Decode.list eventDecoder))


teamsDecoder : Decoder Teams
teamsDecoder =
    Decode.map2 Teams
        (Decode.at [ "teams", "A" ] (Decode.list unitDecoder))
        (Decode.at [ "teams", "B" ] (Decode.list unitDecoder))


unitDecoder : Decoder Unit
unitDecoder =
    Decode.map6 Unit
        (Decode.field "slot" Decode.int)
        (Decode.field "speciesId" Decode.string)
        (Decode.field "hp" Decode.int)
        (Decode.field "shield" Decode.int)
        (Decode.field "alive" Decode.bool)
        (Decode.field "statuses" (Decode.list statusDecoder))


statusDecoder : Decoder Status
statusDecoder =
    Decode.map Status (Decode.field "name" Decode.string)


actionDecoder : Decoder Action
actionDecoder =
    Decode.map5 Action
        (Decode.field "player" Decode.string)
        (Decode.field "actorSlot" Decode.int)
        (Decode.field "skillId" Decode.string)
        (Decode.field "targetPlayer" Decode.string)
        (Decode.field "targetSlot" Decode.int)


eventDecoder : Decoder Event
eventDecoder =
    Decode.map2 Event
        (Decode.field "turn" Decode.int)
        (Decode.field "message" Decode.string)


encodeAction : Action -> Encode.Value
encodeAction action =
    Encode.object
        [ ( "player", Encode.string action.player )
        , ( "actorSlot", Encode.int action.actorSlot )
        , ( "skillId", Encode.string action.skillId )
        , ( "targetPlayer", Encode.string action.targetPlayer )
        , ( "targetSlot", Encode.int action.targetSlot )
        ]
