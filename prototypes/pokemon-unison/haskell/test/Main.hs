{-# LANGUAGE OverloadedStrings #-}

module Main (main) where

import Test.Hspec

import Pokemon.Engine
import Pokemon.Model

main :: IO ()
main = hspec do
    describe "typeEffectiveness" do
        it "applies the production flat modifier with no STAB input" do
            typeEffectiveness Water [Fire] `shouldBe` 5
            typeEffectiveness Grass [Poison, Flying] `shouldBe` (-10)
            typeEffectiveness Electric [Ground] `shouldBe` (-10)

    describe "authoritative action validation" do
        it "rejects an out-of-turn action" do
            let game = createGame 42 A
                action = Action B 0 "pikachu-thundershock" A 0
            validateAction game action `shouldBe` Left "It is A's turn."

    describe "deterministic replay" do
        it "produces the same game for the same seed and transcript" do
            let transcript =
                    [ Action A 0 "charmander-ember" B 1
                    , Action B 1 "zubat-bite" A 0
                    ]
            replay 42 transcript `shouldBe` replay 42 transcript

    describe "viewer censorship" do
        it "hides enemy cooldowns" do
            let Right played = applyAction (createGame 42 A) $ Action A 0 "charmander-rage" A 0
                view = viewerState B played
            cooldowns (head $ teamA $ teams view) `shouldBe` mempty
