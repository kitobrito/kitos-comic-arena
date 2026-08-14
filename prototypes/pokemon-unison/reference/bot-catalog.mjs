// Fake opponent accounts used to fill Quick/Ranked matches when no real
// player is found in time (see queue-service.mjs). Mirrors the spirit of
// production's fake-account pool (kitos-comic-arena/server.js's
// POKEMON_BATTLE_PLAYER_ACCOUNTS / FAKE_BATTLE_PLAYER_ACCOUNTS) - invented
// trainer handles, not existing Pokemon characters, with a preset team and
// win/loss/streak stats that already sit on the real ladder curve.

import { getCumulativeExperienceForLevel, getRankInfoForLevel } from './ladder-catalog.mjs';

function botLadder({ level, wins, losses, streak }) {
    return {
        level,
        rank: getRankInfoForLevel(level).rank,
        experiencePoints: getCumulativeExperienceForLevel(level),
        wins,
        losses,
        streak,
        highestStreak: Math.max(streak, 0),
        highestLevel: level,
        ladderRank: null,
        isTopRank: false,
    };
}

const RAW_BOT_ACCOUNTS = [
    { username: 'Sproutling', team: ['bulbasaur', 'pidgey', 'ekans'], level: 1, wins: 3, losses: 2, streak: 1 },
    { username: 'EmberScout', team: ['charmander', 'zubat', 'meowth'], level: 3, wins: 8, losses: 6, streak: -1 },
    { username: 'TidePaddler', team: ['squirtle', 'krabby', 'magikarp'], level: 6, wins: 15, losses: 10, streak: 2 },
    { username: 'VoltNibble', team: ['pikachu', 'magnemite', 'jolteon'], level: 9, wins: 24, losses: 18, streak: 1 },
    { username: 'LeafWhistle', team: ['chikorita', 'butterfree', 'clefairy'], level: 12, wins: 34, losses: 26, streak: -2 },
    { username: 'RockHopper', team: ['onix', 'machop', 'aerodactyl'], level: 15, wins: 46, losses: 35, streak: 3 },
    { username: 'DuskCharm', team: ['gastly', 'abra', 'hitmonlee'], level: 18, wins: 60, losses: 47, streak: 1 },
    { username: 'StaticPulse', team: ['totodile', 'vaporeon', 'krabby'], level: 21, wins: 75, losses: 60, streak: -1 },
    { username: 'BrineRunner', team: ['cyndaquil', 'flareon', 'meowth'], level: 24, wins: 92, losses: 74, streak: 2 },
    { username: 'ThornGlider', team: ['scyther', 'beedrill', 'jigglypuff'], level: 27, wins: 110, losses: 89, streak: 4 },
    { username: 'FrostQuill', team: ['eevee', 'mr-mime', 'hitmonchan'], level: 30, wins: 130, losses: 106, streak: -3 },
    { username: 'PebbleClaw', team: ['aerodactyl', 'scraggy', 'machop'], level: 33, wins: 151, losses: 124, streak: 1 },
    { username: 'GaleStriker', team: ['moltres', 'zapdos', 'dragonite'], level: 36, wins: 174, losses: 143, streak: 2 },
    { username: 'CinderVane', team: ['mewtwo', 'mew', 'aegislash'], level: 39, wins: 198, losses: 164, streak: -1 },
    { username: 'ShadowMoth', team: ['primeape', 'ditto', 'nincada'], level: 42, wins: 224, losses: 186, streak: 5 },
    { username: 'StormEcho', team: ['zapdos', 'dragapult', 'articuno'], level: 45, wins: 251, losses: 209, streak: 1 },
    { username: 'DriftKnight', team: ['dragonite', 'aegislash', 'scraggy'], level: 48, wins: 280, losses: 234, streak: -2 },
    { username: 'AuroraFang', team: ['articuno', 'mew', 'ditto'], level: 50, wins: 312, losses: 260, streak: 3 },
];

export const BOT_ACCOUNTS = Object.freeze(
    RAW_BOT_ACCOUNTS.map((account) =>
        Object.freeze({
            username: account.username,
            team: Object.freeze([...account.team]),
            avatarSpeciesId: account.team[0],
            ladder: Object.freeze(botLadder(account)),
        })
    )
);
