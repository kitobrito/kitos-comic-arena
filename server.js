const fs = require('fs');
const https = require('https');
const path = require('path');

// Diagnostic logging for environment variables
console.log('--- Startup Diagnostics ---');
console.log('Current working directory:', process.cwd());
const envPath = path.join(__dirname, '.env');
console.log('.env file expected at:', envPath);
console.log('.env file exists:', fs.existsSync(envPath));
const dotenvResult = require('dotenv').config();
if (dotenvResult.error) {
    console.error('dotenv.config() error:', dotenvResult.error);
} else {
    console.log('dotenv.config() successfully loaded.');
}
console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('---------------------------');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { WebSocketServer, WebSocket } = require('ws');
const battleLogic = require('./battleLogic');
let charactersData = require('./characters');

const app = express();

const PORT = process.env.PORT || 4000;
const TURN_DURATION_MS = 60 * 1000;
const MATCH_FOUND_HOLD_MS = 3 * 1000;
const BATTLE_BOT_QUEUE_TIMEOUT_MS = 20 * 1000;
const BATTLE_BOT_ACTION_DELAY_MS = 15 * 1000;
const BATTLE_BOTS_ENABLED = process.env.ENABLE_BATTLE_BOTS !== 'false';
const DEFAULT_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB || 'comic-arena';
const USERS_COLLECTION = process.env.MONGODB_USERS_COLLECTION || 'users';
const MATCHES_COLLECTION = process.env.MONGODB_MATCHES_COLLECTION || 'matches';
const APP_STATE_COLLECTION = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const NEWS_POSTS_COLLECTION = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const CHARACTERS_FILE_PATH = path.join(__dirname, 'characters.js');
const CHARACTER_OVERRIDES_STATE_KEY = 'character_overrides';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'comic_session';
const SESSION_MAX_AGE_MS =
    Number.parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 7 * 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_INSECURE_HTTP = !IS_PRODUCTION && process.env.ALLOW_INSECURE_HTTP === 'true';
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH;
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH;
const LATEST_CHARACTER_RELEASES = [
    { label: 'Billy Butcher', characterId: 'billy-butcher' },
    { label: 'Predalien', characterId: 'predalien' },
    { label: 'Pvt. Saunders', characterId: 'space-marine-infantry' },
];
const LATEST_CHARACTER_RELEASES_STATE_KEY = 'latest_character_releases';
const MAINTENANCE_MODE_STATE_KEY = 'maintenance_mode';
const MAINTENANCE_MODE_CACHE_TTL_MS = 10 * 1000;
const DEFAULT_PROFILE_AVATAR = 'https://i.postimg.cc/3JqVcPXm/default.png';
const LEGACY_DEFAULT_PROFILE_AVATAR = 'https://i.postimg.cc/zG3W1w6K/itachi.png';
const MISSION_CATALOG_STATE_KEY = 'missions';
let missionCatalogCache = null;
let maintenanceModeCache = {
    enabled: false,
    expiresAt: 0,
};
let maintenanceModeStatePromise = null;
const DEFAULT_MISSION_CATALOG = [
    {
        missionId: 'adored-elder-sister',
        title: 'The Adored Elder Sister',
        level_requirement: 1,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        reward: 'Mission "The Adored Elder Sister" completion.',
        image: 'assets/images/ingamebgexample.png',
        imageAlt: 'The Adored Elder Sister mission artwork',
        characterName: 'Hyuuga Hanabi',
        portrait: 'assets/images/deadcharacter.png',
        portraitAlt: 'Hyuuga Hanabi portrait',
        requirements: [],
        goals: [
            'Use Hyuuga Neji\'s "Gentle Fist" 8 times. (0/8)',
            'Use Hyuuga Hinata\'s "Gentle Fist" 8 times. (0/8)',
        ],
        sortOrder: 1,
    },
    {
        missionId: 'yellow-flash',
        title: 'The Yellow Flash',
        level_requirement: 16,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        reward: 'Mission "The Yellow Flash" completion.',
        image: 'assets/images/ingamebgexample2.png',
        imageAlt: 'The Yellow Flash mission artwork',
        characterName: 'Minato Namikaze',
        portrait: 'assets/images/deadcharacter.png',
        portraitAlt: 'Minato Namikaze portrait',
        requirements: [],
        goals: [
            'Win the battle against Minato.',
            'Finish the mission to unlock its reward.',
        ],
        sortOrder: 2,
    },
    {
        missionId: 'negan',
        title: 'Negan',
        level_requirement: 16,
        mode_restriction: { allowed_modes: ['quick', 'ladder'] },
        reward_character: 'negan',
        reward_character_name: 'Negan',
        reward: 'Unlock Negan.',
        image: 'https://i.imgur.com/csZvbwl.png',
        imageAlt: 'Negan mission artwork',
        characterName: 'Rick Grimes',
        portrait: 'https://i.imgur.com/4p90X9r.png',
        portraitAlt: 'Rick Grimes portrait',
        requirements: [],
        goals: [
            {
                type: 'win_streak',
                character_id: 'rick-grimes',
                character_name: 'Rick Grimes',
                wins: 4,
            },
        ],
        sortOrder: 3,
    },
];

let mongoClient;
let usersCollection;
let matchesCollection;
let appStateCollection;
let newsPostsCollection;
let characterOverrideCache = new Map();
const matchSocketRooms = new Map();
const wsConnections = new Set();
const MATCH_CHAT_MAX_LENGTH = 240;
const MATCH_CHAT_MIN_INTERVAL_MS = 900;
const wsServer = new WebSocketServer({ noServer: true });
let turnSweepTimer = null;
const activeBattleBotTurns = new Set();
const scheduledBattleBotTurns = new Set();
const GAME_BOT_USERNAME_PREFIX = '__game_bot__:';
const GAME_BOT_DISPLAY_NAME = 'Game Bot';
const DEFAULT_SPECIAL_PVE_BATTLE = {
    enabled: false,
    buttonLabel: 'Start Fight',
    botName: 'Mission Bot',
    botTeamCharacterId: '',
    botTeamSize: 3,
    backgroundImage: '',
};
const XENOMORPH_DRONE_SPECIAL_PVE = {
    enabled: true,
    buttonLabel: 'Enter the Nest',
    botName: 'Xenomorph Nest',
    botTeamCharacterId: 'xenomorph-drone',
    botTeamSize: 3,
    backgroundImage: 'assets/images/xenonest.png',
    playerTeamCharacterIds: [
        'sergeant-william-hillford',
        'space-marine-infantry',
        'lieutenant-seraphina-vale',
    ],
};
const XENOMORPH_HIVE_MISSION_GOALS = [
    {
        type: 'text',
        text: 'Beat 3 Xenomorphs in the Xenomorph Hive using Sergeant William Hillford, Pvt. Saunders, and Lieutenant Seraphina Vale.',
    },
];

const DEFAULT_CLAN_RANK_NAMES = {
    clanLeader: 'Clan Leader',
    leader: 'Leader',
    captain: 'Captain',
    lieutenant: 'Lieutenant',
    member: 'Member',
    trial: 'Trial',
};

const LADDER_MAX_LEVEL = 50;
const LADDER_MAX_EXPERIENCE_POINTS = 156500;
const LADDER_RANK_TIERS = [
    { minLevel: 46, rank: 'Infinity Knight', hatUrl: 'assets/images/hats/kage.png' },
    { minLevel: 41, rank: 'Dimension Crusader', hatUrl: 'assets/images/hats/akatsuki.png' },
    { minLevel: 36, rank: 'Purity Aegis', hatUrl: 'assets/images/hats/jinch.png' },
    { minLevel: 31, rank: 'Galaxy Reaper', hatUrl: 'assets/images/hats/sannin.png' },
    { minLevel: 26, rank: 'Abyssal Grasp', hatUrl: 'assets/images/hats/jounin.png' },
    { minLevel: 21, rank: 'Void Sentinel', hatUrl: 'assets/images/hats/anbu.png' },
    { minLevel: 16, rank: 'Stormbreaker', hatUrl: 'assets/images/hats/missingnin.png' },
    { minLevel: 12, rank: 'Blood Ripper', hatUrl: 'assets/images/hats/chunin.png' },
    { minLevel: 6, rank: 'Temporal Warden', hatUrl: 'assets/images/hats/genin.png' },
    { minLevel: 1, rank: 'Sparkstrike', hatUrl: 'assets/images/hats/academy.png' },
];
const HOKAGE_RANK_INFO = {
    rank: 'Infinity Knight',
    hatUrl: 'assets/images/hats/kage.png',
};
const LADDER_EXP_BRACKETS = [
    { minLevel: 1, maxLevel: 3, expRequired: 500 },
    { minLevel: 4, maxLevel: 5, expRequired: 750 },
    { minLevel: 6, maxLevel: 11, expRequired: 1000 },
    { minLevel: 12, maxLevel: 15, expRequired: 2000 },
    { minLevel: 16, maxLevel: 20, expRequired: 2500 },
    { minLevel: 21, maxLevel: 25, expRequired: 3000 },
    { minLevel: 26, maxLevel: 30, expRequired: 3500 },
    { minLevel: 31, maxLevel: 35, expRequired: 4000 },
    { minLevel: 36, maxLevel: 40, expRequired: 4500 },
    { minLevel: 41, maxLevel: 45, expRequired: 5000 },
    { minLevel: 46, maxLevel: 49, expRequired: 5500 },
];

const getBaseRankInfoForLevel = (level) => {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    return (
        LADDER_RANK_TIERS.find((entry) => normalizedLevel >= entry.minLevel) ||
        LADDER_RANK_TIERS[LADDER_RANK_TIERS.length - 1]
    );
};

const getRankInfoForLevel = (level, isHokage = false) => {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    if (isHokage && normalizedLevel >= 46) {
        return HOKAGE_RANK_INFO;
    }
    return getBaseRankInfoForLevel(normalizedLevel);
};

const getExperienceRequiredForNextLevel = (level) => {
    const normalizedLevel = Math.max(1, Number(level) || 1);
    if (normalizedLevel >= LADDER_MAX_LEVEL) {
        return 0;
    }
    const bracket = LADDER_EXP_BRACKETS.find(
        (entry) => normalizedLevel >= entry.minLevel && normalizedLevel <= entry.maxLevel
    );
    return bracket ? bracket.expRequired : 0;
};

const getCumulativeExperienceForLevel = (level) => {
    const normalizedLevel = Math.min(LADDER_MAX_LEVEL, Math.max(1, Number(level) || 1));
    let total = 0;
    for (let currentLevel = 1; currentLevel < normalizedLevel; currentLevel += 1) {
        total += getExperienceRequiredForNextLevel(currentLevel);
    }
    return total;
};

const deriveLadderStateFromExperience = (experiencePoints) => {
    const normalizedExperience = Math.min(
        LADDER_MAX_EXPERIENCE_POINTS,
        Math.max(0, Number(experiencePoints) || 0)
    );
    let level = 1;
    let cumulativeForLevel = 0;

    while (level < LADDER_MAX_LEVEL) {
        const needed = getExperienceRequiredForNextLevel(level);
        if (!needed || normalizedExperience < cumulativeForLevel + needed) {
            break;
        }
        cumulativeForLevel += needed;
        level += 1;
    }

    const experienceForNextLevel = getExperienceRequiredForNextLevel(level);
    return {
        level,
        experiencePoints: normalizedExperience,
        cumulativeForLevel,
        experienceIntoLevel: Math.max(0, normalizedExperience - cumulativeForLevel),
        experienceForNextLevel,
        experienceToNextLevel: experienceForNextLevel
            ? Math.max(0, cumulativeForLevel + experienceForNextLevel - normalizedExperience)
            : 0,
    };
};

const resolveLadderExperienceDelta = ({ playerLevel, opponentLevel, didWin }) => {
    const normalizedPlayerLevel = Math.max(1, Number(playerLevel) || 1);
    const normalizedOpponentLevel = Math.max(1, Number(opponentLevel) || 1);
    const levelDifference = normalizedOpponentLevel - normalizedPlayerLevel;

    if (levelDifference >= 11) {
        return didWin ? 750 : 0;
    }
    if (levelDifference >= 6) {
        return didWin ? 600 : 0;
    }
    if (levelDifference >= 3) {
        return didWin ? 450 : -25;
    }
    if (levelDifference >= 1) {
        return didWin ? 350 : -50;
    }
    if (levelDifference <= -11) {
        return didWin ? 100 : -200;
    }
    if (levelDifference <= -6) {
        return didWin ? 100 : -200;
    }
    if (levelDifference <= -3) {
        return didWin ? 150 : -200;
    }
    if (levelDifference <= -1) {
        return didWin ? 200 : -150;
    }
    return didWin ? 250 : -75;
};

const getLevelProgressPercent = (experienceIntoLevel, experienceForNextLevel, level) => {
    const nextLevelCost = Math.max(0, Number(experienceForNextLevel) || 0);
    if (nextLevelCost > 0) {
        const progress = Math.max(0, Number(experienceIntoLevel) || 0);
        return Math.max(6, Math.min(100, Math.round((progress / nextLevelCost) * 100)));
    }
    const normalizedLevel = Math.max(1, Number(level) || 1);
    if (normalizedLevel >= LADDER_MAX_LEVEL) {
        return 100;
    }
    return Math.max(6, Math.min(100, Math.round((normalizedLevel / LADDER_MAX_LEVEL) * 100)));
};

const getRosterCharacterId = (rosterIndex) => {
    const index = Number.parseInt(rosterIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
        return '';
    }
    const character = Array.isArray(charactersData) ? charactersData[index] : null;
    return typeof character?.characterId === 'string' ? character.characterId.trim().toLowerCase() : '';
};

const getRosterCharacterName = (rosterIndex) => {
    const index = Number.parseInt(rosterIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
        return '';
    }
    const character = Array.isArray(charactersData) ? charactersData[index] : null;
    return typeof character?.name === 'string' ? character.name.trim() : '';
};

const getRosterIndexByCharacterId = (characterId) => {
    const normalizedCharacterId = normalizeCharacterId(characterId);
    if (!normalizedCharacterId || !Array.isArray(charactersData)) {
        return -1;
    }
    return charactersData.findIndex((character) => {
        const candidateId = normalizeCharacterId(
            character?.characterId || character?.id || character?.name || ''
        );
        return candidateId === normalizedCharacterId;
    });
};

const getRosterCharacterKey = (rosterIndex) => {
    const index = Number.parseInt(rosterIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
        return '';
    }
    const character = Array.isArray(charactersData) ? charactersData[index] : null;
    const characterId =
        typeof character?.characterId === 'string' ? character.characterId.trim().toLowerCase() : '';
    return characterId || (character ? `index:${index}` : '');
};

const teamHasDuplicateCharacters = (team = []) => {
    if (!Array.isArray(team)) {
        return false;
    }
    const seen = new Set();
    return team.some((rosterIndex) => {
        const key = getRosterCharacterKey(rosterIndex);
        if (!key) {
            return false;
        }
        if (seen.has(key)) {
            return true;
        }
        seen.add(key);
        return false;
    });
};

const isValidTeamSelectionForMatch = (team = []) =>
    Array.isArray(team) &&
    team.length === 3 &&
    team.every((slot) => {
        const rosterIndex = Number.parseInt(slot, 10);
        return Number.isInteger(rosterIndex) && rosterIndex >= 0 && Boolean(getRosterCharacterKey(rosterIndex));
    }) &&
    !teamHasDuplicateCharacters(team);

const normalizeCharacterId = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const getCharacterDisplayNameById = (characterId) => {
    const normalizedCharacterId = normalizeCharacterId(characterId);
    if (!normalizedCharacterId) {
        return '';
    }
    const characters = Array.isArray(charactersData) ? charactersData : [];
    const match = characters.find((character) => {
        const candidateId = normalizeCharacterId(
            character?.characterId || character?.id || character?.name || ''
        );
        return candidateId === normalizedCharacterId;
    });
    return typeof match?.name === 'string' && match.name.trim()
        ? match.name.trim()
        : String(characterId || '').trim();
};

const normalizeMissionModeRestriction = (source = {}) => {
    const allowedModes = Array.from(
        new Set(
            normalizeMissionTextList(
                Array.isArray(source.allowed_modes)
                    ? source.allowed_modes
                    : Array.isArray(source.allowedModes)
                        ? source.allowedModes
                        : typeof source.allowed_modes === 'string'
                            ? source.allowed_modes.split(',')
                            : typeof source.allowedModes === 'string'
                                ? source.allowedModes.split(',')
                                : []
            )
                .map((entry) => String(entry || '').trim().toLowerCase())
                .filter((entry) => entry === 'quick' || entry === 'ladder')
        )
    );
    return {
        allowed_modes: allowedModes.length ? allowedModes : ['quick', 'ladder'],
    };
};

const getLegacyLevelRequirement = (value) => {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
        return Math.max(1, Math.floor(numericValue));
    }

    const label = String(value || '').trim().toLowerCase();
    if (!label) {
        return 0;
    }

    const legacyLevelMap = new Map([
        ['academy student', 1],
        ['sparkstrike', 1],
        ['genin', 6],
        ['temporal warden', 6],
        ['chunin', 12],
        ['blood ripper', 12],
        ['jounin', 16],
        ['jonin', 16],
        ['joinin', 16],
        ['stormbreaker', 16],
        ['anbu', 21],
        ['void sentinel', 21],
        ['sannin', 31],
        ['galaxy reaper', 31],
        ['jinchuriki', 36],
        ['purity aegis', 36],
        ['akatsuki', 41],
        ['dimension crusader', 41],
        ['kage', 46],
        ['infinity knight', 46],
    ]);
    return legacyLevelMap.get(label) || 0;
};

const normalizeMissionProgressEntry = (entry = {}) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    const winStreak = Math.max(
        0,
        Number(
            source.winStreak ??
                source.rickGrimesWinStreak ??
                source.streak ??
                source.consecutiveWins ??
                0
        ) || 0
    );
    const completedAt =
        source.completedAt instanceof Date || typeof source.completedAt === 'string'
            ? source.completedAt
            : source.unlockedAt instanceof Date || typeof source.unlockedAt === 'string'
                ? source.unlockedAt
                : null;
    const updatedAt =
        source.updatedAt instanceof Date || typeof source.updatedAt === 'string'
            ? source.updatedAt
            : null;
    const rawGoalProgress =
        source.goalProgressByIndex && typeof source.goalProgressByIndex === 'object'
            ? source.goalProgressByIndex
            : source.goalProgress && typeof source.goalProgress === 'object'
                ? source.goalProgress
                : {};
    const goalProgressByIndex = {};
    Object.keys(rawGoalProgress).forEach((goalIndex) => {
        const normalizedGoalIndex = String(Number.parseInt(goalIndex, 10));
        if (!normalizedGoalIndex || normalizedGoalIndex === 'NaN') {
            return;
        }
        goalProgressByIndex[normalizedGoalIndex] = normalizeMissionGoalProgressEntry(
            rawGoalProgress[goalIndex]
        );
    });
    return {
        winStreak,
        rickGrimesWinStreak: winStreak,
        completedAt,
        unlockedAt: completedAt,
        updatedAt,
        goalProgressByIndex,
        goalProgress: goalProgressByIndex,
    };
};

const normalizeMissionGoalProgressEntry = (entry = {}) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    const count = Math.max(0, Number(source.count ?? source.progress ?? 0) || 0);
    const completedAt =
        source.completedAt instanceof Date || typeof source.completedAt === 'string'
            ? source.completedAt
            : null;
    const updatedAt =
        source.updatedAt instanceof Date || typeof source.updatedAt === 'string'
            ? source.updatedAt
            : null;
    return {
        count,
        progress: count,
        completedAt,
        updatedAt,
    };
};

const createDefaultMissionState = () => {
    const neganProgress = normalizeMissionProgressEntry({
        winStreak: 0,
        completedAt: null,
    });
    return {
        progressByMissionId: {
            negan: neganProgress,
        },
        progress: {
            negan: neganProgress,
        },
        unlockedCharacterIds: [],
    };
};

const normalizeMissionState = (missions = {}) => {
    const source = missions && typeof missions === 'object' ? missions : {};
    const sourceProgress =
        source.progressByMissionId && typeof source.progressByMissionId === 'object'
            ? source.progressByMissionId
            : source.progress && typeof source.progress === 'object'
                ? source.progress
                : {};
    const progressByMissionId = {};
    Object.keys(sourceProgress).forEach((missionId) => {
        const normalizedMissionId = slugifyMissionId(missionId);
        if (!normalizedMissionId) {
            return;
        }
        progressByMissionId[normalizedMissionId] = normalizeMissionProgressEntry(
            sourceProgress[missionId]
        );
    });
    if (!progressByMissionId.negan) {
        progressByMissionId.negan = normalizeMissionProgressEntry(sourceProgress.negan || {});
    }
    const unlockedCharacterIds = new Set(
        (Array.isArray(source.unlockedCharacterIds) ? source.unlockedCharacterIds : [])
            .map((entry) => normalizeCharacterId(entry))
            .filter(Boolean)
    );
    Object.keys(progressByMissionId).forEach((missionId) => {
        const progressEntry = progressByMissionId[missionId];
        if (
            missionId === 'negan' &&
            Math.max(0, Number(progressEntry?.winStreak) || 0) >= 4
        ) {
            unlockedCharacterIds.add('negan');
        }
    });
    return {
        progressByMissionId,
        progress: progressByMissionId,
        unlockedCharacterIds: Array.from(unlockedCharacterIds),
    };
};

const normalizeMissionTextList = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => {
            if (typeof entry === 'string') {
                return entry.trim();
            }
            if (entry && typeof entry === 'object') {
                return typeof entry.text === 'string' && entry.text.trim()
                    ? entry.text.trim()
                    : typeof entry.value === 'string' && entry.value.trim()
                        ? entry.value.trim()
                        : typeof entry.label === 'string' && entry.label.trim()
                            ? entry.label.trim()
                            : '';
            }
            return '';
        })
        .filter(Boolean);

const normalizeMissionGoalEntry = (entry = {}, index = 0) => {
    if (typeof entry === 'string') {
        const text = entry.trim();
        if (!text) {
            return null;
        }

        const reachRankMatch = text.match(/^Reach\s+rank\s+(\d+)(?:\.\s*\(0\/\d+\))?$/i);
        if (reachRankMatch) {
            const rank = Math.max(0, Number(reachRankMatch[1]) || 0);
            return rank
                ? {
                      type: 'reach_rank',
                      rank,
                  }
                : null;
        }

        const winMatchesMatch = text.match(/^Win\s+(\d+)\s+matches?\s+with\s+(.+?)(?:\.\s*\(0\/\d+\))?$/i);
        if (winMatchesMatch) {
            const wins = Math.max(0, Number(winMatchesMatch[1]) || 0);
            const characterName = winMatchesMatch[2].trim();
            const characterId = normalizeCharacterId(characterName);
            return {
                type: 'win_matches',
                character_id: characterId,
                character_name: characterName,
                wins,
            };
        }

        const winStreakMatch = text.match(
            /^Win\s+(\d+)\s+battles?\s+in\s+a\s+row\s+with\s+(.+?)(?:\.\s*\(0\/\d+\))?$/i
        );
        if (winStreakMatch) {
            const wins = Math.max(0, Number(winStreakMatch[1]) || 0);
            const characterName = winStreakMatch[2].trim();
            const characterId = normalizeCharacterId(characterName);
            return {
                type: 'win_streak',
                character_id: characterId,
                character_name: characterName,
                wins,
            };
        }

        const winSameTeamMatch = text.match(
            /^Win\s+(\d+)\s+games?\s+with\s+(.+?)\s+and\s+(.+?)\s+on\s+the\s+same\s+team(?:\.\s*\(0\/\d+\))?$/i
        );
        if (winSameTeamMatch) {
            const wins = Math.max(0, Number(winSameTeamMatch[1]) || 0);
            const firstCharacterName = winSameTeamMatch[2].trim();
            const secondCharacterName = winSameTeamMatch[3].trim();
            const firstCharacterId = normalizeCharacterId(firstCharacterName);
            const secondCharacterId = normalizeCharacterId(secondCharacterName);
            if (!wins || !firstCharacterId || !secondCharacterId) {
                return null;
            }
            return {
                type: 'win_matches_same_team',
                character_ids: [firstCharacterId, secondCharacterId],
                character_names: [firstCharacterName, secondCharacterName],
                wins,
            };
        }

        return {
            type: 'text',
            text,
        };
    }

    const source = entry && typeof entry === 'object' ? entry : {};
    const type = String(source.type || source.goalType || source.kind || 'text')
        .trim()
        .toLowerCase();
    const normalizedType =
        type === 'win_matches' || type === 'win_match' || type === 'match_wins'
            ? 'win_matches'
            : type === 'win_streak' || type === 'streak'
                ? 'win_streak'
                : type === 'reach_rank' || type === 'rank' || type === 'reach_level'
                    ? 'reach_rank'
                    : type === 'win_matches_same_team' ||
                        type === 'same_team_wins' ||
                        type === 'same_team'
                        ? 'win_matches_same_team'
                : 'text';

    if (normalizedType === 'win_matches' || normalizedType === 'win_streak') {
        const wins = Math.max(
            0,
            Number(source.wins ?? source.count ?? source.target ?? source.goal ?? 0) || 0
        );
        const characterId = normalizeCharacterId(
            source.character_id ?? source.characterId ?? source.character ?? source.target_character
        );
        const characterName = String(
            source.character_name ?? source.characterName ?? getCharacterDisplayNameById(characterId)
        ).trim();
        if (!wins || !characterId) {
            return null;
        }
        return {
            type: normalizedType,
            character_id: characterId,
            character_name: characterName || getCharacterDisplayNameById(characterId),
            wins,
        };
    }

    if (normalizedType === 'reach_rank') {
        const rank = Math.max(
            0,
            Number(source.rank ?? source.level ?? source.target ?? source.goal ?? source.value ?? 0) || 0
        );
        if (!rank) {
            return null;
        }
        return {
            type: 'reach_rank',
            rank,
        };
    }

    if (normalizedType === 'win_matches_same_team') {
        const wins = Math.max(
            0,
            Number(source.wins ?? source.count ?? source.target ?? source.goal ?? 0) || 0
        );
        const characterIds = normalizeMissionTextList(
            Array.isArray(source.character_ids)
                ? source.character_ids
                : [
                      source.character_id ?? source.characterId ?? source.character ?? '',
                      source.teammate_character_id ??
                          source.teammateCharacterId ??
                          source.character_two_id ??
                          source.characterTwoId ??
                          '',
                  ]
        ).map((value) => normalizeCharacterId(value));
        const uniqueCharacterIds = Array.from(new Set(characterIds.filter(Boolean))).slice(0, 2);
        if (!wins || uniqueCharacterIds.length < 2) {
            return null;
        }
        const rawCharacterNames = Array.isArray(source.character_names)
            ? source.character_names
            : [
                  source.character_name ?? source.characterName ?? '',
                  source.teammate_character_name ??
                      source.teammateCharacterName ??
                      source.character_two_name ??
                      source.characterTwoName ??
                      '',
              ];
        const characterNames = uniqueCharacterIds.map((characterId, idx) => {
            const providedName = String(rawCharacterNames[idx] ?? '').trim();
            return providedName || getCharacterDisplayNameById(characterId);
        });
        return {
            type: 'win_matches_same_team',
            character_ids: uniqueCharacterIds,
            character_names: characterNames,
            wins,
        };
    }

    const text = normalizeMissionTextList([
        source.text ?? source.value ?? source.label ?? source.description ?? '',
    ])[0];
    if (!text) {
        return null;
    }
    return {
        type: 'text',
        text,
    };
};

const normalizeMissionGoalList = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry, index) => normalizeMissionGoalEntry(entry, index))
        .filter(Boolean);

const normalizeMissionSpecialPve = (source = {}, rewardCharacterId = '') => {
    const raw =
        source.special_pve ||
        source.specialPve ||
        source.pve_battle ||
        source.pveBattle ||
        {};
    const normalizedRewardCharacterId = normalizeCharacterId(rewardCharacterId);
    const defaults =
        normalizedRewardCharacterId === 'xenomorph-drone'
            ? XENOMORPH_DRONE_SPECIAL_PVE
            : DEFAULT_SPECIAL_PVE_BATTLE;
    const enabled =
        normalizedRewardCharacterId === 'xenomorph-drone'
            ? true
            : raw.enabled === undefined && raw.required === undefined && raw.type === undefined
            ? Boolean(defaults.enabled)
            : Boolean(raw.enabled ?? raw.required ?? raw.type);
    const botTeamCharacterId = normalizeCharacterId(
        raw.botTeamCharacterId ??
            raw.bot_team_character_id ??
            raw.characterId ??
            raw.character_id ??
            defaults.botTeamCharacterId
    );
    const botTeamSize = Math.max(
        1,
        Math.min(
            6,
            Number(
                raw.botTeamSize ??
                    raw.bot_team_size ??
                    raw.teamSize ??
                    raw.team_size ??
                    defaults.botTeamSize
            ) || 3
        )
    );
    const rawPlayerTeamCharacterIds =
        Array.isArray(raw.playerTeamCharacterIds)
            ? raw.playerTeamCharacterIds
            : Array.isArray(raw.player_team_character_ids)
                ? raw.player_team_character_ids
                : Array.isArray(raw.requiredPlayerTeamCharacterIds)
                    ? raw.requiredPlayerTeamCharacterIds
                    : Array.isArray(defaults.playerTeamCharacterIds)
                        ? defaults.playerTeamCharacterIds
                        : [];
    const playerTeamCharacterIds = rawPlayerTeamCharacterIds
        .map((entry) => normalizeCharacterId(entry))
        .filter(Boolean)
        .slice(0, 3);
    return {
        enabled,
        buttonLabel:
            typeof raw.buttonLabel === 'string' && raw.buttonLabel.trim()
                ? raw.buttonLabel.trim()
                : typeof raw.button_label === 'string' && raw.button_label.trim()
                    ? raw.button_label.trim()
                    : defaults.buttonLabel,
        botName:
            typeof raw.botName === 'string' && raw.botName.trim()
                ? raw.botName.trim()
                : typeof raw.bot_name === 'string' && raw.bot_name.trim()
                    ? raw.bot_name.trim()
                    : defaults.botName,
        botTeamCharacterId,
        botTeamSize,
        backgroundImage:
            normalizedRewardCharacterId === 'xenomorph-drone'
                ? XENOMORPH_DRONE_SPECIAL_PVE.backgroundImage
                : typeof raw.backgroundImage === 'string' && raw.backgroundImage.trim()
                ? raw.backgroundImage.trim()
                : typeof raw.background_image === 'string' && raw.background_image.trim()
                    ? raw.background_image.trim()
                    : defaults.backgroundImage,
        playerTeamCharacterIds,
    };
};

const slugifyMissionId = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const normalizeMissionCatalogEntry = (mission = {}, index = 0) => {
    const source = mission && typeof mission === 'object' ? mission : {};
    const missionTitle =
        typeof source.title === 'string' && source.title.trim()
            ? source.title.trim()
            : typeof source.name === 'string' && source.name.trim()
                ? source.name.trim()
                : `Mission ${index + 1}`;
    const missionId = slugifyMissionId(
        typeof source.missionId === 'string' && source.missionId.trim()
            ? source.missionId.trim()
            : missionTitle
    ) || `mission-${index + 1}`;
    const levelRequirement = Math.max(
        0,
        Number(
            source.level_requirement ??
                source.levelRequirement ??
                source.rank_requirement?.level ??
                source.rankRequirement?.level ??
                getLegacyLevelRequirement(source.rank)
        ) || 0
    );
    const rewardCharacterId = normalizeCharacterId(
        source.reward_character ??
            source.rewardCharacter ??
            source.rewardCharacterId ??
            source.reward_character_id
    );
    const specialPve = normalizeMissionSpecialPve(source, rewardCharacterId);
    const isXenomorphMission = rewardCharacterId === 'xenomorph-drone';
    const finalMissionId = isXenomorphMission ? 'raid-on-the-xenomorph-hive' : missionId;
    const finalMissionTitle = isXenomorphMission ? 'Raid on the Xenomorph Hive' : missionTitle;
    const winStreakCharacterId = normalizeCharacterId(
        source.win_streak?.character_id ??
            source.winStreak?.characterId ??
            source.win_streak_character_id ??
            source.winStreakCharacterId
    );
    const winStreakWins = Math.max(
        0,
        Number(
            source.win_streak?.wins ??
                source.winStreak?.wins ??
                source.win_streak_wins ??
                source.winStreakWins ??
                (winStreakCharacterId ? 1 : 0)
        ) || 0
    );
    const modeRestriction = normalizeMissionModeRestriction(
        source.mode_restriction || source.modeRestriction || {}
    );
    const requirementNotes = normalizeMissionTextList(
        source.requirements || source.requirementNotes || source.notes
    );
    const goals = normalizeMissionGoalList(source.goals || source.objectives);
    const finalGoals = isXenomorphMission
        ? XENOMORPH_HIVE_MISSION_GOALS.map((goal) => ({ ...goal }))
        : goals;
    const legacyGoalCharacterId = normalizeCharacterId(
        source.character_used ??
            source.characterUsed ??
            source.characterUsedId ??
            source.character_used_id
    );
    if (
        legacyGoalCharacterId &&
        !finalGoals.some(
            (goal) =>
                goal &&
                goal.type === 'win_streak' &&
                normalizeCharacterId(goal.character_id) === legacyGoalCharacterId
        )
    ) {
        finalGoals.push({
            type: 'win_streak',
            character_id: legacyGoalCharacterId,
            character_name: getCharacterDisplayNameById(legacyGoalCharacterId),
            wins: Math.max(1, winStreakWins),
        });
    }
    return {
        missionId: finalMissionId,
        title: finalMissionTitle,
        level_requirement:
            isXenomorphMission
                ? Math.max(21, levelRequirement)
                : levelRequirement,
        rank:
            isXenomorphMission
                ? String(Math.max(21, levelRequirement))
                : levelRequirement
                    ? String(levelRequirement)
                    : '',
        reward_character: rewardCharacterId,
        reward_character_name: getCharacterDisplayNameById(rewardCharacterId),
        reward: typeof source.reward === 'string' ? source.reward.trim() : '',
        mode_restriction: modeRestriction,
        win_streak: {
            character_id: winStreakCharacterId,
            character_name: getCharacterDisplayNameById(winStreakCharacterId),
            wins: winStreakWins,
        },
        image:
            isXenomorphMission
                ? 'assets/images/xenomission.jpg'
                : typeof source.image === 'string'
                    ? source.image.trim()
                    : '',
        imageAlt:
            typeof source.imageAlt === 'string' && source.imageAlt.trim()
                ? source.imageAlt.trim()
                : `${finalMissionTitle} mission artwork`,
        characterName: typeof source.characterName === 'string' ? source.characterName.trim() : '',
        portrait: typeof source.portrait === 'string' ? source.portrait.trim() : '',
        portraitAlt:
            typeof source.portraitAlt === 'string' && source.portraitAlt.trim()
                ? source.portraitAlt.trim()
                : `${finalMissionTitle} portrait`,
        requirements: requirementNotes,
        goals: finalGoals,
        special_pve: specialPve,
        sortOrder: Number.isFinite(Number(source.sortOrder)) ? Number(source.sortOrder) : index + 1,
    };
};

const normalizeMissionCatalog = (missions = []) => {
    const seen = new Set();
    return (Array.isArray(missions) ? missions : [])
        .map((mission, index) => normalizeMissionCatalogEntry(mission, index))
        .filter((mission) => mission.missionId && mission.title)
        .map((mission) => {
            let nextMissionId = mission.missionId;
            let duplicateIndex = 2;
            while (seen.has(nextMissionId)) {
                nextMissionId = `${mission.missionId}-${duplicateIndex}`;
                duplicateIndex += 1;
            }
            seen.add(nextMissionId);
            return {
                ...mission,
                missionId: nextMissionId,
            };
        })
        .sort((a, b) => {
            const sortDelta = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
            if (sortDelta !== 0) {
                return sortDelta;
            }
            return String(a.title).localeCompare(String(b.title));
        });
};

const cloneMissionCatalog = (missions = []) =>
    normalizeMissionCatalog(
        (Array.isArray(missions) ? missions : []).map((mission) => ({
            ...mission,
            mode_restriction: mission?.mode_restriction
                ? {
                      allowed_modes: Array.isArray(mission.mode_restriction.allowed_modes)
                          ? mission.mode_restriction.allowed_modes.slice()
                          : [],
                  }
                : undefined,
            win_streak: mission?.win_streak
                ? {
                      character_id:
                          typeof mission.win_streak.character_id === 'string'
                              ? mission.win_streak.character_id
                              : '',
                      wins: Number(mission.win_streak.wins) || 0,
                  }
                : undefined,
            requirements: Array.isArray(mission?.requirements) ? mission.requirements.slice() : [],
            goals: Array.isArray(mission?.goals) ? mission.goals.slice() : [],
            special_pve: mission?.special_pve
                ? {
                      ...mission.special_pve,
                  }
                : mission?.specialPve
                    ? {
                          ...mission.specialPve,
                      }
                    : undefined,
        }))
    );

const XENOMORPH_DRONE_MISSION_ENTRY = {
    missionId: 'raid-on-the-xenomorph-hive',
    title: 'Raid on the Xenomorph Hive',
    level_requirement: 21,
    mode_restriction: { allowed_modes: ['quick', 'ladder'] },
    reward_character: 'xenomorph-drone',
    reward_character_name: 'Xenomorph Drone',
    reward: 'Unlock Xenomorph Drone.',
    image: 'assets/images/xenomission.jpg',
    imageAlt: 'Raid on the Xenomorph Hive mission artwork',
    characterName: 'Xenomorph Drone',
    portrait: 'assets/images/xenomission.jpg',
    portraitAlt: 'Xenomorph Drone portrait',
    requirements: [],
    goals: XENOMORPH_HIVE_MISSION_GOALS,
    special_pve: XENOMORPH_DRONE_SPECIAL_PVE,
    sortOrder: 999,
};

const ensureRequiredMissionCatalogEntries = (missions = []) => {
    const catalog = cloneMissionCatalog(missions);
    const hasXenomorphMission = catalog.some(
        (mission) => normalizeCharacterId(mission?.reward_character) === 'xenomorph-drone'
    );
    if (!hasXenomorphMission) {
        catalog.push(normalizeMissionCatalogEntry(XENOMORPH_DRONE_MISSION_ENTRY, catalog.length));
    }
    return normalizeMissionCatalog(catalog);
};

const getDefaultMissionCatalog = () =>
    ensureRequiredMissionCatalogEntries(DEFAULT_MISSION_CATALOG);

const getStoredMissionCatalog = async () => {
    const defaultCatalog = getDefaultMissionCatalog();
    if (!appStateCollection) {
        missionCatalogCache = defaultCatalog;
        return defaultCatalog;
    }

    const storedState = await appStateCollection.findOne({ key: MISSION_CATALOG_STATE_KEY });
    const storedCatalog = normalizeMissionCatalog(
        storedState && Array.isArray(storedState.missions) ? storedState.missions : []
    );
    const nextCatalog = ensureRequiredMissionCatalogEntries(
        storedCatalog.length ? storedCatalog : defaultCatalog
    );
    missionCatalogCache = nextCatalog;
    return nextCatalog;
};

const saveMissionCatalog = async (missions, updatedBy) => {
    const normalizedCatalog = normalizeMissionCatalog(missions);
    if (!normalizedCatalog.length) {
        throw new Error('At least one mission is required.');
    }

    await appStateCollection.updateOne(
        { key: MISSION_CATALOG_STATE_KEY },
        {
            $set: {
                key: MISSION_CATALOG_STATE_KEY,
                missions: normalizedCatalog,
                updatedAt: new Date(),
                updatedBy: updatedBy || '',
            },
        },
        { upsert: true }
    );

    missionCatalogCache = normalizedCatalog;
    return normalizedCatalog;
};

const getMissionLockedCharacterIds = async () => {
    const catalog = missionCatalogCache && Array.isArray(missionCatalogCache)
        ? missionCatalogCache
        : await getStoredMissionCatalog();
    return new Set(
        (Array.isArray(catalog) ? catalog : [])
            .map((mission) => normalizeCharacterId(mission.reward_character))
            .filter(Boolean)
    );
};

const profileHasUnlockedCharacter = (profile, characterId, lockedCharacterIds = new Set()) => {
    const normalizedCharacterId =
        typeof characterId === 'string' ? normalizeCharacterId(characterId) : '';
    if (!normalizedCharacterId) {
        return true;
    }
    const missions = profile && typeof profile.missions === 'object' ? profile.missions : {};
    const unlocked = new Set(
        (Array.isArray(missions.unlockedCharacterIds) ? missions.unlockedCharacterIds : [])
            .map((entry) => normalizeCharacterId(entry))
            .filter(Boolean)
    );
    if (!lockedCharacterIds.has(normalizedCharacterId)) {
        return true;
    }
    return unlocked.has(normalizedCharacterId);
};

const assertTeamCanBeUsed = async (profile, team = [], userRole = 'player') => {
    if (teamHasDuplicateCharacters(team)) {
        throw new Error('Team characters must be unique.');
    }
    if (!isValidTeamSelectionForMatch(team)) {
        throw new Error('Invalid team selection.');
    }
    if (String(userRole || '').trim().toLowerCase() === 'admin') {
        return;
    }
    const lockedCharacterIds = await getMissionLockedCharacterIds();
    const normalizedProfile = normalizeUserProfile({
        profile,
    });
    const invalidCharacter = Array.isArray(team)
        ? team.find((slot) => {
              const rosterCharacterId = getRosterCharacterId(slot);
              if (!rosterCharacterId) {
                  return true;
              }
              return !profileHasUnlockedCharacter(
                  normalizedProfile,
                  rosterCharacterId,
                  lockedCharacterIds
              );
          })
        : null;
    if (invalidCharacter === undefined || invalidCharacter === null) {
        return;
    }
    const rosterCharacterId = getRosterCharacterId(invalidCharacter);
    const rosterCharacterName = getRosterCharacterName(invalidCharacter) || rosterCharacterId || 'Character';
    if (!rosterCharacterId) {
        throw new Error('Invalid team selection.');
    }
    throw new Error(`${rosterCharacterName} is locked.`);
};

const buildDefaultUserProfile = (user = {}) => {
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt || Date.now());
    return {
        avatarUrl: DEFAULT_PROFILE_AVATAR,
        backgrounds: {
            selectionUrl: '',
            ingameUrl: '',
        },
        posts: 0,
        clan: null,
        clanInvitations: [],
        recentQuickGames: [],
        recentPrivateGames: [],
        recentLadderGames: [],
        missions: createDefaultMissionState(),
        matchmaking: {
            battleBotEnabled: true,
        },
        ladder: {
            level: 1,
            rank: 'Academy Student',
            rankHatUrl: 'assets/images/hats/academy.png',
            experiencePoints: 0,
            ladderRank: null,
            wins: 0,
            losses: 0,
            streak: 0,
            highestStreak: 0,
            highestLevel: 1,
            famePoints: 0,
            isHokage: false,
        },
        activity: {
            lastOnlineAt: createdAt,
            currentPage: '',
        },
    };
};

const QUICK_GAME_RETENTION_MS = 24 * 60 * 60 * 1000;

const normalizeClanInvitations = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            clanName: typeof entry?.clanName === 'string' ? entry.clanName.trim() : '',
            clanAbbreviation: typeof entry?.clanAbbreviation === 'string' ? entry.clanAbbreviation.trim() : '',
            invitedBy: typeof entry?.invitedBy === 'string' ? entry.invitedBy.trim() : '',
            invitedUsername: typeof entry?.invitedUsername === 'string' ? entry.invitedUsername.trim() : '',
            invitedAt: entry?.invitedAt || null,
        }))
        .filter((entry) => entry.clanName && entry.invitedBy && entry.invitedUsername);

const normalizeCustomRankList = (value, fallbackLabel) => {
    if (Array.isArray(value)) {
        return value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean)
            .slice(0, 25);
    }
    if (typeof value === 'string' && value.trim() && value.trim() !== fallbackLabel) {
        return [value.trim()];
    }
    return [];
};

const normalizeClanRankNames = (value = {}) => ({
    clanLeader: normalizeCustomRankList(value?.clanLeader, DEFAULT_CLAN_RANK_NAMES.clanLeader),
    leader: normalizeCustomRankList(value?.leader, DEFAULT_CLAN_RANK_NAMES.leader),
    captain: normalizeCustomRankList(value?.captain, DEFAULT_CLAN_RANK_NAMES.captain),
    lieutenant: normalizeCustomRankList(value?.lieutenant, DEFAULT_CLAN_RANK_NAMES.lieutenant),
    member: normalizeCustomRankList(value?.member, DEFAULT_CLAN_RANK_NAMES.member),
    trial: normalizeCustomRankList(value?.trial, DEFAULT_CLAN_RANK_NAMES.trial),
});

const CLAN_RANK_KEYS = ['clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial'];

const normalizeClanRankKey = (value, fallbackUser = {}, clan = null) => {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (CLAN_RANK_KEYS.includes(raw)) {
        return raw;
    }

    const rankLabel = typeof clan?.rank === 'string' ? clan.rank.trim().toLowerCase() : '';
    if (rankLabel === 'clan leader') {
        return 'clanLeader';
    }
    if (rankLabel === 'leader') {
        if (
            typeof clan?.createdBy === 'string' &&
            typeof fallbackUser?.username === 'string' &&
            clan.createdBy.trim().toLowerCase() === fallbackUser.username.trim().toLowerCase()
        ) {
            return 'clanLeader';
        }
        return 'leader';
    }
    if (rankLabel === 'captain') {
        return 'captain';
    }
    if (rankLabel === 'lieutenant') {
        return 'lieutenant';
    }
    if (rankLabel === 'member') {
        return 'member';
    }
    if (rankLabel === 'trial') {
        return 'trial';
    }

    if (
        typeof clan?.createdBy === 'string' &&
        typeof fallbackUser?.username === 'string' &&
        clan.createdBy.trim().toLowerCase() === fallbackUser.username.trim().toLowerCase()
    ) {
        return 'clanLeader';
    }

    return 'member';
};

const resolveClanRankLabel = (rankKey, customRankName = '') => {
    const baseLabel = resolveBaseClanRankLabel(rankKey);
    const label = typeof customRankName === 'string' ? customRankName.trim() : '';
    if (!label) {
        return baseLabel;
    }
    return `${label} (Based On ${baseLabel})`;
};

const resolveBaseClanRankLabel = (rankKey) =>
    DEFAULT_CLAN_RANK_NAMES[normalizeClanRankKey(rankKey)] || DEFAULT_CLAN_RANK_NAMES.member;

const clanRankHasPermission = (rankKey, permission) => {
    const normalizedRankKey = normalizeClanRankKey(rankKey);
    const permissionMap = {
        clanLeader: {
            invite: true,
            assignRanks: true,
            manageInfo: true,
            manageAvatar: true,
        },
        leader: {
            invite: true,
            assignRanks: true,
            manageInfo: false,
            manageAvatar: true,
        },
        captain: {
            invite: true,
            assignRanks: true,
            manageInfo: false,
            manageAvatar: false,
        },
        lieutenant: {
            invite: true,
            assignRanks: false,
            manageInfo: false,
            manageAvatar: false,
        },
        member: {
            invite: false,
            assignRanks: false,
            manageInfo: false,
            manageAvatar: false,
        },
        trial: {
            invite: false,
            assignRanks: false,
            manageInfo: false,
            manageAvatar: false,
        },
    };
    return Boolean(permissionMap[normalizedRankKey]?.[permission]);
};

const normalizeRecentQuickGames = (entries = []) => {
    const cutoff = Date.now() - QUICK_GAME_RETENTION_MS;
    return (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            playedAt: entry?.playedAt || null,
            opponentUsername:
                typeof entry?.opponentUsername === 'string' ? entry.opponentUsername.trim() : '',
            winnerUsername:
                typeof entry?.winnerUsername === 'string' ? entry.winnerUsername.trim() : '',
        }))
        .filter((entry) => entry.playedAt && entry.opponentUsername)
        .map((entry) => {
            const playedDate = new Date(entry.playedAt);
            return Number.isNaN(playedDate.getTime())
                ? null
                : {
                      ...entry,
                      playedAt: playedDate,
                  };
        })
        .filter(Boolean)
        .filter((entry) => entry.playedAt.getTime() >= cutoff)
        .sort((left, right) => right.playedAt.getTime() - left.playedAt.getTime())
        .slice(0, 25);
};

const normalizeRecentLadderGames = (entries = []) => {
    const cutoff = Date.now() - QUICK_GAME_RETENTION_MS;
    return (Array.isArray(entries) ? entries : [])
        .map((entry) => ({
            playedAt: entry?.playedAt || null,
            opponentUsername:
                typeof entry?.opponentUsername === 'string' ? entry.opponentUsername.trim() : '',
            winnerUsername:
                typeof entry?.winnerUsername === 'string' ? entry.winnerUsername.trim() : '',
            expDelta: Number(entry?.expDelta) || 0,
            clanExpDelta: Math.max(0, Number(entry?.clanExpDelta) || 0),
        }))
        .filter((entry) => entry.playedAt && entry.opponentUsername)
        .map((entry) => {
            const playedDate = new Date(entry.playedAt);
            return Number.isNaN(playedDate.getTime())
                ? null
                : {
                      ...entry,
                      playedAt: playedDate,
                  };
        })
        .filter(Boolean)
        .filter((entry) => entry.playedAt.getTime() >= cutoff)
        .sort((left, right) => right.playedAt.getTime() - left.playedAt.getTime())
        .slice(0, 25);
};

const inferCurrentLadderLossStreak = ({ username = '', recentLadderGames = [] } = {}) => {
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!normalizedUsername || !Array.isArray(recentLadderGames)) return 0;
    let losses = 0;
    for (const game of recentLadderGames) {
        const winnerUsername =
            typeof game?.winnerUsername === 'string' ? game.winnerUsername.trim().toLowerCase() : '';
        if (!winnerUsername) break;
        if (winnerUsername === normalizedUsername) break;
        losses += 1;
    }
    return losses > 0 ? -losses : 0;
};

const normalizeUserProfile = (user = {}) => {
    const defaults = buildDefaultUserProfile(user);
    const source = user.profile && typeof user.profile === 'object' ? user.profile : {};
    const ladder = source.ladder && typeof source.ladder === 'object' ? source.ladder : {};
    const activity = source.activity && typeof source.activity === 'object' ? source.activity : {};
    const matchmaking =
        source.matchmaking && typeof source.matchmaking === 'object' ? source.matchmaking : {};
    const clan =
        source.clan && typeof source.clan === 'object'
            ? (() => {
                  const customRankNames = normalizeClanRankNames(source.clan.customRankNames);
                  const rankKey = normalizeClanRankKey(source.clan.rankKey, user, source.clan);
                  return {
                      name: typeof source.clan.name === 'string' ? source.clan.name : '',
                      abbreviation:
                          typeof source.clan.abbreviation === 'string' ? source.clan.abbreviation : '',
                      rankKey,
                      customRankName:
                          typeof source.clan.customRankName === 'string' ? source.clan.customRankName.trim() : '',
                      rank:
                          typeof source.clan.customRankName === 'string' && source.clan.customRankName.trim()
                              ? resolveClanRankLabel(rankKey, source.clan.customRankName)
                          : resolveBaseClanRankLabel(rankKey),
                      avatarUrl:
                          typeof source.clan.avatarUrl === 'string' ? source.clan.avatarUrl.trim() : '',
                      joinedAt: source.clan.joinedAt || null,
                      bio: typeof source.clan.bio === 'string' ? source.clan.bio : '',
                      experiencePoints: Math.max(0, Number(source.clan.experiencePoints) || 0),
                      createdBy: typeof source.clan.createdBy === 'string' ? source.clan.createdBy : '',
                      createdAt: source.clan.createdAt || null,
                      customRankNames,
                  };
              })()
            : null;

    const storedExperiencePoints = Number.isFinite(Number(ladder.experiencePoints))
        ? Math.max(0, Number(ladder.experiencePoints))
        : defaults.ladder.experiencePoints;
    const storedLevel = Number.isFinite(Number(ladder.level))
        ? Math.max(1, Number(ladder.level))
        : defaults.ladder.level;
    const inferredExperiencePoints = Math.max(
        storedExperiencePoints,
        getCumulativeExperienceForLevel(storedLevel)
    );
    const normalizedLadderState = deriveLadderStateFromExperience(inferredExperiencePoints);
    const isHokage = Boolean(ladder.isHokage) && normalizedLadderState.level >= 46;
    const rankInfo = getRankInfoForLevel(normalizedLadderState.level, isHokage);
    const recentLadderGames = normalizeRecentLadderGames(source.recentLadderGames);
    const storedStreak = Number.isFinite(Number(ladder.streak)) ? Number(ladder.streak) : defaults.ladder.streak;
    const inferredLossStreak = inferCurrentLadderLossStreak({
        username: user.username,
        recentLadderGames,
    });
    const resolvedStreak = storedStreak === 0 && inferredLossStreak < 0 ? inferredLossStreak : storedStreak;

    return {
        avatarUrl:
            typeof source.avatarUrl === 'string' && source.avatarUrl.trim()
                ? source.avatarUrl.trim() === LEGACY_DEFAULT_PROFILE_AVATAR
                    ? defaults.avatarUrl
                    : source.avatarUrl.trim()
                : defaults.avatarUrl,
        backgrounds: {
            selectionUrl:
                typeof source.backgrounds?.selectionUrl === 'string'
                    ? source.backgrounds.selectionUrl.trim()
                    : defaults.backgrounds.selectionUrl,
            ingameUrl:
                typeof source.backgrounds?.ingameUrl === 'string'
                    ? source.backgrounds.ingameUrl.trim()
                    : defaults.backgrounds.ingameUrl,
        },
        posts: Number.isFinite(Number(source.posts)) ? Math.max(0, Number(source.posts)) : defaults.posts,
        clan,
        clanInvitations: normalizeClanInvitations(source.clanInvitations),
        recentQuickGames: normalizeRecentQuickGames(source.recentQuickGames),
        recentPrivateGames: normalizeRecentQuickGames(source.recentPrivateGames),
        recentLadderGames,
        recentQuickGamesCount24Hours: normalizeRecentQuickGames(source.recentQuickGames).length,
        recentPrivateGamesCount24Hours: normalizeRecentQuickGames(source.recentPrivateGames).length,
        recentLadderGamesCount24Hours: recentLadderGames.length,
        missions: normalizeMissionState(source.missions),
        matchmaking: {
            battleBotEnabled:
                typeof matchmaking.battleBotEnabled === 'boolean'
                    ? matchmaking.battleBotEnabled
                    : defaults.matchmaking.battleBotEnabled,
        },
        ladder: {
            level: normalizedLadderState.level,
            rank: rankInfo.rank,
            rankHatUrl: rankInfo.hatUrl,
            experiencePoints: normalizedLadderState.experiencePoints,
            experienceIntoLevel: normalizedLadderState.experienceIntoLevel,
            experienceForNextLevel: normalizedLadderState.experienceForNextLevel,
            experienceToNextLevel: normalizedLadderState.experienceToNextLevel,
            ladderRank: Number.isFinite(Number(ladder.ladderRank))
                ? Math.max(1, Number(ladder.ladderRank))
                : null,
            wins: Number.isFinite(Number(ladder.wins)) ? Math.max(0, Number(ladder.wins)) : defaults.ladder.wins,
            losses: Number.isFinite(Number(ladder.losses))
                ? Math.max(0, Number(ladder.losses))
                : defaults.ladder.losses,
            streak: resolvedStreak,
            highestStreak: Number.isFinite(Number(ladder.highestStreak))
                ? Number(ladder.highestStreak)
                : defaults.ladder.highestStreak,
            highestLevel: Math.max(
                normalizedLadderState.level,
                Number.isFinite(Number(ladder.highestLevel))
                    ? Math.max(1, Number(ladder.highestLevel))
                    : defaults.ladder.highestLevel
            ),
            famePoints: Number.isFinite(Number(ladder.famePoints))
                ? Math.max(0, Number(ladder.famePoints))
                : defaults.ladder.famePoints,
            isHokage,
        },
        activity: {
            lastOnlineAt: activity.lastOnlineAt || defaults.activity.lastOnlineAt,
            currentPage: typeof activity.currentPage === 'string' ? activity.currentPage.trim().slice(0, 120) : '',
        },
    };
};

const isGameBotUsername = (username) =>
    typeof username === 'string' && username.trim().toLowerCase().startsWith(GAME_BOT_USERNAME_PREFIX);

const getPlayerDisplayName = (player) => {
    const displayName =
        typeof player?.displayName === 'string' && player.displayName.trim()
            ? player.displayName.trim()
            : '';
    if (displayName) {
        return displayName;
    }
    const username = typeof player?.username === 'string' ? player.username.trim() : '';
    return isGameBotUsername(username) ? GAME_BOT_DISPLAY_NAME : username;
};

const recordRecentQuickGameForUsers = async ({ players, winnerUsername, endedAt }) => {
    const usernames = Array.isArray(players)
        ? players
              .map((player) => (typeof player?.username === 'string' ? player.username : ''))
              .filter(Boolean)
        : [];
    if (usernames.length < 2) {
        return;
    }

    const endedDate = endedAt instanceof Date ? endedAt : new Date(endedAt || Date.now());
    const existingUsers = await usersCollection
        .find(
            { username: { $in: usernames } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();

    await Promise.all(
        existingUsers.map(async (user) => {
            const opponentPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && player.username !== user.username
            );
            const opponentUsername = getPlayerDisplayName(opponentPlayer) || '';
            const winnerPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && player.username === winnerUsername
            );
            const profile = normalizeUserProfile(user);
            profile.recentQuickGames = normalizeRecentQuickGames([
                {
                    playedAt: endedDate,
                    opponentUsername,
                    winnerUsername: getPlayerDisplayName(winnerPlayer) || winnerUsername || '',
                },
                ...(Array.isArray(profile.recentQuickGames) ? profile.recentQuickGames : []),
            ]);
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile,
                    },
                }
            );
        })
    );
};

const recordRecentPrivateGameForUsers = async ({ players, winnerUsername, endedAt }) => {
    const usernames = Array.isArray(players)
        ? players
              .map((player) => (typeof player?.username === 'string' ? player.username : ''))
              .filter(Boolean)
        : [];
    if (usernames.length < 2) {
        return;
    }

    const endedDate = endedAt instanceof Date ? endedAt : new Date(endedAt || Date.now());
    const existingUsers = await usersCollection
        .find(
            { username: { $in: usernames } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();

    await Promise.all(
        existingUsers.map(async (user) => {
            const opponentPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && player.username !== user.username
            );
            const opponentUsername = getPlayerDisplayName(opponentPlayer) || '';
            const winnerPlayer = (Array.isArray(players) ? players : []).find(
                (player) => player?.username && player.username === winnerUsername
            );
            const profile = normalizeUserProfile(user);
            profile.recentPrivateGames = normalizeRecentQuickGames([
                {
                    playedAt: endedDate,
                    opponentUsername,
                    winnerUsername: getPlayerDisplayName(winnerPlayer) || winnerUsername || '',
                },
                ...(Array.isArray(profile.recentPrivateGames) ? profile.recentPrivateGames : []),
            ]);
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile,
                    },
                }
            );
        })
    );
};

const teamHasCharacterId = (match, username, characterId) => {
    if (!match || !username || !characterId) {
        return false;
    }
    const playerEntry = Array.isArray(match.players)
        ? match.players.find((player) => player && player.username === username)
        : null;
    const team = Array.isArray(playerEntry?.team) ? playerEntry.team : [];
    return team.some((rosterIndex) => getRosterCharacterId(rosterIndex) === characterId);
};

const applyMissionProgressForUsers = async (match, winnerUsername, endedAt) => {
    if (!match || !Array.isArray(match.players) || match.players.length < 2) {
        return null;
    }
    const specialPveMissionId = slugifyMissionId(
        match.specialPveMissionId || match.pveBattle?.missionId || ''
    );
    if (match.mode !== 'quick' && match.mode !== 'ladder' && !specialPveMissionId) {
        return null;
    }

    const usernames = match.players
        .map((player) => (typeof player?.username === 'string' ? player.username : ''))
        .filter(Boolean);
    if (!usernames.length) {
        return null;
    }

    const users = await usersCollection
        .find(
            { username: { $in: usernames } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();
    if (!users.length) {
        return null;
    }

    const userByUsername = new Map(users.map((user) => [user.username, user]));
    const missionCatalog = await getStoredMissionCatalog();

    await Promise.all(
        usernames.map(async (username) => {
            const user = userByUsername.get(username);
            if (!user) {
                return;
            }

            const profile = normalizeUserProfile(user);
            const missionState = normalizeMissionState(profile.missions);
            const progressByMissionId = {
                ...(missionState.progressByMissionId || {}),
            };
            const unlockedIds = new Set(missionState.unlockedCharacterIds || []);
            const userLevel = Number(profile?.ladder?.level) || 1;
            const didWin = Boolean(winnerUsername) && winnerUsername === username;
            let mutated = false;

            for (const mission of missionCatalog) {
                if (!mission || !mission.missionId) {
                    continue;
                }

                const levelRequirement = Math.max(0, Number(mission.level_requirement) || 0);
                if (levelRequirement > 0 && userLevel < levelRequirement) {
                    continue;
                }

                const rewardCharacterId = normalizeCharacterId(mission.reward_character);
                const specialPve = mission.special_pve || {};
                const existingProgress = normalizeMissionProgressEntry(
                    progressByMissionId[mission.missionId] || {}
                );
                const alreadyCompleted = Boolean(existingProgress.completedAt);
                if (specialPve.enabled) {
                    if (specialPveMissionId !== mission.missionId) {
                        continue;
                    }
                    if (rewardCharacterId && unlockedIds.has(rewardCharacterId)) {
                        if (!alreadyCompleted) {
                            progressByMissionId[mission.missionId] = normalizeMissionProgressEntry({
                                ...existingProgress,
                                completedAt: endedAt || existingProgress.completedAt || new Date(),
                                unlockedAt: endedAt || existingProgress.unlockedAt || new Date(),
                            });
                            mutated = true;
                        }
                        continue;
                    }
                    if (didWin) {
                        const completedAt = endedAt || new Date();
                        progressByMissionId[mission.missionId] = normalizeMissionProgressEntry({
                            ...existingProgress,
                            completedAt: existingProgress.completedAt || completedAt,
                            unlockedAt: existingProgress.unlockedAt || completedAt,
                        });
                        if (rewardCharacterId) {
                            unlockedIds.add(rewardCharacterId);
                        }
                        mutated = true;
                    }
                    continue;
                }

                const allowedModes = Array.isArray(mission.mode_restriction?.allowed_modes)
                    ? mission.mode_restriction.allowed_modes
                    : ['quick', 'ladder'];
                if (!allowedModes.includes(match.mode)) {
                    continue;
                }

                const missionGoals = normalizeMissionGoalList(mission.goals || []);
                const trackedGoals = missionGoals;
                const existingGoalProgressByIndex = {
                    ...(existingProgress.goalProgressByIndex || existingProgress.goalProgress || {}),
                };
                if (rewardCharacterId && unlockedIds.has(rewardCharacterId)) {
                    if (!alreadyCompleted) {
                        progressByMissionId[mission.missionId] = normalizeMissionProgressEntry({
                            ...existingProgress,
                            completedAt: endedAt || existingProgress.completedAt || new Date(),
                        });
                        mutated = true;
                    }
                    continue;
                }
                const nextGoalProgressByIndex = { ...existingGoalProgressByIndex };
                let hasTrackableGoals = false;
                let allTrackableGoalsComplete = trackedGoals.length > 0;

                trackedGoals.forEach((goal, goalIndex) => {
                    if (!goal || !goal.type) {
                        return;
                    }
                    const goalType = String(goal.type).trim().toLowerCase();
                    if (
                        goalType !== 'win_matches' &&
                        goalType !== 'win_streak' &&
                        goalType !== 'reach_rank' &&
                        goalType !== 'win_matches_same_team'
                    ) {
                        return;
                    }
                    hasTrackableGoals = true;
                    const targetCount =
                        goalType === 'reach_rank'
                            ? Math.max(0, Number(goal.rank) || 0)
                            : Math.max(0, Number(goal.wins) || 0);
                    if (!targetCount) {
                        allTrackableGoalsComplete = false;
                        return;
                    }
                    const goalCharacterId = normalizeCharacterId(goal.character_id);
                    const hasGoalCharacter = goalCharacterId
                        ? teamHasCharacterId(match, username, goalCharacterId)
                        : true;
                    const sameTeamCharacterIds = Array.isArray(goal.character_ids)
                        ? goal.character_ids.map((value) => normalizeCharacterId(value)).filter(Boolean)
                        : [];
                    const hasSameTeamCharacters =
                        sameTeamCharacterIds.length >= 2 &&
                        sameTeamCharacterIds.every((characterId) =>
                            teamHasCharacterId(match, username, characterId)
                        );
                    const existingGoalProgress = normalizeMissionGoalProgressEntry(
                        nextGoalProgressByIndex[goalIndex] || {}
                    );
                    const nextGoalProgress = {
                        ...existingGoalProgress,
                    };

                    if (goalType === 'win_matches') {
                        if (didWin && hasGoalCharacter) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        }
                    } else if (goalType === 'win_streak') {
                        if (didWin && hasGoalCharacter) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        } else if (winnerUsername) {
                            nextGoalProgress.count = 0;
                        }
                    } else if (goalType === 'reach_rank') {
                        nextGoalProgress.count = Math.min(targetCount, Math.max(0, userLevel));
                    } else if (goalType === 'win_matches_same_team') {
                        if (didWin && hasSameTeamCharacters) {
                            nextGoalProgress.count = Math.min(
                                targetCount,
                                Math.max(0, Number(existingGoalProgress.count) || 0) + 1
                            );
                        }
                    }

                    if (nextGoalProgress.count >= targetCount) {
                        nextGoalProgress.completedAt =
                            existingGoalProgress.completedAt || endedAt || new Date();
                    }
                    nextGoalProgress.updatedAt = endedAt || new Date();
                    nextGoalProgressByIndex[goalIndex] = normalizeMissionGoalProgressEntry(
                        nextGoalProgress
                    );

                    if (!nextGoalProgressByIndex[goalIndex].completedAt) {
                        allTrackableGoalsComplete = false;
                    }
                });

                const nextProgress = normalizeMissionProgressEntry({
                    ...existingProgress,
                    goalProgressByIndex: nextGoalProgressByIndex,
                    goalProgress: nextGoalProgressByIndex,
                });

                if (hasTrackableGoals && allTrackableGoalsComplete) {
                    nextProgress.completedAt = existingProgress.completedAt || endedAt || new Date();
                    nextProgress.unlockedAt = nextProgress.completedAt;
                    if (rewardCharacterId) {
                        unlockedIds.add(rewardCharacterId);
                    }
                }

                const progressChanged =
                    JSON.stringify(nextProgress) !== JSON.stringify(existingProgress);
                if (progressChanged) {
                    progressByMissionId[mission.missionId] = nextProgress;
                    mutated = true;
                } else if (
                    rewardCharacterId &&
                    hasTrackableGoals &&
                    allTrackableGoalsComplete &&
                    !unlockedIds.has(rewardCharacterId)
                ) {
                    unlockedIds.add(rewardCharacterId);
                    mutated = true;
                }
            }

            if (!mutated) {
                return;
            }

            profile.missions = {
                ...profile.missions,
                progressByMissionId,
                progress: progressByMissionId,
                unlockedCharacterIds: Array.from(unlockedIds),
            };

            const normalizedProfile = normalizeUserProfile({
                ...user,
                profile,
            });
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile: normalizedProfile,
                    },
                }
            );
        })
    );

    return true;
};

const addClanExperience = async (clanName, clanExpDelta) => {
    const normalizedClanName = typeof clanName === 'string' ? clanName.trim().toLowerCase() : '';
    const gain = Math.max(0, Number(clanExpDelta) || 0);
    if (!normalizedClanName || gain <= 0) {
        return 0;
    }

    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    _id: 1,
                    profile: 1,
                    createdAt: 1,
                },
            }
        )
        .toArray();

    const matchingUsers = users.filter((entry) => {
        const profile = normalizeUserProfile(entry);
        const clan = profile.clan;
        return (
            clan &&
            String(clan.name || '').trim().toLowerCase() === normalizedClanName
        );
    });

    if (!matchingUsers.length) {
        return 0;
    }

    await Promise.all(
        matchingUsers.map(async (entry) => {
            const profile = normalizeUserProfile(entry);
            if (!profile.clan) {
                return;
            }
            profile.clan.experiencePoints = Math.max(0, Number(profile.clan.experiencePoints) || 0) + gain;
            await usersCollection.updateOne(
                { _id: entry._id },
                {
                    $set: {
                        profile,
                    },
                }
            );
        })
    );

    return gain;
};

const recalculatePlayerLadderStandings = async () => {
    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    _id: 1,
                    username: 1,
                    createdAt: 1,
                    profile: 1,
                },
            }
        )
        .toArray();

    if (!users.length) {
        return new Map();
    }

    const normalizedUsers = users.map((user) => ({
        user,
        profile: normalizeUserProfile(user),
    }));

    normalizedUsers.sort((left, right) => {
        const leftLadder = left.profile.ladder || {};
        const rightLadder = right.profile.ladder || {};
        if ((rightLadder.level || 0) !== (leftLadder.level || 0)) {
            return (rightLadder.level || 0) - (leftLadder.level || 0);
        }
        if ((rightLadder.experiencePoints || 0) !== (leftLadder.experiencePoints || 0)) {
            return (rightLadder.experiencePoints || 0) - (leftLadder.experiencePoints || 0);
        }
        if ((rightLadder.wins || 0) !== (leftLadder.wins || 0)) {
            return (rightLadder.wins || 0) - (leftLadder.wins || 0);
        }
        return String(left.user.username || '').localeCompare(String(right.user.username || ''));
    });

    const hokageIndex = normalizedUsers.findIndex(
        (entry) => (Number(entry.profile?.ladder?.level) || 0) >= 46
    );
    const updates = [];
    const profileByUsername = new Map();

    normalizedUsers.forEach((entry, index) => {
        const normalizedProfile = normalizeUserProfile(entry.user);
        const shouldBeHokage = hokageIndex >= 0 && index === hokageIndex;
        normalizedProfile.ladder.ladderRank = index + 1;
        normalizedProfile.ladder.isHokage = shouldBeHokage;
        const finalProfile = normalizeUserProfile({
            ...entry.user,
            profile: normalizedProfile,
        });
        profileByUsername.set(entry.user.username, finalProfile);
        const profileChanged =
            JSON.stringify(entry.user.profile || null) !== JSON.stringify(finalProfile);
        if (profileChanged) {
            updates.push(
                usersCollection.updateOne(
                    { _id: entry.user._id },
                    {
                        $set: {
                            profile: finalProfile,
                        },
                    }
                )
            );
        }
    });

    if (updates.length > 0) {
        await Promise.all(updates);
    }

    return profileByUsername;
};

const applyMatchCompletionRewards = async (match, winnerUsername, endedAt) => {
    if (!match || !Array.isArray(match.players) || match.players.length < 2) {
        return null;
    }

    await applyMissionProgressForUsers(match, winnerUsername, endedAt);

    if (match.mode === 'private') {
        await recordRecentPrivateGameForUsers({
            players: match.players || [],
            winnerUsername: winnerUsername || '',
            endedAt,
        });
        return null;
    }

    if (match.mode === 'pve') {
        return null;
    }

    if (match.mode !== 'ladder') {
        await recordRecentQuickGameForUsers({
            players: match.players || [],
            winnerUsername: winnerUsername || '',
            endedAt,
        });
        return null;
    }

    const usernames = match.players
        .map((player) => (typeof player?.username === 'string' ? player.username : ''))
        .filter(Boolean);
    if (usernames.length < 2) {
        return null;
    }

    const users = await usersCollection
        .find(
            { username: { $in: usernames } },
            {
                projection: {
                    _id: 1,
                    username: 1,
                    createdAt: 1,
                    profile: 1,
                },
            }
        )
        .toArray();
    if (users.length < 1) {
        return null;
    }

    const userByUsername = new Map(users.map((user) => [user.username, user]));
    const initialProfiles = new Map(
        users.map((user) => [user.username, normalizeUserProfile(user)])
    );
    const preliminaryResults = new Map();

    for (const username of usernames) {
        const user = userByUsername.get(username);
        const profile = initialProfiles.get(username);
        const opponentEntry = (Array.isArray(match.players) ? match.players : []).find(
            (entry) => entry?.username && entry.username !== username
        );
        const opponentUsername =
            typeof opponentEntry?.username === 'string' ? opponentEntry.username : '';
        const opponentProfile = initialProfiles.get(opponentUsername) || {
            ...buildDefaultUserProfile(),
            ladder: {
                ...buildDefaultUserProfile().ladder,
                level: Math.max(
                    1,
                    Number(opponentEntry?.ladderLevel) || Number(profile?.ladder?.level) || 1
                ),
            },
        };
        if (!user || !profile) {
            continue;
        }

        const didWin = Boolean(winnerUsername) && winnerUsername === username;
        const expChange = winnerUsername
            ? resolveLadderExperienceDelta({
                  playerLevel: profile.ladder.level,
                  opponentLevel: opponentProfile.ladder.level,
                  didWin,
              })
            : 0;
        const previousExperiencePoints = profile.ladder.experiencePoints;
        const nextExperiencePoints = Math.min(
            LADDER_MAX_EXPERIENCE_POINTS,
            Math.max(0, previousExperiencePoints + expChange)
        );
        profile.ladder.experiencePoints = nextExperiencePoints;
        if (didWin) {
            profile.ladder.wins += 1;
            profile.ladder.streak = Math.max(0, Number(profile.ladder.streak) || 0) + 1;
            profile.ladder.highestStreak = Math.max(
                Number(profile.ladder.highestStreak) || 0,
                profile.ladder.streak
            );
        } else if (winnerUsername) {
            profile.ladder.losses += 1;
            profile.ladder.streak = Math.min(0, Number(profile.ladder.streak) || 0) - 1;
        }

        const expDelta = nextExperiencePoints - previousExperiencePoints;
        const clanRankKey = normalizeClanRankKey(profile.clan?.rankKey || '', user, profile.clan);
        const clanExpDelta =
            expDelta > 0 && profile.clan?.name && clanRankKey !== 'trial'
                ? Math.floor(expDelta / 2)
                : 0;

        profile.recentLadderGames = normalizeRecentLadderGames([
            {
                playedAt: endedAt,
                opponentUsername: getPlayerDisplayName(opponentEntry) || opponentUsername,
                winnerUsername:
                    getPlayerDisplayName(
                        (Array.isArray(match.players) ? match.players : []).find(
                            (entry) => entry?.username && entry.username === winnerUsername
                        )
                    ) ||
                    winnerUsername ||
                    '',
                expDelta,
                clanExpDelta,
            },
            ...(Array.isArray(profile.recentLadderGames) ? profile.recentLadderGames : []),
        ]);

        const normalizedProfile = normalizeUserProfile({
            ...user,
            profile,
        });
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                },
            }
        );

        if (clanExpDelta > 0) {
            await addClanExperience(profile.clan?.name || '', clanExpDelta);
        }

        preliminaryResults.set(username, {
            didWin,
            expDelta,
            clanExpDelta,
            previousExperiencePoints,
            previousLevel: initialProfiles.get(username)?.ladder?.level || 1,
            previousRank: initialProfiles.get(username)?.ladder?.rank || 'Academy Student',
        });
    }

    const refreshedProfiles = await recalculatePlayerLadderStandings();
    const results = {};
    usernames.forEach((username) => {
        const prelim = preliminaryResults.get(username);
        const finalProfile = refreshedProfiles.get(username);
        if (!prelim || !finalProfile) {
            return;
        }
        results[username] = {
            didWin: prelim.didWin,
            expDelta: prelim.expDelta,
            clanExpDelta: prelim.clanExpDelta || 0,
            previousExperiencePoints: prelim.previousExperiencePoints,
            currentExperiencePoints: finalProfile.ladder.experiencePoints,
            previousLevel: prelim.previousLevel,
            currentLevel: finalProfile.ladder.level,
            previousRank: prelim.previousRank,
            currentRank: finalProfile.ladder.rank,
            ladderRank: finalProfile.ladder.ladderRank || null,
            rankHatUrl: finalProfile.ladder.rankHatUrl || '',
        };
    });

    return results;
};

const serializeUserForClient = (user = {}) => ({
    username: user.username,
    email: user.email,
    role: user.role || 'player',
    createdAt: user.createdAt,
    savedTeamIndices: Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : [],
    profile: normalizeUserProfile(user),
});

const serializePublicUserProfile = (user = {}) => ({
    username: user.username,
    role: user.role || 'player',
    createdAt: user.createdAt,
    profile: normalizeUserProfile(user),
});

const serializeCommunityUserSummary = (user = {}) => {
    const profile = normalizeUserProfile(user);
    const wins = Number(profile?.ladder?.wins) || 0;
    const losses = Number(profile?.ladder?.losses) || 0;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Number(((wins / totalGames) * 100).toFixed(1)) : 0;
    return {
        username: typeof user.username === 'string' ? user.username : '',
        role: typeof user.role === 'string' ? user.role : 'player',
        createdAt: user.createdAt || null,
        avatarUrl: profile?.avatarUrl || DEFAULT_PROFILE_AVATAR,
        clan: profile?.clan
            ? {
                  name: profile.clan.name || '',
                  abbreviation: profile.clan.abbreviation || '',
                  rank: profile.clan.rank || '',
                  avatarUrl: profile.clan.avatarUrl || '',
              }
            : null,
        ladder: {
            level: Number(profile?.ladder?.level) || 1,
            rank: profile?.ladder?.rank || 'Academy Student',
            ladderRank: Number.isFinite(Number(profile?.ladder?.ladderRank))
                ? Number(profile.ladder.ladderRank)
                : null,
            wins,
            losses,
            totalGames,
            winRate,
            streak: Number(profile?.ladder?.streak) || 0,
            highestStreak: Number(profile?.ladder?.highestStreak) || 0,
        },
    };
};

const serializeAdminUserDocument = (user = {}) => ({
    username: user.username,
    usernameLower: user.usernameLower,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role || 'player',
    createdAt: user.createdAt,
    savedTeamIndices: Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : [],
    profile: normalizeUserProfile(user),
});

const normalizeNewsParagraphs = (value) =>
    (Array.isArray(value) ? value : [])
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
        .slice(0, 100);

const buildCharacterCatalog = () =>
    charactersData.map((character = {}) => ({
        characterId: typeof character.characterId === 'string' ? character.characterId : '',
        name: typeof character.name === 'string' ? character.name : '',
        facePicture: typeof character.facePicture === 'string' ? character.facePicture : '',
        role: typeof character.role === 'string' ? character.role : '',
        roleCategory: typeof character.roleCategory === 'string' ? character.roleCategory : '',
        universe: typeof character.universe === 'string' ? character.universe : '',
        skills: (Array.isArray(character.skills) ? character.skills : []).map((skill = {}) => ({
            id: typeof skill.id === 'string' ? skill.id : '',
            name: typeof skill.name === 'string' ? skill.name : '',
            skillimage: typeof skill.skillimage === 'string' ? skill.skillimage : '',
            classes: Array.isArray(skill.classes) ? skill.classes : [],
        })),
    }));

let characterCatalog = buildCharacterCatalog();

const serializeCharactersDataFile = (nextCharacters) =>
    'const characters = ' +
    JSON.stringify(nextCharacters, null, 4) +
    ';\n\nif (typeof module !== \'undefined\') {\n    module.exports = characters;\n}\n';

const getCharacterRecordId = (character = {}) =>
    typeof character?.characterId === 'string' && character.characterId.trim()
        ? character.characterId.trim()
        : typeof character?.id === 'string' && character.id.trim()
            ? character.id.trim()
            : '';

const loadCharactersDataFromFile = () => {
    delete require.cache[require.resolve(CHARACTERS_FILE_PATH)];
    const fileCharacters = require(CHARACTERS_FILE_PATH);
    return Array.isArray(fileCharacters) ? fileCharacters : [];
};

const applyCharacterOverrides = (baseCharacters = []) => {
    const nextCharacters = (Array.isArray(baseCharacters) ? baseCharacters : []).slice();
    characterOverrideCache.forEach((overrideCharacter, characterId) => {
        if (!characterId || !overrideCharacter || typeof overrideCharacter !== 'object') {
            return;
        }
        const existingIndex = nextCharacters.findIndex(
            (entry) => getCharacterRecordId(entry) === characterId
        );
        if (existingIndex === -1) {
            nextCharacters.push(overrideCharacter);
            return;
        }
        nextCharacters[existingIndex] = overrideCharacter;
    });
    return nextCharacters;
};

const rebuildCharacterCatalog = (nextCharacters) => {
    charactersData = Array.isArray(nextCharacters) ? nextCharacters : [];
    characterCatalog = buildCharacterCatalog();
};

const normalizeStoredCharacterOverrides = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => {
            const character =
                entry && typeof entry === 'object' && entry.character && typeof entry.character === 'object'
                    ? entry.character
                    : entry;
            const characterId = getCharacterRecordId(character);
            return characterId ? { characterId, character } : null;
        })
        .filter(Boolean);

const loadStoredCharacterOverrides = async () => {
    if (!appStateCollection) {
        characterOverrideCache = new Map();
        return characterOverrideCache;
    }

    const state = await appStateCollection.findOne({ key: CHARACTER_OVERRIDES_STATE_KEY });
    const overrides = normalizeStoredCharacterOverrides(
        state && Array.isArray(state.overrides)
            ? state.overrides
            : state?.value && Array.isArray(state.value.overrides)
                ? state.value.overrides
                : []
    );
    characterOverrideCache = new Map(
        overrides.map((entry) => [entry.characterId, entry.character])
    );
    return characterOverrideCache;
};

const hydrateCharactersDataFromStoredOverrides = async () => {
    await loadStoredCharacterOverrides();
    const fileCharacters = loadCharactersDataFromFile();
    const mergedCharacters = applyCharacterOverrides(fileCharacters);
    rebuildCharacterCatalog(mergedCharacters);

    if (characterOverrideCache.size > 0) {
        try {
            await fs.promises.writeFile(
                CHARACTERS_FILE_PATH,
                serializeCharactersDataFile(mergedCharacters),
                'utf8'
            );
        } catch (error) {
            console.error('Character data startup file sync error:', error);
        }
    }
};

const saveCharacterOverride = async ({ character, previousCharacterId = '', updatedBy = '' }) => {
    if (!appStateCollection || !character || typeof character !== 'object') {
        return;
    }
    const characterId = getCharacterRecordId(character);
    if (!characterId) {
        return;
    }

    characterOverrideCache.set(characterId, character);
    if (previousCharacterId && previousCharacterId !== characterId) {
        characterOverrideCache.delete(previousCharacterId);
    }

    const now = new Date();
    const overrides = Array.from(characterOverrideCache.entries()).map(([id, overrideCharacter]) => ({
        characterId: id,
        character: overrideCharacter,
        updatedAt: now,
        updatedBy: updatedBy || '',
    }));

    await appStateCollection.updateOne(
        { key: CHARACTER_OVERRIDES_STATE_KEY },
        {
            $set: {
                key: CHARACTER_OVERRIDES_STATE_KEY,
                overrides,
                updatedAt: now,
                updatedBy: updatedBy || '',
            },
        },
        { upsert: true }
    );
};

const saveCharactersDataFile = async (nextCharacters, options = {}) => {
    const serialized = serializeCharactersDataFile(nextCharacters);
    await fs.promises.writeFile(CHARACTERS_FILE_PATH, serialized, 'utf8');
    rebuildCharacterCatalog(nextCharacters);
    if (options.characterOverride) {
        await saveCharacterOverride({
            character: options.characterOverride,
            previousCharacterId: options.previousCharacterId,
            updatedBy: options.updatedBy,
        });
    }
};

const refreshCharactersDataFromFile = () => {
    try {
        rebuildCharacterCatalog(applyCharacterOverrides(loadCharactersDataFromFile()));
    } catch (error) {
        console.error('Character data refresh error:', error);
    }
    return Array.isArray(charactersData) ? charactersData : [];
};

const resolveNewsChangeAssets = (entry = {}) => {
    const characterId = typeof entry.characterId === 'string' ? entry.characterId.trim() : '';
    const skillId = typeof entry.skillId === 'string' ? entry.skillId.trim() : '';
    const characterName = typeof entry.characterName === 'string' ? entry.characterName.trim() : '';
    const skillName = typeof entry.skillName === 'string' ? entry.skillName.trim() : '';

    const character = characterCatalog.find((item) =>
        (characterId && item.characterId === characterId) ||
        (characterName && item.name.toLowerCase() === characterName.toLowerCase())
    );
    const skill = character && character.skills
        ? character.skills.find((item) =>
            (skillId && item.id === skillId) ||
            (skillName && item.name.toLowerCase() === skillName.toLowerCase())
        )
        : null;

    return {
        characterId: character ? character.characterId : characterId,
        characterName: character ? character.name : characterName,
        facePicture: character ? character.facePicture : '',
        skillId: skill ? skill.id : skillId,
        skillName: skill ? skill.name : skillName,
        skillimage: skill ? skill.skillimage : '',
    };
};

const normalizeNewsChanges = (value) =>
    (Array.isArray(value) ? value : [])
        .map((entry) => {
            if (typeof entry === 'string') {
                const text = entry.trim();
                return text ? { text } : null;
            }
            if (!entry || typeof entry !== 'object') {
                return null;
            }
            const text = typeof entry.text === 'string' ? entry.text.trim() : '';
            if (!text) {
                return null;
            }
            const assets = resolveNewsChangeAssets(entry);
            return {
                text,
                changeType:
                    typeof entry.changeType === 'string' && entry.changeType.trim()
                        ? entry.changeType.trim().toLowerCase()
                        : '',
                characterId: assets.characterId,
                characterName: assets.characterName,
                facePicture: assets.facePicture,
                skillId: assets.skillId,
                skillName: assets.skillName,
                skillimage: assets.skillimage,
            };
        })
        .filter(Boolean)
        .slice(0, 200);

const normalizeNewsBlocks = (value) =>
    (Array.isArray(value) ? value : [])
        .map((entry) => ({
            type: typeof entry?.type === 'string' ? entry.type.trim().toLowerCase() : 'paragraph',
            text: typeof entry?.text === 'string' ? entry.text.trim() : '',
        }))
        .filter((entry) => entry.type === 'divider' || (entry.type === 'paragraph' && entry.text))
        .slice(0, 200);

const serializeNewsPost = (post = {}) => ({
    id: post._id ? String(post._id) : '',
    title: typeof post.title === 'string' ? post.title : 'Untitled Post',
    paragraphs: normalizeNewsParagraphs(post.paragraphs),
    changes: normalizeNewsChanges(post.changes),
    blocks: normalizeNewsBlocks(post.blocks),
    author: typeof post.author === 'string' ? post.author : 'Unknown',
    createdAt: post.createdAt || null,
    updatedAt: post.updatedAt || null,
});

const buildPublicClanProfile = async (requestedClanName = '') => {
    const normalizedRequestedName = typeof requestedClanName === 'string' ? requestedClanName.trim().toLowerCase() : '';
    if (!normalizedRequestedName) {
        return null;
    }

    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    username: 1,
                    createdAt: 1,
                    profile: 1,
                },
            }
        )
        .toArray();

    const clanMap = new Map();
    users.forEach((user = {}) => {
        const normalizedUser = {
            username: user.username,
            createdAt: user.createdAt,
            profile: normalizeUserProfile(user),
        };
        const clan = normalizedUser.profile.clan;
        if (!clan || !clan.name) {
            return;
        }

        const clanKey = String(clan.name || '').trim().toLowerCase();
        if (!clanKey) {
            return;
        }

        if (!clanMap.has(clanKey)) {
            clanMap.set(clanKey, {
                key: clanKey,
                name: clan.name,
                abbreviation: clan.abbreviation || '',
                avatarUrl: clan.avatarUrl || '',
                bio: clan.bio || '',
                experiencePoints: Math.max(0, Number(clan.experiencePoints) || 0),
                createdBy: clan.createdBy || '',
                createdAt: clan.createdAt || normalizedUser.createdAt || null,
                totalLevel: 0,
                totalExperiencePoints: 0,
                totalWins: 0,
                totalLosses: 0,
                members: [],
            });
        }

        const bucket = clanMap.get(clanKey);
        const ladder = normalizedUser.profile.ladder || {};
        bucket.name = bucket.name || clan.name;
        bucket.abbreviation = bucket.abbreviation || clan.abbreviation || '';
        bucket.avatarUrl = bucket.avatarUrl || clan.avatarUrl || '';
        bucket.bio = bucket.bio || clan.bio || '';
        bucket.experiencePoints = Math.max(
            Number(bucket.experiencePoints) || 0,
            Number(clan.experiencePoints) || 0
        );
        bucket.createdBy = bucket.createdBy || clan.createdBy || '';
        bucket.createdAt = bucket.createdAt || clan.createdAt || normalizedUser.createdAt || null;
        bucket.totalLevel += Number(ladder.level) || 0;
        bucket.totalExperiencePoints += Number(ladder.experiencePoints) || 0;
        bucket.totalWins += Number(ladder.wins) || 0;
        bucket.totalLosses += Number(ladder.losses) || 0;
        bucket.members.push({
            username: normalizedUser.username,
            avatarUrl: normalizedUser.profile.avatarUrl || DEFAULT_PROFILE_AVATAR,
            level: Number(ladder.level) || 1,
            joinedAt: clan.joinedAt || null,
            rankKey: clan.rankKey || 'member',
            rank: clan.rank || resolveBaseClanRankLabel(clan.rankKey || 'member'),
        });
    });

    const clans = Array.from(clanMap.values()).sort((left, right) => {
        const leftClanLadder = deriveLadderStateFromExperience(left.experiencePoints || 0);
        const rightClanLadder = deriveLadderStateFromExperience(right.experiencePoints || 0);
        if (rightClanLadder.level !== leftClanLadder.level) {
            return rightClanLadder.level - leftClanLadder.level;
        }
        if ((right.experiencePoints || 0) !== (left.experiencePoints || 0)) {
            return (right.experiencePoints || 0) - (left.experiencePoints || 0);
        }
        return String(left.name || '').localeCompare(String(right.name || ''));
    });

    const targetClan = clans.find((entry) => entry.key === normalizedRequestedName);
    if (!targetClan) {
        return null;
    }

    const ladderRank = clans.findIndex((entry) => entry.key === targetClan.key) + 1;
    const totalGames = targetClan.totalWins + targetClan.totalLosses;
    const winPercentage = totalGames > 0 ? Number(((targetClan.totalWins / totalGames) * 100).toFixed(2)) : 0;
    const rankOrder = {
        clanLeader: 0,
        leader: 1,
        captain: 2,
        lieutenant: 3,
        member: 4,
        trial: 5,
    };

    targetClan.members.sort((left, right) => {
        const leftRankOrder =
            Object.prototype.hasOwnProperty.call(rankOrder, left.rankKey) ? rankOrder[left.rankKey] : rankOrder.member;
        const rightRankOrder =
            Object.prototype.hasOwnProperty.call(rankOrder, right.rankKey)
                ? rankOrder[right.rankKey]
                : rankOrder.member;
        if (leftRankOrder !== rightRankOrder) {
            return leftRankOrder - rightRankOrder;
        }
        return String(left.username || '').localeCompare(String(right.username || ''));
    });

    const clanLadderState = deriveLadderStateFromExperience(targetClan.experiencePoints || 0);

    return {
        name: targetClan.name,
        abbreviation: targetClan.abbreviation,
        avatarUrl: targetClan.avatarUrl,
        bio: targetClan.bio,
        createdBy: targetClan.createdBy,
        createdAt: targetClan.createdAt,
        ladder: {
            level: clanLadderState.level,
            experiencePoints: Math.max(0, targetClan.totalExperiencePoints || 0),
            clanExperiencePoints: Math.max(0, targetClan.experiencePoints || 0),
            experienceIntoLevel: clanLadderState.experienceIntoLevel,
            experienceForNextLevel: clanLadderState.experienceForNextLevel,
            experienceToNextLevel: clanLadderState.experienceToNextLevel,
            ladderRank: ladderRank > 0 ? ladderRank : null,
            wins: Math.max(0, targetClan.totalWins || 0),
            losses: Math.max(0, targetClan.totalLosses || 0),
            winPercentage,
        },
        members: targetClan.members,
    };
};

const buildSidebarLeaderboards = async () => {
    const users = await usersCollection
        .find(
            {},
            {
                projection: {
                    username: 1,
                    profile: 1,
                },
            }
        )
        .toArray();

    const normalizedUsers = users.map((user) => ({
        username: user.username,
        profile: normalizeUserProfile(user),
    }));

    const byNumberDescThenName = (getValue) => (left, right) => {
        const leftValue = Number(getValue(left)) || 0;
        const rightValue = Number(getValue(right)) || 0;
        if (rightValue !== leftValue) {
            return rightValue - leftValue;
        }
        return String(left.username || '').localeCompare(String(right.username || ''));
    };

    const topPlayerLevels = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => entry.profile.ladder.level))
        .slice(0, 10)
        .map((entry) => ({
            username: entry.username,
            value: entry.profile.ladder.level,
            progressPercent: getLevelProgressPercent(
                entry.profile.ladder.experienceIntoLevel,
                entry.profile.ladder.experienceForNextLevel,
                entry.profile.ladder.level
            ),
        }));

    const topCurrentStreaks = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => entry.profile.ladder.streak))
        .slice(0, 10)
        .map((entry) => ({
            username: entry.username,
            value: entry.profile.ladder.streak,
        }));

    const topWins = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => entry.profile.ladder.wins))
        .slice(0, 10)
        .map((entry) => ({
            username: entry.username,
            value: entry.profile.ladder.wins,
        }));

    const topHighestStreaks = normalizedUsers
        .slice()
        .sort(byNumberDescThenName((entry) => entry.profile.ladder.highestStreak))
        .slice(0, 20)
        .map((entry) => ({
            username: entry.username,
            value: entry.profile.ladder.highestStreak,
        }));

    const clansByName = new Map();
    normalizedUsers.forEach((entry) => {
        const clan = entry.profile.clan;
        const clanName = typeof clan?.name === 'string' ? clan.name.trim() : '';
        if (!clanName) {
            return;
        }
        const existing = clansByName.get(clanName) || {
            clanName,
            abbreviation: typeof clan?.abbreviation === 'string' ? clan.abbreviation.trim() : '',
            value: 0,
            members: 0,
            clanExperiencePoints: 0,
        };
        existing.clanExperiencePoints = Math.max(
            Number(existing.clanExperiencePoints) || 0,
            Number(clan?.experiencePoints) || 0
        );
        const clanLadderState = deriveLadderStateFromExperience(existing.clanExperiencePoints);
        existing.value = clanLadderState.level;
        existing.progressPercent = getLevelProgressPercent(
            clanLadderState.experienceIntoLevel,
            clanLadderState.experienceForNextLevel,
            clanLadderState.level
        );
        existing.members += 1;
        if (!existing.abbreviation && typeof clan?.abbreviation === 'string') {
            existing.abbreviation = clan.abbreviation.trim();
        }
        clansByName.set(clanName, existing);
    });

    const topClanLevels = Array.from(clansByName.values())
        .sort((left, right) => {
            if (right.value !== left.value) {
                return right.value - left.value;
            }
            if ((right.clanExperiencePoints || 0) !== (left.clanExperiencePoints || 0)) {
                return (right.clanExperiencePoints || 0) - (left.clanExperiencePoints || 0);
            }
            return left.clanName.localeCompare(right.clanName);
        })
        .slice(0, 10);

    return {
        topPlayerLevels,
        topClanLevels,
        topCurrentStreaks,
        topWins,
        topHighestStreaks,
    };
};

const backfillUserProfiles = async () => {
    const cursor = usersCollection.find(
        {},
        {
            projection: {
                _id: 1,
                username: 1,
                usernameLower: 1,
                createdAt: 1,
                profile: 1,
                savedTeamIndices: 1,
            },
        }
    );

    while (await cursor.hasNext()) {
        const user = await cursor.next();
        if (!user) {
            continue;
        }
        const normalizedProfile = normalizeUserProfile(user);
        const nextSavedTeamIndices = Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : [];
        const nextUsernameLower =
            typeof user.username === 'string' ? user.username.trim().toLowerCase() : '';
        const needsProfile =
            JSON.stringify(user.profile || null) !== JSON.stringify(normalizedProfile);
        const needsSavedTeams = !Array.isArray(user.savedTeamIndices);
        const needsUsernameLower = user.usernameLower !== nextUsernameLower;
        if (!needsProfile && !needsSavedTeams && !needsUsernameLower) {
            continue;
        }
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    usernameLower: nextUsernameLower,
                    profile: normalizedProfile,
                    savedTeamIndices: nextSavedTeamIndices,
                },
            }
        );
    }

    await recalculatePlayerLadderStandings();
};

const buildCharacterFaceMap = () =>
    new Map(
        (Array.isArray(charactersData) ? charactersData : [])
            .filter((character) => character && typeof character === 'object')
            .map((character) => {
                const key = character.characterId || character.id || character.name;
                if (!key) return null;
                return [key, character.facePicture || ''];
            })
            .filter(Boolean)
    );

const buildCharacterSummaryMap = () =>
    new Map(
        (Array.isArray(charactersData) ? charactersData : [])
            .filter((character) => character && typeof character === 'object')
            .map((character) => {
                const key = character.characterId || character.id || character.name;
                if (!key) return null;
                return [
                    key,
                    {
                        characterId: key,
                        label: character.name || key,
                        facePicture: character.facePicture || '',
                    },
                ];
            })
            .filter(Boolean)
    );

const normalizeLatestCharacterReleases = (entries = []) => {
    const characterMap = buildCharacterSummaryMap();
    const defaults = Array.isArray(LATEST_CHARACTER_RELEASES) ? LATEST_CHARACTER_RELEASES : [];
    return [0, 1, 2].map((index) => {
        const entry = Array.isArray(entries) ? entries[index] || {} : {};
        const fallback = defaults[index] || { label: `Latest Character ${index + 1}`, characterId: '' };
        const requestedCharacterId =
            typeof entry?.characterId === 'string' ? entry.characterId.trim() : '';
        const character = requestedCharacterId ? characterMap.get(requestedCharacterId) : null;
        if (character) {
            return {
                label: character.label,
                characterId: character.characterId,
                facePicture: character.facePicture,
            };
        }
        return {
            label: fallback.label || `Latest Character ${index + 1}`,
            characterId: '',
            facePicture: '',
        };
    });
};

const getLatestCharacterReleases = async () => {
    if (!appStateCollection) {
        return normalizeLatestCharacterReleases(LATEST_CHARACTER_RELEASES);
    }
    const state = await appStateCollection.findOne({ key: LATEST_CHARACTER_RELEASES_STATE_KEY });
    const entries =
        state && Array.isArray(state.releases)
            ? state.releases
            : state?.value && Array.isArray(state.value.releases)
            ? state.value.releases
            : LATEST_CHARACTER_RELEASES;
    return normalizeLatestCharacterReleases(entries);
};

const getMaintenanceModeState = async () => {
    if (!appStateCollection) {
        return false;
    }
    const now = Date.now();
    if (maintenanceModeCache.expiresAt > now) {
        return maintenanceModeCache.enabled;
    }
    if (!maintenanceModeStatePromise) {
        maintenanceModeStatePromise = appStateCollection
            .findOne({ key: MAINTENANCE_MODE_STATE_KEY })
            .then((state) => {
                const enabled = Boolean(state?.enabled);
                maintenanceModeCache = {
                    enabled,
                    expiresAt: Date.now() + MAINTENANCE_MODE_CACHE_TTL_MS,
                };
                return enabled;
            })
            .finally(() => {
                maintenanceModeStatePromise = null;
            });
    }
    return maintenanceModeStatePromise;
};

const parseSessionTokenFromRequest = (req = {}) => {
    const cookies = String(req.headers?.cookie || '')
        .split(';')
        .reduce((acc, part) => {
            const [rawKey, ...rawValueParts] = String(part).split('=');
            const key = rawKey ? rawKey.trim() : '';
            if (!key) {
                return acc;
            }
            acc[key] = decodeURIComponent(rawValueParts.join('=').trim() || '');
            return acc;
        }, {});
    return cookies[SESSION_COOKIE_NAME] || '';
};

const getSessionUserFromRequest = async (req = {}) => {
    const token = parseSessionTokenFromRequest(req);
    if (!token) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await usersCollection.findOne({ username: decoded.username });
        return user || null;
    } catch (error) {
        return null;
    }
};

const shouldBypassMaintenanceCheckForAsset = (req = {}) => {
    const method = String(req.method || '').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
        return false;
    }
    const extension = path.extname(String(req.path || '')).toLowerCase();
    return Boolean(extension && extension !== '.html');
};

const renderMaintenancePage = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comic-Arena Maintenance</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, #fff4cd 0%, #f5dd9e 34%, #f7b44a 100%);
      color: #15110b;
      font-family: Arial, sans-serif;
    }
    .panel {
      width: min(90vw, 560px);
      padding: 32px 28px;
      border: 4px solid #16120d;
      background: #fff7de;
      box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.95);
      text-align: center;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 32px;
    }
    p {
      margin: 0;
      font-size: 20px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="panel">
    <h1>Maintenance Mode</h1>
    <p>This game is under maintenance.</p>
  </div>
</body>
</html>`;

const normalizeOrigin = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    try {
        return new URL(value.trim()).origin;
    } catch (error) {
        return '';
    }
};

const configuredCorsOrigins = (
    process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:4000,https://localhost:4001'
)
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const resolveRequestOrigin = (req) => {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
    if (!host) {
        return '';
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').trim().split(',')[0];
    const protocol =
        forwardedProto || (ALLOW_INSECURE_HTTP ? 'http' : 'https') || req.protocol || 'http';
    return normalizeOrigin(`${protocol}://${host}`);
};

const isAllowedCorsOrigin = (origin, req) => {
    if (!origin) {
        return true;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
        return false;
    }

    if (configuredCorsOrigins.includes(normalizedOrigin)) {
        return true;
    }

    return normalizedOrigin === resolveRequestOrigin(req);
};

app.use((req, res, next) => {
    cors({
        origin(origin, callback) {
            if (isAllowedCorsOrigin(origin, req)) {
                callback(null, true);
                return;
            }

            callback(new Error('CORS origin not allowed.'));
        },
        credentials: true,
    })(req, res, next);
});
app.use(async (req, res, next) => {
    const protectedMissionPages = new Set(['/editmission', '/editmission.html']);
    if (!protectedMissionPages.has(req.path)) {
        return next();
    }

    try {
        const cookies = String(req.headers?.cookie || '')
            .split(';')
            .reduce((acc, part) => {
                const [rawKey, ...rawValueParts] = String(part).split('=');
                const key = rawKey ? rawKey.trim() : '';
                if (!key) {
                    return acc;
                }
                acc[key] = decodeURIComponent(rawValueParts.join('=').trim() || '');
                return acc;
            }, {});
        const token = cookies[SESSION_COOKIE_NAME];
        if (!token) {
            return res.redirect('/');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await usersCollection.findOne({ username: decoded.username });
        if (!user || String(user.role || '').trim().toLowerCase() !== 'admin') {
            return res.redirect('/');
        }

        return next();
    } catch (error) {
        return res.redirect('/');
    }
});
app.use(async (req, res, next) => {
    if (shouldBypassMaintenanceCheckForAsset(req)) {
        return next();
    }

    try {
        const maintenanceEnabled = await getMaintenanceModeState();
        if (!maintenanceEnabled) {
            return next();
        }

        const requestPath = String(req.path || '');
        const adminBypassPaths = new Set(['/newspost', '/newspost.html', '/api/login', '/health']);
        if (adminBypassPaths.has(requestPath)) {
            return next();
        }

        const sessionUser = await getSessionUserFromRequest(req);
        if (sessionUser && String(sessionUser.role || '').trim().toLowerCase() === 'admin') {
            return next();
        }

        if (requestPath.startsWith('/api/')) {
            return res.status(503).json({
                error: 'This game is under maintenance.',
                maintenance: true,
            });
        }

        if (req.method === 'GET' || req.method === 'HEAD') {
            return res.status(503).type('html').send(renderMaintenancePage());
        }

        return res.status(503).json({
            error: 'This game is under maintenance.',
            maintenance: true,
        });
    } catch (error) {
        return next();
    }
});
const noIndexPagePaths = new Set([
    '/character-builder',
    '/character-builder.html',
    '/charactereditor',
    '/charactereditor.html',
    '/editmission',
    '/editmission.html',
    '/newspost',
    '/newspost.html',
    '/playeraccounts',
    '/playeraccounts.html',
]);

app.use((req, res, next) => {
    if (noIndexPagePaths.has(req.path)) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    next();
});

app.use(async (req, res, next) => {
    if (!noIndexPagePaths.has(req.path)) {
        return next();
    }

    try {
        const sessionUser = await getSessionUserFromRequest(req);
        if (sessionUser && String(sessionUser.role || '').trim().toLowerCase() === 'admin') {
            return next();
        }
    } catch (error) {
        // Fall through to the public landing page for unauthenticated or invalid sessions.
    }

    return res.redirect('/');
});

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:', '*'],
                connectSrc: ["'self'", ...configuredCorsOrigins],
                objectSrc: ["'none'"],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
    })
);
app.get('/characters.js', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('application/javascript');
    return res.send(serializeCharactersDataFile(Array.isArray(charactersData) ? charactersData : []));
});
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(cookieParser());
app.use(
    morgan('combined', {
        skip: () => process.env.NODE_ENV === 'test',
    })
);

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait a moment and try again.' },
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many registration attempts. Please wait a moment and try again.' },
});


const signSession = (user) =>
    jwt.sign(
        {
            sub: user._id?.toString?.() || user.username,
            username: user.username,
            role: user.role || 'player',
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );

const setSessionCookie = (res, token) => {
    res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: !ALLOW_INSECURE_HTTP,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_MS,
    });
};

const clearSessionCookie = (res) => {
    res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: !ALLOW_INSECURE_HTTP,
        sameSite: 'lax',
    });
};

const getRemoteImageBuffer = async (url, redirectCount = 0) => {
    if (redirectCount > 3) {
        throw new Error('Too many redirects.');
    }
    const response = await fetch(url, {
        redirect: 'manual',
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
            throw new Error('Invalid image response.');
        }
        const nextUrl = new URL(location, url).toString();
        return getRemoteImageBuffer(nextUrl, redirectCount + 1);
    }
    if (!response.ok) {
        throw new Error('Image URL could not be reached.');
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error('URL must point directly to an image.');
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

const readPngDimensions = (buffer) => {
    if (buffer.length < 24) return null;
    if (
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47
    ) {
        return null;
    }
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
};

const readGifDimensions = (buffer) => {
    if (buffer.length < 10) return null;
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header !== 'GIF87a' && header !== 'GIF89a') {
        return null;
    }
    return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
    };
};

const readJpegDimensions = (buffer) => {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        return null;
    }
    let offset = 2;
    while (offset + 8 < buffer.length) {
        if (buffer[offset] !== 0xff) {
            offset += 1;
            continue;
        }
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (length < 2) return null;
        const isStartOfFrame =
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf);
        if (isStartOfFrame) {
            return {
                height: buffer.readUInt16BE(offset + 5),
                width: buffer.readUInt16BE(offset + 7),
            };
        }
        offset += 2 + length;
    }
    return null;
};

const readWebpDimensions = (buffer) => {
    if (buffer.length < 30) return null;
    if (
        buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
        buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
    ) {
        return null;
    }
    const chunkType = buffer.subarray(12, 16).toString('ascii');
    if (chunkType === 'VP8X' && buffer.length >= 30) {
        return {
            width: 1 + buffer.readUIntLE(24, 3),
            height: 1 + buffer.readUIntLE(27, 3),
        };
    }
    if (chunkType === 'VP8 ' && buffer.length >= 30) {
        return {
            width: buffer.readUInt16LE(26) & 0x3fff,
            height: buffer.readUInt16LE(28) & 0x3fff,
        };
    }
    if (chunkType === 'VP8L' && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21);
        return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >> 14) & 0x3fff) + 1,
        };
    }
    return null;
};

const getImageDimensionsFromBuffer = (buffer) =>
    readPngDimensions(buffer) ||
    readGifDimensions(buffer) ||
    readJpegDimensions(buffer) ||
    readWebpDimensions(buffer);

const validateAvatarUrl = async (url) => {
    const buffer = await getRemoteImageBuffer(url);
    const dimensions = getImageDimensionsFromBuffer(buffer);
    if (!dimensions) {
        throw new Error('Unsupported image format.');
    }
    if (dimensions.width !== 75 || dimensions.height !== 75) {
        throw new Error('Avatars must be exactly 75x75.');
    }
    return true;
};

const validateBackgroundUrl = async (url) => {
    if (!url) {
        return true;
    }
    const buffer = await getRemoteImageBuffer(url);
    const dimensions = getImageDimensionsFromBuffer(buffer);
    if (!dimensions) {
        throw new Error('Unsupported image format.');
    }
    if (dimensions.width !== 770 || dimensions.height !== 560) {
        throw new Error('Backgrounds must be exactly 770x560.');
    }
    return true;
};

const requireSession = async (req, res, next) => {
    try {
        const token = req.cookies?.[SESSION_COOKIE_NAME];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await usersCollection.findOne({ username: decoded.username });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        req.authUser = {
            ...serializeUserForClient(user),
        };
        next();
    } catch (error) {
        console.error('Session verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized.' });
    }
};

const parseCookieHeader = (cookieHeader = '') => {
    if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) return {};
    return cookieHeader.split(';').reduce((acc, part) => {
        const [rawKey, ...rawValueParts] = String(part).split('=');
        const key = rawKey ? rawKey.trim() : '';
        if (!key) return acc;
        const value = rawValueParts.join('=').trim();
        acc[key] = decodeURIComponent(value || '');
        return acc;
    }, {});
};

const getSessionUserFromToken = async (token) => {
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await usersCollection.findOne({ username: decoded.username });
    if (!user) return null;
    return {
        ...serializeUserForClient(user),
    };
};

const getMatchRoom = (matchId) => {
    const key = typeof matchId === 'string' ? matchId.trim() : '';
    if (!key) return null;
    if (!matchSocketRooms.has(key)) {
        matchSocketRooms.set(key, new Set());
    }
    return matchSocketRooms.get(key);
};

const removeSocketFromRoom = (ws) => {
    if (!ws || !ws.matchId) return;
    const room = matchSocketRooms.get(ws.matchId);
    if (!room) return;
    room.delete(ws);
    if (room.size === 0) {
        matchSocketRooms.delete(ws.matchId);
    }
};

const sendJsonToSocket = (ws, payload) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(JSON.stringify(payload));
        return true;
    } catch (error) {
        return false;
    }
};

const normalizeMatchChatText = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, MATCH_CHAT_MAX_LENGTH);
};

const broadcastMatchChatMessage = async (ws, rawText) => {
    if (!ws?.matchId || !ws?.username) return;
    const now = Date.now();
    if (ws.lastMatchChatAt && now - ws.lastMatchChatAt < MATCH_CHAT_MIN_INTERVAL_MS) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'Slow down before sending another message.' },
        });
        return;
    }
    const text = normalizeMatchChatText(rawText);
    if (!text) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'Enter a message first.' },
        });
        return;
    }
    const match = await matchesCollection.findOne(
        { matchId: ws.matchId },
        { projection: { matchId: 1, status: 1, players: 1 } }
    );
    if (!match || match.status === 'ended' || !Array.isArray(match.players)) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'Chat is closed for this match.' },
        });
        return;
    }
    const playerEntry = match.players.find((player) => player?.username === ws.username);
    if (!playerEntry) {
        sendJsonToSocket(ws, {
            type: 'chat_error',
            payload: { error: 'You are not part of this match.' },
        });
        return;
    }
    ws.lastMatchChatAt = now;
    const payload = {
        id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
        matchId: ws.matchId,
        username: ws.username,
        displayName: getPlayerDisplayName(playerEntry),
        text,
        sentAt: new Date(now).toISOString(),
    };
    const room = getMatchRoom(ws.matchId);
    room.forEach((client) => {
        if (!client || client.readyState !== WebSocket.OPEN) {
            removeSocketFromRoom(client);
            return;
        }
        sendJsonToSocket(client, { type: 'chat_message', payload });
    });
};

const cloneSerializable = (value) => {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const CLIENT_SAFE_STATUS_METADATA_KEYS = new Set([
    '_destructibleDefenseRestoreTurnsLeft',
    'banished',
    'bloodlineCostIncrease',
    'bloodlineCostReduction',
    'cannotUseHarmfulSkills',
    'cannotUseNonMentalSkills',
    'cannotUseSkillClasses',
    'cannotUseSkillIndices',
    'cannotUseSkills',
    'DamageDebuff',
    'destructibleDefenseRestore',
    'effectiveCharacterId',
    'evadeAgainstNonMental',
    'evadeChancePercent',
    'evadedSkillName',
    'evadedSourceName',
    'facePictureOverride',
    'genjutsuCostIncrease',
    'genjutsuCostReduction',
    'hulkRage',
    'ignoreAfflictionDamage',
    'NonAfflictionDamageDebuff',
    'ninjutsuCostIncrease',
    'ninjutsuCostReduction',
    'nonMentalRandomCostIncrease',
    'overrideAllSkillsToAllRandom',
    'overrideAllSkillsToAllRandomSkillIdsAny',
    'onOwnerUseSkillApplyStatusToEnemies',
    'randomCostIncrease',
    'randomCostReduction',
    'skillCostOverridesByRemainingTurns',
    'skillCostOverridesBySkillId',
    'skillDamageBonuses',
    'skillReplacements',
    'skillReplacementsByRemainingTurns',
    'skillReplacementsRequireSourceSkillId',
    'sourceSkillName',
    'stackMetadataKey',
    'stackDerivedNumericKeys',
    'taijutsuCostIncrease',
    'taijutsuCostReduction',
    'tooltipText',
    'tooltipTextTemplate',
    'currentUnpierceableDamageReduction',
    'currentUnpierceableDamageReductionFlat',
    'unpierceableDamageReductionFlatPerStatusMetadataAmount',
    'unpierceableDamageReductionFlatPerStatusMetadataKey',
    'unpierceableDamageReductionFlatPerStatusMetadataStep',
    'turnEndDamage',
    'turnEndApplyStatusToAllies',
    'turnEndApplyStatusToEnemies',
]);

const extractTooltipPlaceholderKeys = (template) => {
    if (typeof template !== 'string' || !template) return [];
    const matches = template.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
    return Array.from(new Set(Array.from(matches, (match) => match[1]).filter(Boolean)));
};

const sanitizeStatusMetadataForClient = (metadata = {}) => {
    if (!metadata || typeof metadata !== 'object') return {};
    const sanitized = {};
    const safeKeys = new Set(CLIENT_SAFE_STATUS_METADATA_KEYS);
    extractTooltipPlaceholderKeys(metadata.tooltipTextTemplate).forEach((key) => safeKeys.add(key));
    extractTooltipPlaceholderKeys(
        metadata?.destructibleDefenseRestore?.pendingTooltipTextTemplate
    ).forEach((key) => safeKeys.add(key));
    safeKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            sanitized[key] = cloneSerializable(metadata[key]);
        }
    });
    return sanitized;
};

const shouldHideStatusFromViewer = ({ status, unitUsername, viewerUsername }) => {
    const metadata = status?.metadata || {};
    if (Boolean(metadata.hideTooltip)) {
        return true;
    }
    if (viewerUsername !== unitUsername && Boolean(metadata.hideTooltipFromEnemy)) {
        return true;
    }
    if (
        viewerUsername === unitUsername &&
        (Boolean(metadata.hideTooltipFromOwner) || Boolean(metadata.hideTooltipFromUnitOwner))
    ) {
        return true;
    }
    return false;
};

const sanitizeStatusForViewer = ({ status, unitUsername, viewerUsername }) => {
    if (!status || typeof status !== 'object') return null;
    if (shouldHideStatusFromViewer({ status, unitUsername, viewerUsername })) {
        return null;
    }
    return {
        id: typeof status.id === 'string' ? status.id : '',
        remainingTurns: Math.max(0, Number(status.remainingTurns) || 0),
        sourceSkillId: typeof status.sourceSkillId === 'string' ? status.sourceSkillId : null,
        metadata: sanitizeStatusMetadataForClient(status.metadata),
    };
};

const sanitizeUnitStateForViewer = ({ unit, unitUsername, viewerUsername }) => {
    const statuses = Array.isArray(unit?.state?.statuses)
        ? unit.state.statuses
              .map((status) => sanitizeStatusForViewer({ status, unitUsername, viewerUsername }))
              .filter(Boolean)
        : [];
    const state = { statuses };
    if (unitUsername === viewerUsername) {
        state.cooldowns =
            unit?.state?.cooldowns && typeof unit.state.cooldowns === 'object'
                ? cloneSerializable(unit.state.cooldowns)
                : {};
        state.skillUses =
            unit?.state?.skillUses && typeof unit.state.skillUses === 'object'
                ? cloneSerializable(unit.state.skillUses)
                : {};
    }
    return state;
};

const sanitizeBoardForViewer = (board, viewerUsername) => {
    if (!board || typeof board !== 'object' || !viewerUsername) return null;
    return Object.fromEntries(
        Object.entries(board).map(([unitUsername, units]) => [
            unitUsername,
            Array.isArray(units)
                ? units.map((unit) => ({
                      slot: Number.isInteger(unit?.slot) ? unit.slot : null,
                      rosterIndex: Number.isInteger(unit?.rosterIndex) ? unit.rosterIndex : null,
                      alive: unit?.alive !== false,
                      hp: Number.isFinite(Number(unit?.hp)) ? Number(unit.hp) : 0,
                      state: sanitizeUnitStateForViewer({ unit, unitUsername, viewerUsername }),
                  }))
                : [],
        ])
    );
};

const sanitizeChakraPoolsForViewer = (chakraPools, viewerUsername) => {
    if (!chakraPools || typeof chakraPools !== 'object' || !viewerUsername) return null;
    const ownPool =
        chakraPools?.[viewerUsername] && typeof chakraPools[viewerUsername] === 'object'
            ? cloneSerializable(chakraPools[viewerUsername])
            : null;
    return ownPool ? { [viewerUsername]: ownPool } : null;
};

const sanitizeLastChakraGainForViewer = (lastChakraGain, viewerUsername) => {
    if (!lastChakraGain || typeof lastChakraGain !== 'object' || !viewerUsername) return null;
    const ownGain =
        lastChakraGain?.[viewerUsername] && typeof lastChakraGain[viewerUsername] === 'object'
            ? cloneSerializable(lastChakraGain[viewerUsername])
            : null;
    return ownGain ? { [viewerUsername]: ownGain } : null;
};

const buildMatchPayloadForUser = (match, username) => {
    if (!match || !username) return null;
    const playerEntry = Array.isArray(match.players)
        ? match.players.find((player) => player?.username === username) || null
        : null;
    if (!playerEntry) return null;
    const opponentEntry = Array.isArray(match.players)
        ? match.players.find((player) => player?.username !== username) || null
        : null;
    return {
        ok: true,
        matchId: match.matchId || null,
        mode: match.mode || 'quick',
        status: match.status || 'active',
        winner: match.winner || null,
        surrenderedBy: match.surrenderedBy || null,
        endReason: match.endReason || null,
        endedAt: match.endedAt || null,
        player: playerEntry,
        opponent: opponentEntry,
        currentTurn: match.currentTurn || null,
        turnOrder: match.turnOrder || null,
        turnStartedAt: match.turnStartedAt || null,
        turnExpiresAt: match.turnExpiresAt || null,
        turnDurationMs: getTurnDurationMsForUser(match, match?.currentTurn),
        board: sanitizeBoardForViewer(match.board, username),
        chakraPools: sanitizeChakraPoolsForViewer(match.chakraPools, username),
        lastChakraGain: sanitizeLastChakraGainForViewer(match.economy?.lastChakraGain, username),
        pendingTurn: getPendingTurn(match, username),
        ladderResult: match.ladderResults?.[username] || null,
        backgroundOverride:
            typeof match.backgroundOverride === 'string' && match.backgroundOverride.trim()
                ? match.backgroundOverride.trim()
                : '',
        pveBattle:
            match.pveBattle && typeof match.pveBattle === 'object'
                ? cloneSerializable(match.pveBattle)
                : null,
    };
};

const hydrateMatchForBroadcast = async (matchOrMatchId) => {
    const match =
        typeof matchOrMatchId === 'string'
            ? await matchesCollection.findOne({ matchId: matchOrMatchId })
            : matchOrMatchId;
    if (!match) return null;
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    return autoAdvanceTurnIfExpired(hydratedBoard);
};

const broadcastMatchState = async (matchOrMatchId) => {
    const hydrated = await hydrateMatchForBroadcast(matchOrMatchId);
    if (!hydrated || !Array.isArray(hydrated.players) || hydrated.players.length === 0) {
        return null;
    }
    scheduleBattleBotTurn(hydrated);
    const room = getMatchRoom(hydrated.matchId);
    if (!room || room.size === 0) {
        return hydrated;
    }
    room.forEach((ws) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            removeSocketFromRoom(ws);
            return;
        }
        const payload = buildMatchPayloadForUser(hydrated, ws.username);
        if (payload) {
            sendJsonToSocket(ws, { type: 'match_state', payload });
        }
    });
    return hydrated;
};

const queueMatchStateBroadcast = (matchOrMatchId) => {
    broadcastMatchState(matchOrMatchId).catch((error) => {
        console.warn('Failed to broadcast match state:', error);
    });
};

const sweepExpiredMatches = async () => {
    if (!matchesCollection) return;
    const now = new Date();
    const expiredMatches = await matchesCollection
        .find(
            {
                status: { $ne: 'ended' },
                turnExpiresAt: { $lte: now },
            },
            { projection: { matchId: 1 } }
        )
        .toArray();
    for (const entry of expiredMatches) {
        const matchId = typeof entry?.matchId === 'string' ? entry.matchId : '';
        if (!matchId) continue;
        await broadcastMatchState(matchId);
    }
};

const attachWebSocketSupport = (server) => {
    if (!server || typeof server.on !== 'function') return;
    server.on('upgrade', async (req, socket, head) => {
        try {
            const requestUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            if (requestUrl.pathname !== '/ws') {
                socket.destroy();
                return;
            }
            const matchId = String(requestUrl.searchParams.get('matchId') || '').trim();
            if (!matchId) {
                socket.destroy();
                return;
            }
            const cookies = parseCookieHeader(req.headers.cookie || '');
            const token = cookies[SESSION_COOKIE_NAME];
            const authUser = await getSessionUserFromToken(token);
            if (!authUser?.username) {
                socket.destroy();
                return;
            }
            const match = await matchesCollection.findOne({ matchId });
            if (!match || !Array.isArray(match.players)) {
                socket.destroy();
                return;
            }
            const playerEntry = match.players.find((player) => player?.username === authUser.username);
            if (!playerEntry) {
                socket.destroy();
                return;
            }
            wsServer.handleUpgrade(req, socket, head, (ws) => {
                ws.matchId = matchId;
                ws.username = authUser.username;
                ws.authUser = authUser;
                const room = getMatchRoom(matchId);
                room.add(ws);
                wsConnections.add(ws);
                ws.on('close', () => {
                    wsConnections.delete(ws);
                    removeSocketFromRoom(ws);
                });
                ws.on('error', () => {
                    wsConnections.delete(ws);
                    removeSocketFromRoom(ws);
                });
                ws.on('message', (rawMessage) => {
                    let message = null;
                    try {
                        message = JSON.parse(String(rawMessage || ''));
                    } catch (error) {
                        return;
                    }
                    if (message?.type === 'chat_message') {
                        broadcastMatchChatMessage(ws, message?.payload?.text).catch((error) => {
                            console.warn('Failed to broadcast match chat message:', error);
                            sendJsonToSocket(ws, {
                                type: 'chat_error',
                                payload: { error: 'Unable to send chat message.' },
                            });
                        });
                    }
                });
                wsServer.emit('connection', ws, req);
            });
        } catch (error) {
            socket.destroy();
        }
    });
};

wsServer.on('connection', async (ws) => {
    if (!ws?.matchId || !ws?.username) {
        try {
            ws.close();
        } catch (error) {
            // Ignore close failures.
        }
        return;
    }
    try {
        const hydrated = await hydrateMatchForBroadcast(ws.matchId);
        if (!hydrated) {
            ws.close();
            return;
        }
        const payload = buildMatchPayloadForUser(hydrated, ws.username);
        if (payload) {
            sendJsonToSocket(ws, { type: 'match_state', payload });
        }
    } catch (error) {
        try {
            ws.close();
        } catch (closeError) {
            // Ignore close failures.
        }
    }
});

// In-memory matchmaking queues (demo)
let quickQueue = [];
let ladderQueue = [];
let privateQueue = [];
const quickMatches = new Map(); // matchId -> { players, createdAt }
const userToMatch = new Map(); // username -> { matchId, opponent }
const draftSessions = new Map(); // draftId -> draft state
const userToDraft = new Map(); // username -> draftId
const DRAFT_BAN_COUNT = 5;
const DRAFT_TEAM_SIZE = 3;
const DRAFT_PHASE_DURATION_MS = 60 * 1000;

const chakraTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];

const createEmptyChakraPool = () => ({
    taijutsu: 0,
    ninjutsu: 0,
    bloodline: 0,
    genjutsu: 0,
});

const createEmptyChakraCost = () => ({
    taijutsu: 0,
    ninjutsu: 0,
    bloodline: 0,
    genjutsu: 0,
});

const getTotalChakra = (pool = {}) =>
    chakraTypes.reduce((sum, type) => sum + (Number(pool[type]) || 0), 0);

const normalizeEnergyCost = (energy = []) => {
    const reservedSpecific = createEmptyChakraCost();
    let requiredRandom = 0;
    (Array.isArray(energy) ? energy : []).forEach((entry) => {
        const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
        if (normalized === 'random') {
            requiredRandom += 1;
            return;
        }
        if (Object.prototype.hasOwnProperty.call(reservedSpecific, normalized)) {
            reservedSpecific[normalized] += 1;
        }
    });
    return { reservedSpecific, requiredRandom };
};

const createGameBotUsername = (seed = '') =>
    `${GAME_BOT_USERNAME_PREFIX}${String(seed || Date.now()).replace(/[^a-z0-9_-]+/gi, '').toLowerCase()}`;

const getQueueForMode = (mode = 'quick') => {
    if (mode === 'ladder') return ladderQueue;
    if (mode === 'private') return privateQueue;
    return quickQueue;
};

const setQueueForMode = (mode = 'quick', nextQueue = []) => {
    if (mode === 'ladder') {
        ladderQueue = nextQueue;
        return;
    }
    if (mode === 'private') {
        privateQueue = nextQueue;
        return;
    }
    quickQueue = nextQueue;
};

const findQueuedEntry = (username, mode = null) => {
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const queues = mode ? [mode] : ['quick', 'ladder', 'private'];
    for (const queueMode of queues) {
        const queue = getQueueForMode(queueMode);
        const entry = queue.find(
            (item) =>
                typeof item?.username === 'string' &&
                item.username.trim().toLowerCase() === normalizedUsername
        );
        if (entry) {
            return { mode: queueMode, entry };
        }
    }
    return null;
};

const removeQueuedEntry = (username, mode = null) => {
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const queues = mode ? [mode] : ['quick', 'ladder', 'private'];
    queues.forEach((queueMode) => {
        setQueueForMode(
            queueMode,
            getQueueForMode(queueMode).filter(
                (entry) =>
                    typeof entry?.username !== 'string' ||
                    entry.username.trim().toLowerCase() !== normalizedUsername
            )
        );
    });
};

const getCharacterSpecificChakraProfile = (character = {}) => {
    const specificCounts = createEmptyChakraCost();
    let randomCount = 0;
    const skills = Array.isArray(character?.skills) ? character.skills : [];
    skills.forEach((skill) => {
        const costs = Array.isArray(skill?.energy) ? skill.energy : [];
        costs.forEach((entry) => {
            const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
            if (normalized === 'random') {
                randomCount += 1;
                return;
            }
            if (Object.prototype.hasOwnProperty.call(specificCounts, normalized)) {
                specificCounts[normalized] += 1;
            }
        });
    });
    const dominantType = chakraTypes.reduce((best, type) => {
        if ((specificCounts[type] || 0) > (specificCounts[best] || 0)) {
            return type;
        }
        return best;
    }, chakraTypes[0]);
    const specificTotal = chakraTypes.reduce((sum, type) => sum + (specificCounts[type] || 0), 0);
    const diversity = chakraTypes.filter((type) => (specificCounts[type] || 0) > 0).length;
    return {
        specificCounts,
        dominantType: specificTotal > 0 ? dominantType : '',
        specificTotal,
        diversity,
        randomCount,
    };
};

const shuffleList = (items = []) => {
    const next = Array.isArray(items) ? items.slice() : [];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = next[index];
        next[index] = next[swapIndex];
        next[swapIndex] = temp;
    }
    return next;
};

const buildBattleBotTeam = () => {
    const candidates = shuffleList(
        (Array.isArray(charactersData) ? charactersData : [])
            .map((character, rosterIndex) => ({
                rosterIndex,
                character,
                profile: getCharacterSpecificChakraProfile(character),
            }))
            .filter(
                (entry) =>
                    entry.character &&
                    typeof entry.character.characterId === 'string' &&
                    Array.isArray(entry.character.skills) &&
                    entry.character.skills.length > 0
            )
    );
    const selected = [];
    const usedDominantTypes = new Set();

    candidates.forEach((entry) => {
        if (selected.length >= 3) return;
        const dominantType = entry.profile.dominantType;
        if (!dominantType || usedDominantTypes.has(dominantType)) {
            return;
        }
        selected.push(entry);
        usedDominantTypes.add(dominantType);
    });

    const fallbackPool = candidates
        .filter((entry) => !selected.some((picked) => picked.rosterIndex === entry.rosterIndex))
        .sort((left, right) => {
            const leftScore = left.profile.diversity * 10 + left.profile.randomCount + left.profile.specificTotal;
            const rightScore =
                right.profile.diversity * 10 + right.profile.randomCount + right.profile.specificTotal;
            return rightScore - leftScore;
        });
    while (selected.length < 3 && fallbackPool.length > 0) {
        selected.push(fallbackPool.shift());
    }

    return selected.slice(0, 3).map((entry) => entry.rosterIndex);
};

const getPlayableRosterIndices = () =>
    (Array.isArray(charactersData) ? charactersData : [])
        .map((character, rosterIndex) => ({ character, rosterIndex }))
        .filter(
            (entry) =>
                entry.character &&
                typeof entry.character.characterId === 'string' &&
                Array.isArray(entry.character.skills) &&
                entry.character.skills.length > 0
        )
        .map((entry) => entry.rosterIndex);

const normalizeDraftBans = (bans = []) => {
    const validRoster = new Set(getPlayableRosterIndices());
    const seen = new Set();
    return (Array.isArray(bans) ? bans : [])
        .map((slot) => Number.parseInt(slot, 10))
        .filter((slot) => {
            if (!Number.isInteger(slot) || !validRoster.has(slot) || seen.has(slot)) return false;
            seen.add(slot);
            return true;
        })
        .slice(0, DRAFT_BAN_COUNT);
};

const normalizeDraftTeam = (team = [], bannedSet = new Set()) => {
    const validRoster = new Set(getPlayableRosterIndices());
    const seen = new Set();
    return (Array.isArray(team) ? team : [])
        .map((slot) => Number.parseInt(slot, 10))
        .filter((slot) => {
            if (
                !Number.isInteger(slot) ||
                !validRoster.has(slot) ||
                bannedSet.has(slot) ||
                seen.has(slot)
            ) {
                return false;
            }
            seen.add(slot);
            return true;
        })
        .slice(0, DRAFT_TEAM_SIZE);
};

const pickRandomDraftBans = () => shuffleList(getPlayableRosterIndices()).slice(0, DRAFT_BAN_COUNT);

const pickRandomDraftTeam = (bannedSet = new Set()) =>
    shuffleList(getPlayableRosterIndices().filter((slot) => !bannedSet.has(slot))).slice(0, DRAFT_TEAM_SIZE);

const makeEmptyPendingTurn = () => ({
    queuedByActorSlot: {},
    queueOrder: [],
    unresolvedRandom: 0,
    randomAssignments: createEmptyChakraCost(),
    turnStartChoice: null,
});

const clonePendingTurn = (pending = {}) => ({
    queuedByActorSlot:
        pending && typeof pending.queuedByActorSlot === 'object' ? { ...pending.queuedByActorSlot } : {},
    queueOrder: Array.isArray(pending?.queueOrder)
        ? pending.queueOrder
              .map((slot) => Number.parseInt(slot, 10))
              .filter((slot) => Number.isInteger(slot) && slot >= 0)
        : [],
    unresolvedRandom: Number.isInteger(pending?.unresolvedRandom) ? pending.unresolvedRandom : 0,
    randomAssignments: {
        ...createEmptyChakraCost(),
        ...(pending && typeof pending.randomAssignments === 'object' ? pending.randomAssignments : {}),
    },
    turnStartChoice:
        pending?.turnStartChoice && typeof pending.turnStartChoice === 'object'
            ? {
                  actorSlot: Number.isInteger(pending.turnStartChoice.actorSlot)
                      ? pending.turnStartChoice.actorSlot
                      : null,
                  sourceSkillId:
                      typeof pending.turnStartChoice.sourceSkillId === 'string'
                          ? pending.turnStartChoice.sourceSkillId
                          : null,
                  sourceUsername:
                      typeof pending.turnStartChoice.sourceUsername === 'string'
                          ? pending.turnStartChoice.sourceUsername
                          : null,
                  sourceSlot: Number.isInteger(pending.turnStartChoice.sourceSlot)
                      ? pending.turnStartChoice.sourceSlot
                      : null,
                  sourceStatusId:
                      typeof pending.turnStartChoice.sourceStatusId === 'string'
                          ? pending.turnStartChoice.sourceStatusId
                          : null,
                  promptText:
                      typeof pending.turnStartChoice.promptText === 'string'
                          ? pending.turnStartChoice.promptText
                          : '',
                  options: Array.isArray(pending.turnStartChoice.options)
                      ? pending.turnStartChoice.options
                            .map((option) => {
                                if (!option || typeof option !== 'object') return null;
                                const key =
                                    typeof option.key === 'string' ? option.key.trim().toLowerCase() : '';
                                const label =
                                    typeof option.label === 'string' ? option.label.trim() : '';
                                if (!key || !label) return null;
                                return {
                                    key,
                                    label,
                                    targetStrategy:
                                        typeof option.targetStrategy === 'string'
                                            ? option.targetStrategy.trim().toLowerCase()
                                            : '',
                                    effect:
                                        option.effect && typeof option.effect === 'object'
                                            ? { ...option.effect }
                                            : null,
                                };
                            })
                            .filter(Boolean)
                      : [],
                  maxUses: Number.isInteger(pending.turnStartChoice.maxUses)
                      ? pending.turnStartChoice.maxUses
                      : 0,
                  usesUsed: Number.isInteger(pending.turnStartChoice.usesUsed)
                      ? pending.turnStartChoice.usesUsed
                      : 0,
              }
            : null,
});

const clampPendingTurnRandom = (pendingTurn, pool) => {
    const next = clonePendingTurn(pendingTurn);
    const queuedKeys = new Set(Object.keys(next.queuedByActorSlot || {}));
    const normalizedOrder = [];
    next.queueOrder.forEach((slot) => {
        const key = String(slot);
        if (!queuedKeys.has(key)) return;
        if (normalizedOrder.includes(slot)) return;
        normalizedOrder.push(slot);
    });
    Object.keys(next.queuedByActorSlot || {}).forEach((slotKey) => {
        const slot = Number.parseInt(slotKey, 10);
        if (!Number.isInteger(slot)) return;
        if (!normalizedOrder.includes(slot)) {
            normalizedOrder.push(slot);
        }
    });
    next.queueOrder = normalizedOrder;
    chakraTypes.forEach((type) => {
        next.randomAssignments[type] = Math.max(0, Number(next.randomAssignments[type]) || 0);
    });
    const queued = next.queuedByActorSlot && typeof next.queuedByActorSlot === 'object'
        ? Object.values(next.queuedByActorSlot)
        : [];
    const requiredFromQueue = queued.reduce((sum, item) => sum + (Number(item?.requiredRandom) || 0), 0);
    let assigned = getTotalChakra(next.randomAssignments);
    let overAssigned = Math.max(0, assigned - requiredFromQueue);
    if (overAssigned > 0) {
        chakraTypes.forEach((type) => {
            if (overAssigned <= 0) return;
            const used = Math.min(next.randomAssignments[type], overAssigned);
            if (used <= 0) return;
            next.randomAssignments[type] -= used;
            if (pool && Object.prototype.hasOwnProperty.call(pool, type)) {
                pool[type] = (Number(pool[type]) || 0) + used;
            }
            overAssigned -= used;
        });
        assigned = getTotalChakra(next.randomAssignments);
    }
    next.unresolvedRandom = Math.max(0, requiredFromQueue - assigned);
    return next;
};

const pickInitialTurn = (players = []) => {
    const uniquePlayers = Array.from(new Set(players.filter(Boolean)));
    for (let i = uniquePlayers.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniquePlayers[i], uniquePlayers[j]] = [uniquePlayers[j], uniquePlayers[i]];
    }
    const turnOrder = uniquePlayers.slice(0, 2);
    return { turnOrder, currentTurn: turnOrder[0] || null };
};

const generateRandomChakra = (count = 0) => {
    const gains = [];
    for (let i = 0; i < count; i += 1) {
        const pick = chakraTypes[Math.floor(Math.random() * chakraTypes.length)];
        gains.push(pick);
    }
    return gains;
};

const applyChakraGain = (pool, gains = []) => {
    const updated = { ...pool };
    gains.forEach((type) => {
        if (updated[type] !== undefined) {
            updated[type] += 1;
        }
    });
    return updated;
};

const getTurnDurationMsForUser = (match, username) => {
    if (!match || !username) return TURN_DURATION_MS;
    const collectTeamMetadataSum = (targetUsername, metadataKey) => {
        if (!targetUsername || !metadataKey) return 0;
        const units = Array.isArray(match.board?.[targetUsername]) ? match.board[targetUsername] : [];
        return units.reduce((teamTotal, unit, slot) => {
            if (!unit || unit.alive === false) return teamTotal;
            const state = battleLogic.getUnitState(match, targetUsername, slot);
            const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
            const unitTotal = statuses.reduce((statusTotal, status) => {
                const remaining = Number(status?.remainingTurns) || 0;
                if (remaining <= 0) return statusTotal;
                return statusTotal + (Number(status?.metadata?.[metadataKey]) || 0);
            }, 0);
            return teamTotal + unitTotal;
        }, 0);
    };

    const opponentUsername =
        (Array.isArray(match.players) ? match.players : []).find((player) => player?.username && player.username !== username)
            ?.username || null;
    const bonusMs = collectTeamMetadataSum(username, 'ownTurnDurationBonusMs');
    const penaltyMs = opponentUsername ? collectTeamMetadataSum(opponentUsername, 'enemyTurnDurationPenaltyMs') : 0;
    return Math.max(10000, TURN_DURATION_MS + bonusMs - penaltyMs);
};

const initializeEconomyState = (players, currentTurn, aliveLookup = {}) => {
    const chakraPools = {};
    const economy = {
        turnCounts: {},
        startGranted: {},
        lastChakraGain: {},
    };

    players.forEach((username) => {
        chakraPools[username] = createEmptyChakraPool();
        economy.turnCounts[username] = 0;
        economy.startGranted[username] = false;
        economy.lastChakraGain[username] = [];
    });

    if (currentTurn && chakraPools[currentTurn]) {
        const gains = generateRandomChakra(1);
        chakraPools[currentTurn] = applyChakraGain(chakraPools[currentTurn], gains);
        economy.startGranted[currentTurn] = true;
        economy.lastChakraGain[currentTurn] = gains;
    }

    return {
        chakraPools,
        economy,
        turnExpiresAt: new Date(Date.now() + getTurnDurationMsForUser({ players, board: {} }, currentTurn)),
    };
};

const buildMatch = (players, aliveLookup = {}, options = {}) => {
    const { turnOrder, currentTurn } = pickInitialTurn(players);
    const matchId = options.matchId || `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const matchStartsAt = new Date(Date.now() + MATCH_FOUND_HOLD_MS);
    const { chakraPools, economy, turnExpiresAt } = initializeEconomyState(
        players,
        currentTurn,
        aliveLookup
    );
    const delayedTurnExpiry = turnExpiresAt
        ? new Date(new Date(turnExpiresAt).getTime() + MATCH_FOUND_HOLD_MS)
        : matchStartsAt;
    const turnStartedAt = matchStartsAt;
    quickMatches.set(matchId, {
        players,
        createdAt: new Date(),
        matchStartsAt,
        turnOrder,
        currentTurn,
        turnStartedAt,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt: delayedTurnExpiry,
    });
    players.forEach((p) => {
        const opponent = players.find((x) => x !== p) || null;
        if (!isGameBotUsername(p)) {
            userToMatch.set(p, {
                matchId,
                opponent: isGameBotUsername(opponent) ? GAME_BOT_DISPLAY_NAME : opponent,
            });
        }
    });
    return {
        matchId,
        matchStartsAt,
        turnOrder,
        currentTurn,
        turnStartedAt,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt: delayedTurnExpiry,
    };
};

const enqueuePlayer = (entry) => {
    if (!isValidTeamSelectionForMatch(entry?.team)) {
        return;
    }
    quickQueue = quickQueue.filter((u) => u.username !== entry.username);
    ladderQueue = ladderQueue.filter((u) => u.username !== entry.username);
    privateQueue = privateQueue.filter((u) => u.username !== entry.username);
    if (entry.mode === 'private') {
        privateQueue.push(entry);
        return;
    }
    if (entry.mode === 'ladder') {
        ladderQueue.push(entry);
        return;
    }
    quickQueue.push(entry);
};

const dequeueOpponent = (username, mode = 'quick', draftMode = false) => {
    const wantsDraft = Boolean(draftMode);
    const queue = (mode === 'ladder' ? ladderQueue : quickQueue).filter((entry) =>
        isValidTeamSelectionForMatch(entry?.team) && Boolean(entry?.draftMode) === wantsDraft
    );
    if (mode === 'ladder') {
        ladderQueue = queue;
    } else {
        quickQueue = queue;
    }
    const opponent = queue.find((u) => u.username !== username);
    if (!opponent) return null;
    if (mode === 'ladder') {
        ladderQueue = ladderQueue.filter((u) => u.username !== opponent.username);
    } else {
        quickQueue = quickQueue.filter((u) => u.username !== opponent.username);
    }
    return opponent;
};

const createBattleBotPlayer = ({ matchId, team, ladderLevel = 1 }) => ({
    username: createGameBotUsername(matchId),
    displayName: GAME_BOT_DISPLAY_NAME,
    isBot: true,
    team,
    aliveCount: Array.isArray(team) ? team.length : 3,
    ladderLevel: Math.max(1, Number(ladderLevel) || 1),
});

const buildBattleBotMatch = async ({ username, team, mode, playerProfile }) => {
    const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const botPlayer = createBattleBotPlayer({
        matchId,
        team: buildBattleBotTeam(),
        ladderLevel: Number(playerProfile?.ladder?.level) || 1,
    });
    const aliveLookup = {
        [username]: Array.isArray(team) ? team.length : 3,
        [botPlayer.username]: Array.isArray(botPlayer.team) ? botPlayer.team.length : 3,
    };
    const built = buildMatch([username, botPlayer.username], aliveLookup, { matchId });
    const playerDocs = [
        {
            username,
            team,
            aliveCount: aliveLookup[username],
        },
        botPlayer,
    ];
    const board = battleLogic.buildInitialBoard(playerDocs);
    const matchDocument = {
        matchId: built.matchId,
        mode,
        status: 'active',
        createdAt: new Date(),
        matchStartsAt: built.matchStartsAt,
        chakraPools: built.chakraPools,
        economy: built.economy,
        pendingTurns: built.pendingTurns,
        currentTurn: built.currentTurn,
        turnStartedAt: built.turnStartedAt,
        turnOrder: built.turnOrder,
        turnExpiresAt: built.turnExpiresAt,
        board,
        players: playerDocs,
        botMatch: {
            enabled: true,
            displayName: GAME_BOT_DISPLAY_NAME,
        },
    };
    await matchesCollection.insertOne(matchDocument);
    return matchDocument;
};

const createMatchDocumentFromTeams = async ({ mode, players, botMatch = null, extraFields = null }) => {
    const aliveLookup = Object.fromEntries(
        players.map((player) => [
            player.username,
            Array.isArray(player.team) ? player.team.length : DRAFT_TEAM_SIZE,
        ])
    );
    const built = buildMatch(players.map((player) => player.username), aliveLookup);
    const playerDocs = players.map((player) => ({
        ...player,
        aliveCount: aliveLookup[player.username],
    }));
    const board = battleLogic.buildInitialBoard(playerDocs);
    const matchDocument = {
        matchId: built.matchId,
        mode,
        status: 'active',
        createdAt: new Date(),
        matchStartsAt: built.matchStartsAt,
        chakraPools: built.chakraPools,
        economy: built.economy,
        pendingTurns: built.pendingTurns,
        currentTurn: built.currentTurn,
        turnStartedAt: built.turnStartedAt,
        turnOrder: built.turnOrder,
        turnExpiresAt: built.turnExpiresAt,
        board,
        players: playerDocs,
    };
    if (extraFields && typeof extraFields === 'object') {
        Object.assign(matchDocument, cloneSerializable(extraFields));
    }
    if (botMatch) {
        matchDocument.botMatch = botMatch;
    }
    await matchesCollection.insertOne(matchDocument);
    return matchDocument;
};

const maybeCreateBattleBotMatch = async ({ username, mode, userProfile = null }) => {
    if (!BATTLE_BOTS_ENABLED || (mode !== 'quick' && mode !== 'ladder')) {
        return null;
    }
    const queued = findQueuedEntry(username, mode);
    if (!queued?.entry) {
        return null;
    }
    const queuedAtMs = new Date(queued.entry.queuedAt || Date.now()).getTime();
    if (Number.isNaN(queuedAtMs) || Date.now() - queuedAtMs < BATTLE_BOT_QUEUE_TIMEOUT_MS) {
        return null;
    }
    if (queued.entry.allowBattleBot === false) {
        return null;
    }
    if (!isValidTeamSelectionForMatch(queued.entry.team)) {
        removeQueuedEntry(username, mode);
        return null;
    }
    removeQueuedEntry(username, mode);
    if (queued.entry.draftMode) {
        const botPlayer = createBattleBotPlayer({
            matchId: `draft-bot-${Date.now()}`,
            team: buildBattleBotTeam(),
            ladderLevel: Number(userProfile?.ladder?.level) || 1,
        });
        return createDraftSession({
            mode,
            players: [
                {
                    ...queued.entry,
                    draftMode: true,
                },
                botPlayer,
            ],
        });
    }
    const matchDocument = await buildBattleBotMatch({
        username,
        team: queued.entry.team,
        mode,
        playerProfile: userProfile,
    });
    return matchDocument;
};

const getDraftOpponentName = (draft, username) => {
    const opponent = (draft?.players || []).find((player) => player.username !== username);
    if (!opponent) return null;
    return opponent.isBot ? GAME_BOT_DISPLAY_NAME : opponent.username;
};

const serializeDraftForUser = (draft, username) => {
    if (!draft) return null;
    const submitted = draft.submissions?.[username] || {};
    const opponentUsername = (draft.players || []).find((player) => player.username !== username)?.username || null;
    const opponentSubmitted = opponentUsername ? draft.submissions?.[opponentUsername] || {} : {};
    const bansRevealed = draft.phase !== 'ban';
    return {
        ok: true,
        draft: true,
        draftId: draft.draftId,
        mode: draft.mode,
        phase: draft.phase,
        opponent: getDraftOpponentName(draft, username),
        phaseEndsAt: draft.phaseEndsAt,
        banCount: DRAFT_BAN_COUNT,
        teamSize: DRAFT_TEAM_SIZE,
        myBans: Array.isArray(submitted.bans) ? submitted.bans : [],
        myTeam: Array.isArray(submitted.team) ? submitted.team : [],
        myBanSubmitted: Boolean(submitted.banSubmitted),
        myTeamSubmitted: Boolean(submitted.teamSubmitted),
        opponentBanSubmitted: Boolean(opponentSubmitted.banSubmitted),
        opponentTeamSubmitted: Boolean(opponentSubmitted.teamSubmitted),
        revealedBans: bansRevealed ? draft.revealedBans || [] : [],
        matchId: draft.matchId || null,
        matchStartsAt: draft.matchStartsAt || null,
        requeued: Boolean(draft.requeued?.[username]),
        failed: Boolean(draft.failed?.[username]),
        failureReason: draft.failureReason || '',
    };
};

const finishDraftWithFailure = (draft, failedUsernames = [], reason = 'Draft failed.') => {
    const failedSet = new Set(failedUsernames);
    draft.phase = 'failed';
    draft.failureReason = reason;
    draft.failed = {};
    draft.requeued = {};
    (draft.players || []).forEach((player) => {
        if (player.isBot) return;
        const submitted = draft.submissions?.[player.username] || {};
        if (failedSet.has(player.username)) {
            draft.failed[player.username] = true;
            removeQueuedEntry(player.username, draft.mode);
            return;
        }
        if (isValidTeamSelectionForMatch(submitted.team)) {
            enqueuePlayer({
                ...player,
                team: submitted.team,
                mode: draft.mode,
                draftMode: true,
                queuedAt: new Date(),
            });
            draft.requeued[player.username] = true;
        }
    });
};

const finishDraftWithMatch = async (draft) => {
    if (draft.phase === 'completed') return draft;
    const players = (draft.players || []).map((player) => ({
        ...player,
        team: draft.submissions?.[player.username]?.team || player.team,
    }));
    const matchDocument = await createMatchDocumentFromTeams({
        mode: draft.mode,
        players,
        botMatch: players.some((player) => player.isBot)
            ? { enabled: true, displayName: GAME_BOT_DISPLAY_NAME }
            : null,
    });
    draft.phase = 'completed';
    draft.matchId = matchDocument.matchId;
    draft.matchStartsAt = matchDocument.matchStartsAt;
    players.forEach((player) => {
        if (player.isBot) return;
        const opponent = players.find((entry) => entry.username !== player.username);
        userToMatch.set(player.username, {
            matchId: matchDocument.matchId,
            opponent: opponent?.isBot ? GAME_BOT_DISPLAY_NAME : opponent?.username || null,
        });
    });
    scheduleBattleBotTurn(matchDocument);
    return draft;
};

const advanceDraftIfNeeded = async (draft) => {
    if (!draft || draft.phase === 'completed' || draft.phase === 'failed') return draft;
    const now = Date.now();
    const players = draft.players || [];
    const allBanSubmitted = players.every((player) => draft.submissions?.[player.username]?.banSubmitted);
    if (draft.phase === 'ban' && (allBanSubmitted || new Date(draft.phaseEndsAt).getTime() <= now)) {
        const allBans = [];
        players.forEach((player) => {
            const submitted = draft.submissions?.[player.username] || {};
            submitted.bans = normalizeDraftBans(submitted.bans);
            submitted.banSubmitted = true;
            draft.submissions[player.username] = submitted;
            allBans.push(...submitted.bans);
        });
        draft.revealedBans = Array.from(new Set(allBans));
        draft.phase = 'pick';
        draft.phaseEndsAt = new Date(Date.now() + DRAFT_PHASE_DURATION_MS);
        const bannedSet = new Set(draft.revealedBans || []);
        players.forEach((player) => {
            if (!player.isBot) return;
            draft.submissions[player.username] = {
                ...(draft.submissions[player.username] || {}),
                team: pickRandomDraftTeam(bannedSet),
                teamSubmitted: true,
            };
        });
    }

    const allTeamSubmitted = players.every((player) => draft.submissions?.[player.username]?.teamSubmitted);
    if (draft.phase === 'pick' && (allTeamSubmitted || new Date(draft.phaseEndsAt).getTime() <= Date.now())) {
        const bannedSet = new Set(draft.revealedBans || []);
        const failed = [];
        players.forEach((player) => {
            const submitted = draft.submissions?.[player.username] || {};
            submitted.team = normalizeDraftTeam(submitted.team, bannedSet);
            if (submitted.team.length !== DRAFT_TEAM_SIZE) {
                failed.push(player.username);
            } else {
                submitted.teamSubmitted = true;
            }
            draft.submissions[player.username] = submitted;
        });
        if (failed.length > 0) {
            finishDraftWithFailure(draft, failed, 'A player did not select a valid team.');
            return draft;
        }
        await finishDraftWithMatch(draft);
    }
    return draft;
};

const createDraftSession = ({ mode, players }) => {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draft = {
        draftId,
        mode,
        players,
        phase: 'ban',
        phaseEndsAt: new Date(Date.now() + DRAFT_PHASE_DURATION_MS),
        createdAt: new Date(),
        submissions: {},
        revealedBans: [],
    };
    players.forEach((player) => {
        const bans = player.isBot ? pickRandomDraftBans() : [];
        draft.submissions[player.username] = {
            bans,
            banSubmitted: player.isBot,
            team: [],
            teamSubmitted: false,
        };
        if (!player.isBot) {
            userToDraft.set(player.username, draftId);
        }
    });
    draftSessions.set(draftId, draft);
    return draft;
};

const dequeuePrivateOpponent = (username, targetUsername) => {
    const normalizedTarget = typeof targetUsername === 'string' ? targetUsername.trim().toLowerCase() : '';
    if (!normalizedTarget) return null;
    privateQueue = privateQueue.filter((entry) => isValidTeamSelectionForMatch(entry?.team));
    const opponent = privateQueue.find((entry) => {
        const entryTarget = typeof entry?.targetUsername === 'string'
            ? entry.targetUsername.trim().toLowerCase()
            : '';
        return (
            entry.username !== username &&
            entry.username.toLowerCase() === normalizedTarget &&
            entryTarget === username.toLowerCase()
        );
    });
    if (!opponent) return null;
    privateQueue = privateQueue.filter((entry) => entry.username !== opponent.username);
    return opponent;
};

const getAliveCountForUser = (match, username) => {
    const playerEntry = (match.players || []).find((p) => p.username === username);
    if (playerEntry && Number.isInteger(playerEntry.aliveCount)) {
        return playerEntry.aliveCount;
    }
    if (Array.isArray(playerEntry?.team)) {
        return playerEntry.team.length;
    }
    return 0;
};

const getTeamStatusFlagCount = (match, username, flagName) => {
    if (!match || !username || !flagName) return 0;
    const units = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    let count = 0;
    units.forEach((unit, slot) => {
        if (!unit || unit.alive === false) return;
        const state = battleLogic.getUnitState(match, username, slot);
        const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
        statuses.forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining > 0 && Boolean(status?.metadata?.[flagName])) {
                count += 1;
            }
        });
    });
    return count;
};

const getTeamStatusMetadataSum = (match, username, metadataKey) => {
    if (!match || !username || !metadataKey) return 0;
    const units = Array.isArray(match.board?.[username]) ? match.board[username] : [];
    let total = 0;
    units.forEach((unit, slot) => {
        if (!unit || unit.alive === false) return;
        const state = battleLogic.getUnitState(match, username, slot);
        const statuses = Array.isArray(state?.statuses) ? state.statuses : [];
        statuses.forEach((status) => {
            const remaining = Number(status?.remainingTurns) || 0;
            if (remaining <= 0) return;
            total += Number(status?.metadata?.[metadataKey]) || 0;
        });
    });
    return Math.max(0, total);
};

const ensureMatchTurnData = async (match) => {
    if (!match || match.currentTurn) {
        return match;
    }
    const usernames = (match.players || []).map((p) => p.username).filter(Boolean);
    const { turnOrder, currentTurn } = pickInitialTurn(usernames);
    const turnStartedAt = new Date();
    const turnExpiresAt = new Date(Date.now() + getTurnDurationMsForUser(match, currentTurn));
    await matchesCollection.updateOne(
        { matchId: match.matchId },
        { $set: { currentTurn, turnOrder, turnStartedAt, turnExpiresAt } }
    );
    return { ...match, currentTurn, turnOrder, turnStartedAt, turnExpiresAt };
};

const ensureMatchEconomy = async (match) => {
    if (!match) return match;
    let changed = false;
    const usernames = (match.players || []).map((p) => p.username).filter(Boolean);

    if (!match.chakraPools || !match.economy) {
        const { chakraPools, economy, turnExpiresAt } = initializeEconomyState(
            usernames,
            match.currentTurn
        );
        match.chakraPools = chakraPools;
        match.economy = economy;
        match.turnStartedAt = match.turnStartedAt || new Date();
        match.turnExpiresAt = match.turnExpiresAt || turnExpiresAt;
        changed = true;
    } else {
        // Backfill missing users or keys
        match.chakraPools = match.chakraPools || {};
        match.economy.turnCounts = match.economy.turnCounts || {};
        match.economy.startGranted = match.economy.startGranted || {};
        match.economy.lastChakraGain = match.economy.lastChakraGain || {};
        usernames.forEach((u) => {
            if (!match.chakraPools[u]) {
                match.chakraPools[u] = createEmptyChakraPool();
                changed = true;
            }
            if (!Number.isInteger(match.economy.turnCounts[u])) {
                match.economy.turnCounts[u] = 0;
                changed = true;
            }
            if (typeof match.economy.startGranted[u] !== 'boolean') {
                match.economy.startGranted[u] = false;
                changed = true;
            }
            if (!Array.isArray(match.economy.lastChakraGain[u])) {
                match.economy.lastChakraGain[u] = [];
                changed = true;
            }
        });
        if (!match.turnStartedAt) {
            match.turnStartedAt = new Date();
            changed = true;
        }
        if (!match.turnExpiresAt) {
            match.turnExpiresAt = new Date(Date.now() + getTurnDurationMsForUser(match, match.currentTurn));
            changed = true;
        }
    }

    // Ensure first-turn start gain happens once per player
    const current = match.currentTurn;
    if (
        current &&
        !match.economy.startGranted[current] &&
        match.economy.turnCounts[current] === 0
    ) {
        const gains = generateRandomChakra(1);
        match.chakraPools[current] = applyChakraGain(match.chakraPools[current], gains);
        match.economy.startGranted[current] = true;
        match.economy.lastChakraGain[current] = gains;
        changed = true;
    }

    if (changed) {
        await matchesCollection.updateOne(
            { matchId: match.matchId },
            {
                $set: {
                    chakraPools: match.chakraPools,
                    economy: match.economy,
                    turnStartedAt: match.turnStartedAt,
                    turnExpiresAt: match.turnExpiresAt,
                },
            }
        );
    }
    return match;
};

const ensurePendingTurnState = async (match) => {
    if (!match) return match;
    let changed = false;
    const usernames = (match.players || []).map((p) => p.username).filter(Boolean);
    if (!match.pendingTurns || typeof match.pendingTurns !== 'object') {
        match.pendingTurns = {};
        changed = true;
    }
    usernames.forEach((username) => {
        const pending = match.pendingTurns[username];
        if (!pending || typeof pending !== 'object') {
            match.pendingTurns[username] = makeEmptyPendingTurn();
            changed = true;
            return;
        }
        const normalized = clampPendingTurnRandom(pending, match.chakraPools?.[username] || {});
        if (JSON.stringify(normalized) !== JSON.stringify(pending)) {
            match.pendingTurns[username] = normalized;
            changed = true;
        }
    });
    if (changed) {
        await matchesCollection.updateOne(
            { matchId: match.matchId },
            {
                $set: {
                    pendingTurns: match.pendingTurns,
                },
            }
        );
    }
    return match;
};

const getPendingTurn = (match, username) => {
    if (!match || !username) return makeEmptyPendingTurn();
    const pending = match.pendingTurns?.[username];
    return clonePendingTurn(pending || makeEmptyPendingTurn());
};

const hasPendingTurnStartChoice = (pendingTurn) =>
    Boolean(
        pendingTurn?.turnStartChoice &&
            Array.isArray(pendingTurn.turnStartChoice.options) &&
            pendingTurn.turnStartChoice.options.length > 0
    );

const persistMatchState = async (match, fields = {}) => {
    await matchesCollection.updateOne({ matchId: match.matchId }, { $set: fields });
    if (quickMatches.has(match.matchId)) {
        quickMatches.set(match.matchId, {
            ...(quickMatches.get(match.matchId) || {}),
            ...fields,
        });
    }
};

const getBattleBotPlayer = (match) =>
    Array.isArray(match?.players) ? match.players.find((player) => player?.isBot) || null : null;

const getBattleBotUsername = (match) => getBattleBotPlayer(match)?.username || null;

const isBattleBotTurn = (match) => isGameBotUsername(match?.currentTurn || '');

const botCanAffordSkill = ({ match, username, skill, actorState }) => {
    const pool = match?.chakraPools?.[username];
    if (!pool || !skill) {
        return false;
    }
    const pending = getPendingTurn(match, username);
    const { reservedSpecific, requiredRandom } = battleLogic.computeEffectiveEnergyCost({
        skill,
        actorState,
    });
    for (const type of chakraTypes) {
        if ((Number(pool[type]) || 0) < (Number(reservedSpecific[type]) || 0)) {
            return false;
        }
    }
    const remainingPool = chakraTypes.reduce((sum, type) => {
        const remaining = (Number(pool[type]) || 0) - (Number(reservedSpecific[type]) || 0);
        return sum + Math.max(0, remaining);
    }, 0);
    return remainingPool >= Math.max(0, Number(pending.unresolvedRandom) || 0) + requiredRandom;
};

const getBattleBotUnitForTarget = (match, target) => {
    if (!match || !target || typeof target.username !== 'string') return null;
    const slot = Number.parseInt(target.slot, 10);
    if (!Number.isInteger(slot) || slot < 0) return null;
    const team = Array.isArray(match.board?.[target.username]) ? match.board[target.username] : [];
    return team[slot] || null;
};

const getBattleBotSkillText = (skill) => {
    if (!skill || typeof skill !== 'object') return '';
    const parts = [
        skill.name,
        skill.skilldescription,
        skill.description,
        skill.target,
        Array.isArray(skill.classes) ? skill.classes.join(' ') : '',
    ];
    try {
        parts.push(JSON.stringify(skill.effects || []));
    } catch (error) {
        // Ignore malformed skill data and keep the readable fields.
    }
    return parts.filter(Boolean).join(' ').toLowerCase();
};

const isLikelyBattleBotDefensiveSkill = (skill, skillIndex = -1) => {
    const text = getBattleBotSkillText(skill);
    const helpfulTarget = /self|ally|allies/.test(String(skill?.target || '').toLowerCase());
    const defensiveWords =
        /defense|defence|destructible|protect|invulner|heal|restore|reduce|reduction|counter|reflect|evade|ignore|cleanse|remove harmful|cannot be killed|minimum hp/.test(
            text
        );
    return defensiveWords || (skillIndex === 3 && helpfulTarget);
};

const getBattleBotRecentDamage = (match, username, actorSlot) => {
    const damageEntry = match?.lastTurnDamageByUsername?.byUsername?.[username] || {};
    const bySlot = damageEntry.bySlot || {};
    return {
        slotDamage: Math.max(0, Number(bySlot[String(actorSlot)]) || 0),
        teamDamage: Math.max(0, Number(damageEntry.total) || 0),
    };
};

const collectBattleBotEffectAmount = (value, acceptedTypes, acceptedKeys, depth = 0) => {
    if (!value || depth > 5) return 0;
    if (Array.isArray(value)) {
        return value.reduce(
            (sum, entry) => sum + collectBattleBotEffectAmount(entry, acceptedTypes, acceptedKeys, depth + 1),
            0
        );
    }
    if (typeof value !== 'object') return 0;
    const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
    let total = 0;
    if (acceptedTypes.has(type)) {
        acceptedKeys.forEach((key) => {
            total += Math.max(0, Number(value[key]) || 0);
        });
    }
    Object.entries(value).forEach(([key, entry]) => {
        if (key === 'condition') return;
        total += collectBattleBotEffectAmount(entry, acceptedTypes, acceptedKeys, depth + 1);
    });
    return total;
};

const estimateBattleBotSkillDamage = (skill) => {
    const directDamage = Math.max(0, Number(skill?.damage) || 0);
    const effectDamage = collectBattleBotEffectAmount(
        skill?.effects || [],
        new Set(['damage', 'health_steal_damage']),
        ['amount', 'damage', 'turnEndDamage']
    );
    const text = getBattleBotSkillText(skill);
    const textDamage = Array.from(text.matchAll(/(?:deal|deals|damage|take|takes)\D{0,16}(\d+)\s+damage/g)).reduce(
        (sum, match) => sum + Math.max(0, Number(match[1]) || 0),
        0
    );
    return Math.max(directDamage, effectDamage, textDamage);
};

const estimateBattleBotSkillHealing = (skill) =>
    collectBattleBotEffectAmount(skill?.effects || [], new Set(['heal', 'revive']), ['amount', 'heal']);

const scoreBattleBotTarget = ({ match, username, actorSlot, skill, target, damageEstimate, healingEstimate }) => {
    const unit = getBattleBotUnitForTarget(match, target);
    if (!unit) return 0;
    const hp = Math.max(0, Number(unit.hp) || 0);
    const sameTeam = target.username === username;
    let score = Math.random() * 4;
    if (sameTeam) {
        const missingHpScore = Math.max(0, 100 - hp);
        const recentDamage = getBattleBotRecentDamage(match, username, target.slot);
        score += missingHpScore;
        score += Math.min(40, recentDamage.slotDamage);
        if (Number.parseInt(target.slot, 10) === actorSlot) score += 8;
        if (healingEstimate > 0 && hp < 75) score += 25;
        return score;
    }
    score += Math.max(0, 100 - hp) / 2;
    if (damageEstimate > 0) score += Math.min(60, damageEstimate);
    if (damageEstimate > 0 && damageEstimate >= hp) score += 90;
    return score;
};

const chooseBattleBotTargetSelection = (options = {}, context = {}) => {
    const targets = Array.isArray(options.targets) ? options.targets : [];
    if (!targets.length) {
        return null;
    }
    if (options.mode === 'single' || options.mode === 'self') {
        const scoredTargets = shuffleList(targets).map((target) => ({
            target,
            score: scoreBattleBotTarget({
                match: context.match,
                username: context.username,
                actorSlot: context.actorSlot,
                skill: context.skill,
                target,
                damageEstimate: context.damageEstimate || 0,
                healingEstimate: context.healingEstimate || 0,
            }),
        }));
        scoredTargets.sort((a, b) => b.score - a.score);
        return scoredTargets[0]?.target ? [scoredTargets[0].target] : null;
    }
    return targets;
};

const scoreBattleBotSkillCandidate = ({
    match,
    username,
    actorSlot,
    actorUnit,
    skill,
    skillIndex,
    targetSelection,
    preferDefense,
}) => {
    const damageEstimate = estimateBattleBotSkillDamage(skill);
    const healingEstimate = estimateBattleBotSkillHealing(skill);
    const targetType = String(skill?.target || '').toLowerCase();
    const defensive = isLikelyBattleBotDefensiveSkill(skill, skillIndex);
    const recentDamage = getBattleBotRecentDamage(match, username, actorSlot);
    const actorHp = Math.max(0, Number(actorUnit?.hp) || 0);
    let score = Math.random() * 8;

    if (preferDefense && defensive) score += 110;
    if (preferDefense && skillIndex === 3) score += 70;
    if (!preferDefense && damageEstimate > 0) score += 20;
    if (defensive && (recentDamage.slotDamage >= 30 || actorHp <= 45)) score += 25;
    if (/all-enemy/.test(targetType)) score += Math.max(15, damageEstimate);
    if (/self|ally|allies/.test(targetType)) score += healingEstimate > 0 ? healingEstimate : 12;
    if (/stun|disable|cooldown|drain|remove chakra|cannot use/.test(getBattleBotSkillText(skill))) score += 18;

    (Array.isArray(targetSelection) ? targetSelection : []).forEach((target) => {
        score += scoreBattleBotTarget({
            match,
            username,
            actorSlot,
            skill,
            target,
            damageEstimate,
            healingEstimate,
        });
    });

    return {
        score,
        defensive,
    };
};

const chooseBattleBotSkillCandidate = ({ match, username, actorSlot, actorUnit, actorState, character }) => {
    const skills = Array.isArray(character?.skills) ? character.skills : [];
    const recentDamage = getBattleBotRecentDamage(match, username, actorSlot);
    const actorHp = Math.max(0, Number(actorUnit?.hp) || 0);
    const tookHeavyDamage = recentDamage.slotDamage >= 30 || recentDamage.teamDamage >= 55 || (actorHp <= 40 && recentDamage.slotDamage > 0);
    const preferDefense = tookHeavyDamage && Math.random() < 0.5;
    const candidates = [];

    shuffleList(skills.map((_, index) => index)).forEach((skillIndex) => {
        const options = battleLogic.computeTargetOptions({
            match,
            actingUsername: username,
            actorSlot,
            skillIndex,
            characters: charactersData,
        });
        if (!options?.targetType || options.mode === 'unknown' || !Array.isArray(options.targets) || !options.targets.length) {
            return;
        }
        const skill = battleLogic.resolveEffectiveSkill({
            characters: charactersData,
            rosterIndex: actorUnit.rosterIndex,
            skillIndex,
            actorState,
        });
        if (!botCanAffordSkill({ match, username, skill, actorState })) {
            return;
        }
        const damageEstimate = estimateBattleBotSkillDamage(skill);
        const healingEstimate = estimateBattleBotSkillHealing(skill);
        const targetSelection = chooseBattleBotTargetSelection(options, {
            match,
            username,
            actorSlot,
            skill,
            damageEstimate,
            healingEstimate,
        });
        if (!targetSelection) {
            return;
        }
        const classChoiceOptions = Array.isArray(skill?.classChoiceOptions)
            ? skill.classChoiceOptions.map((entry) => normalizeClassChoice(entry)).filter(Boolean)
            : [];
        const scored = scoreBattleBotSkillCandidate({
            match,
            username,
            actorSlot,
            actorUnit,
            skill,
            skillIndex,
            targetSelection,
            preferDefense,
        });
        candidates.push({
            skillIndex,
            targetSelection,
            classChoice: classChoiceOptions[0] || null,
            score: scored.score,
            defensive: scored.defensive || skillIndex === 3,
        });
    });

    const pool = preferDefense && candidates.some((candidate) => candidate.defensive)
        ? candidates.filter((candidate) => candidate.defensive)
        : candidates;
    pool.sort((a, b) => b.score - a.score);
    return pool[0] || null;
};

const snapshotBattleHpByUsername = (match) => {
    const snapshot = {};
    (match?.players || []).forEach((player) => {
        if (!player?.username) return;
        const units = Array.isArray(match.board?.[player.username]) ? match.board[player.username] : [];
        snapshot[player.username] = {};
        units.forEach((unit, slot) => {
            snapshot[player.username][String(slot)] = Math.max(0, Number(unit?.hp) || 0);
        });
    });
    return snapshot;
};

const buildLastTurnDamageByUsername = ({ match, hpBefore, endedBy }) => {
    const byUsername = {};
    (match?.players || []).forEach((player) => {
        if (!player?.username) return;
        const units = Array.isArray(match.board?.[player.username]) ? match.board[player.username] : [];
        const bySlot = {};
        let total = 0;
        units.forEach((unit, slot) => {
            const previousHp = Math.max(0, Number(hpBefore?.[player.username]?.[String(slot)]) || 0);
            const nextHp = Math.max(0, Number(unit?.hp) || 0);
            const damage = Math.max(0, previousHp - nextHp);
            if (damage > 0) {
                bySlot[String(slot)] = damage;
                total += damage;
            }
        });
        byUsername[player.username] = { total, bySlot };
    });
    return {
        endedBy,
        createdAt: new Date(),
        byUsername,
    };
};

const assignBattleBotRandomChakra = ({ match, username }) => {
    const pending = getPendingTurn(match, username);
    while ((pending.unresolvedRandom || 0) > 0) {
        const pool = match?.chakraPools?.[username] || createEmptyChakraPool();
        const availableTypes = chakraTypes.filter((type) => (Number(pool[type]) || 0) > 0);
        if (!availableTypes.length) {
            break;
        }
        const chakraType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        adjustRandomAssignment({ match, username, chakraType, delta: 1 });
        const nextPending = getPendingTurn(match, username);
        pending.unresolvedRandom = nextPending.unresolvedRandom;
    }
};

const resolveTurnStartChoiceForUser = ({ match, username, choiceKey }) => {
    const pendingTurn = getPendingTurn(match, username);
    const prompt = pendingTurn.turnStartChoice;
    if (!hasPendingTurnStartChoice(pendingTurn) || !prompt) {
        throw new Error('No turn-start choice is pending.');
    }
    const option = Array.isArray(prompt.options)
        ? prompt.options.find((entry) => entry?.key === choiceKey)
        : null;
    if (!option) {
        throw new Error('Invalid turn-start choice.');
    }
    const sourceUnit = Array.isArray(match.board?.[username]) ? match.board[username][prompt.actorSlot] : null;
    const targetPick = battleLogic.selectTurnStartChoiceTarget({
        match,
        actingUsername: username,
        choice: option,
    });
    if (!targetPick?.unit) {
        throw new Error('No valid target available.');
    }
    const targetUnit = targetPick.unit;
    const targetState = battleLogic.getUnitState(match, targetPick.username, targetPick.slot);
    const effect = option.effect || {};
    const effectType = typeof effect.type === 'string' ? effect.type.trim().toLowerCase() : '';
    if ((effectType === 'heal' || effectType === 'cleanse_harmful') && targetUnit.alive === false) {
        throw new Error('No valid living ally is available.');
    }
    if (effectType === 'revive' && targetUnit.alive !== false) {
        throw new Error('No dead ally is available.');
    }
    if (effectType === 'heal') {
        battleLogic.applyHealToUnit(targetUnit, Math.max(0, Number(effect.amount) || 0));
    } else if (effectType === 'cleanse_harmful') {
        battleLogic.cleanseHarmfulStatuses(targetUnit, effect.count);
    } else if (effectType === 'revive') {
        battleLogic.reviveUnitToHp(targetUnit, Math.max(1, Number(effect.amount) || 30));
        targetState.statuses = Array.isArray(targetState.statuses) ? targetState.statuses : [];
    } else if (effectType === 'apply_status') {
        battleLogic.applyStatus({
            targetState,
            statusId: effect.statusId,
            duration: effect.duration,
            sourceSkillId: prompt.sourceSkillId,
            sourceUsername: username,
            sourceSlot: prompt.actorSlot,
            metadata: effect.metadata,
        });
    } else {
        throw new Error('Unsupported choice effect.');
    }

    match.players.forEach((player) => {
        if (!player?.username) return;
        player.aliveCount = getAliveCountForUser(match, player.username);
    });

    const sourceState = sourceUnit ? battleLogic.getUnitState(match, username, prompt.actorSlot) : null;
    if (sourceState && prompt.sourceStatusId) {
        const status = Array.isArray(sourceState.statuses)
            ? sourceState.statuses.find((entry) => entry?.id === prompt.sourceStatusId)
            : null;
        if (status) {
            const metadata = status?.metadata && typeof status.metadata === 'object' ? { ...status.metadata } : {};
            metadata.turnStartChoiceQueued = false;
            metadata.turnStartChoiceUsesUsed = Math.max(0, Number(metadata.turnStartChoiceUsesUsed) || 0) + 1;
            status.metadata = metadata;
            const maxUses = Math.max(0, Number(metadata.turnStartChoiceMaxUses) || 0);
            if (maxUses > 0 && metadata.turnStartChoiceUsesUsed >= maxUses) {
                status.metadata = {
                    ...metadata,
                    tooltipText: "Doctor's Bag has been used.",
                    turnStartChoiceQueued: false,
                };
            }
        }
    }
    pendingTurn.turnStartChoice = null;
    match.pendingTurns[username] = pendingTurn;
};

const runBattleBotTurn = async (matchId) => {
    if (!matchId || activeBattleBotTurns.has(matchId)) {
        return;
    }
    activeBattleBotTurns.add(matchId);
    try {
        const match = await matchesCollection.findOne({ matchId });
        if (!match) {
            return;
        }
        const hydratedTurn = await ensureMatchTurnData(match);
        const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
        const hydratedPending = await ensurePendingTurnState(hydratedEcon);
        const hydratedBoard = await ensureBoardState(hydratedPending);
        const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
        if (!hydrated || hydrated.status === 'ended' || !isBattleBotTurn(hydrated)) {
            return;
        }
        const username = hydrated.currentTurn;
        const pendingTurn = getPendingTurn(hydrated, username);
        if (hasPendingTurnStartChoice(pendingTurn)) {
            const choice = Array.isArray(pendingTurn.turnStartChoice?.options)
                ? pendingTurn.turnStartChoice.options[0]
                : null;
            if (choice?.key) {
                resolveTurnStartChoiceForUser({
                    match: hydrated,
                    username,
                    choiceKey: choice.key,
                });
            }
        }

        const team = Array.isArray(hydrated.board?.[username]) ? hydrated.board[username] : [];
        const actorSlots = shuffleList(
            team
                .map((unit, slot) => (unit && unit.alive !== false ? slot : null))
                .filter((slot) => Number.isInteger(slot))
        );
        actorSlots.forEach((actorSlot) => {
            const actorUnit = hydrated.board?.[username]?.[actorSlot];
            if (!actorUnit || actorUnit.alive === false) {
                return;
            }
            const actorState = battleLogic.getUnitState(hydrated, username, actorSlot);
            if (battleLogic.isActorUnableToUseSkills(actorState)) {
                return;
            }
            const character = charactersData?.[actorUnit.rosterIndex];
            const candidate = chooseBattleBotSkillCandidate({
                match: hydrated,
                username,
                actorSlot,
                actorUnit,
                actorState,
                character,
            });
            if (!candidate) {
                return;
            }
            try {
                queueSkillForActorSlot({
                    match: hydrated,
                    username,
                    actorSlot,
                    skillIndex: candidate.skillIndex,
                    targetSelection: candidate.targetSelection,
                    classChoice: candidate.classChoice,
                });
            } catch (error) {
                return;
            }
        });

        assignBattleBotRandomChakra({ match: hydrated, username });
        const updated = await finalizeTurn(hydrated, username);
        await broadcastMatchState(updated || hydrated);
        if (updated && isBattleBotTurn(updated)) {
            scheduleBattleBotTurn(updated);
        }
    } finally {
        activeBattleBotTurns.delete(matchId);
    }
};

function scheduleBattleBotTurn(match) {
    if (!match || match.status === 'ended' || !isBattleBotTurn(match)) {
        return;
    }
    const matchId = match.matchId;
    if (!matchId || activeBattleBotTurns.has(matchId) || scheduledBattleBotTurns.has(matchId)) {
        return;
    }
    const matchStartsAtMs = match.matchStartsAt ? new Date(match.matchStartsAt).getTime() : Date.now();
    const turnStartedAtMs = match.turnStartedAt ? new Date(match.turnStartedAt).getTime() : matchStartsAtMs;
    const earliestActionAtMs = Math.max(
        matchStartsAtMs,
        Number.isNaN(turnStartedAtMs) ? matchStartsAtMs : turnStartedAtMs + BATTLE_BOT_ACTION_DELAY_MS
    );
    const delayMs = Math.max(0, earliestActionAtMs - Date.now());
    scheduledBattleBotTurns.add(matchId);
    setTimeout(() => {
        scheduledBattleBotTurns.delete(matchId);
        runBattleBotTurn(matchId).catch((error) => {
            console.error('Battle bot turn failed:', error);
        });
    }, delayMs);
}

const normalizeClassChoice = (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

const usernamesEqual = (left, right) =>
    typeof left === 'string' &&
    typeof right === 'string' &&
    left.trim().toLowerCase() === right.trim().toLowerCase();

const queueSkillForActorSlot = ({ match, username, actorSlot, skillIndex, targetSelection, classChoice }) => {
    const pool = match.chakraPools?.[username];
    if (!pool) {
        throw new Error('Chakra pool unavailable.');
    }
    const pending = getPendingTurn(match, username);
    const actorKey = String(actorSlot);
    const existing = pending.queuedByActorSlot[actorKey];
    if (existing) {
        chakraTypes.forEach((type) => {
            pool[type] = (pool[type] || 0) + (existing.reservedSpecific?.[type] || 0);
        });
        pending.unresolvedRandom = Math.max(0, pending.unresolvedRandom - (existing.requiredRandom || 0));
        delete pending.queuedByActorSlot[actorKey];
        pending.queueOrder = pending.queueOrder.filter((slot) => slot !== actorSlot);
        const clamped = clampPendingTurnRandom(pending, pool);
        pending.unresolvedRandom = clamped.unresolvedRandom;
        pending.randomAssignments = clamped.randomAssignments;
        pending.queueOrder = clamped.queueOrder;
    }
    const actorBoard = match.board?.[username] || [];
    const actorUnit = actorBoard[actorSlot];
    if (!actorUnit || actorUnit.alive === false) {
        throw new Error('Actor is unavailable.');
    }
    const actorState = battleLogic.getUnitState(match, username, actorSlot);
    if (battleLogic.isActorUnableToUseSkills(actorState)) {
        throw new Error('Actor is stunned and cannot use skills.');
    }
    const rosterIndex = actorUnit?.rosterIndex;
    const skill = battleLogic.resolveEffectiveSkill({
        characters: charactersData,
        rosterIndex,
        skillIndex,
        actorState,
    });
    if (!skill) {
        throw new Error('Skill not found.');
    }
    const classChoiceOptions = Array.isArray(skill?.classChoiceOptions)
        ? skill.classChoiceOptions.map((entry) => normalizeClassChoice(entry)).filter(Boolean)
        : [];
    const normalizedClassChoice = normalizeClassChoice(classChoice);
    if (normalizedClassChoice && classChoiceOptions.length > 0 && !classChoiceOptions.includes(normalizedClassChoice)) {
        throw new Error('Invalid class choice.');
    }
    if (battleLogic.isSkillIndexBlockedForActor(actorState, skillIndex)) {
        throw new Error('This skill is unusable this turn.');
    }
    const baseSkill = Array.isArray(charactersData?.[rosterIndex]?.skills)
        ? charactersData[rosterIndex].skills[skillIndex]
        : null;
    const cooldownSkillId =
        skill?.useBaseSkillCooldown && baseSkill?.id ? baseSkill.id : skill?.id || baseSkill?.id || null;
    if (cooldownSkillId && battleLogic.getSkillCooldownRemaining(actorState, cooldownSkillId) > 0) {
        throw new Error('Skill is on cooldown.');
    }
    const { reservedSpecific, requiredRandom } = battleLogic.computeEffectiveEnergyCost({
        skill,
        actorState,
    });
    chakraTypes.forEach((type) => {
        if ((pool[type] || 0) < reservedSpecific[type]) {
            throw new Error('Not enough chakra.');
        }
    });
    chakraTypes.forEach((type) => {
        pool[type] = (pool[type] || 0) - reservedSpecific[type];
    });
    if (getTotalChakra(pool) < pending.unresolvedRandom + requiredRandom) {
        chakraTypes.forEach((type) => {
            pool[type] = (pool[type] || 0) + reservedSpecific[type];
        });
        throw new Error('Not enough chakra for random cost.');
    }
    pending.queuedByActorSlot[actorKey] = {
        actorSlot,
        skillIndex,
        targetSelection,
        ...(normalizedClassChoice ? { classChoice: normalizedClassChoice } : {}),
        reservedSpecific,
        requiredRandom,
    };
    if (!pending.queueOrder.includes(actorSlot)) {
        pending.queueOrder.push(actorSlot);
    }
    pending.unresolvedRandom += requiredRandom;
    const clamped = clampPendingTurnRandom(pending, pool);
    pending.unresolvedRandom = clamped.unresolvedRandom;
    pending.randomAssignments = clamped.randomAssignments;
    pending.queueOrder = clamped.queueOrder;
    match.chakraPools[username] = pool;
    match.pendingTurns[username] = pending;
};

const cancelQueuedSkillForActorSlot = ({ match, username, actorSlot }) => {
    const pool = match.chakraPools?.[username];
    const pending = getPendingTurn(match, username);
    const actorKey = String(actorSlot);
    const existing = pending.queuedByActorSlot[actorKey];
    if (!pool || !existing) {
        return false;
    }
    chakraTypes.forEach((type) => {
        pool[type] = (pool[type] || 0) + (existing.reservedSpecific?.[type] || 0);
    });
    pending.unresolvedRandom = Math.max(0, pending.unresolvedRandom - (existing.requiredRandom || 0));
    delete pending.queuedByActorSlot[actorKey];
    pending.queueOrder = pending.queueOrder.filter((slot) => slot !== actorSlot);
    const clamped = clampPendingTurnRandom(pending, pool);
    pending.unresolvedRandom = clamped.unresolvedRandom;
    pending.randomAssignments = clamped.randomAssignments;
    pending.queueOrder = clamped.queueOrder;
    match.chakraPools[username] = pool;
    match.pendingTurns[username] = pending;
    return true;
};

const reorderQueuedSkills = ({ match, username, actorSlots }) => {
    const pending = getPendingTurn(match, username);
    const queuedKeys = new Set(Object.keys(pending.queuedByActorSlot || {}));
    const normalized = Array.isArray(actorSlots)
        ? actorSlots
              .map((slot) => Number.parseInt(slot, 10))
              .filter((slot) => Number.isInteger(slot) && slot >= 0)
        : [];
    const unique = [];
    normalized.forEach((slot) => {
        const key = String(slot);
        if (!queuedKeys.has(key)) return;
        if (unique.includes(slot)) return;
        unique.push(slot);
    });
    Object.keys(pending.queuedByActorSlot || {}).forEach((slotKey) => {
        const slot = Number.parseInt(slotKey, 10);
        if (!Number.isInteger(slot)) return;
        if (!unique.includes(slot)) {
            unique.push(slot);
        }
    });
    pending.queueOrder = unique;
    match.pendingTurns[username] = pending;
};

const adjustRandomAssignment = ({ match, username, chakraType, delta }) => {
    if (!chakraTypes.includes(chakraType)) {
        throw new Error('Invalid chakra type.');
    }
    if (delta !== 1 && delta !== -1) {
        throw new Error('Invalid delta.');
    }
    const pool = match.chakraPools?.[username];
    const pending = getPendingTurn(match, username);
    if (!pool) {
        throw new Error('Chakra pool unavailable.');
    }
    if (delta === 1) {
        if (pending.unresolvedRandom <= 0) {
            throw new Error('No unresolved random chakra.');
        }
        if ((pool[chakraType] || 0) <= 0) {
            throw new Error('Not enough chakra.');
        }
        pool[chakraType] -= 1;
        pending.randomAssignments[chakraType] = (pending.randomAssignments[chakraType] || 0) + 1;
        pending.unresolvedRandom -= 1;
    } else {
        if ((pending.randomAssignments[chakraType] || 0) <= 0) {
            throw new Error('No assigned chakra to remove.');
        }
        pending.randomAssignments[chakraType] -= 1;
        pool[chakraType] = (pool[chakraType] || 0) + 1;
        pending.unresolvedRandom += 1;
    }
    match.chakraPools[username] = pool;
    match.pendingTurns[username] = pending;
};

const exchangeChakra = ({ match, username, chakraType, cost = 4, spendAssignments = null }) => {
    if (!chakraTypes.includes(chakraType)) {
        throw new Error('Invalid chakra type.');
    }
    const pool = match.chakraPools?.[username];
    if (!pool) {
        throw new Error('Chakra pool unavailable.');
    }
    const exchangeCost = Math.max(1, Number(cost) || 4);
    if (getTotalChakra(pool) < exchangeCost) {
        throw new Error(`Need at least ${exchangeCost} chakra to exchange.`);
    }

    let normalizedAssignments = null;
    if (spendAssignments && typeof spendAssignments === 'object') {
        normalizedAssignments = createEmptyChakraPool();
        chakraTypes.forEach((type) => {
            const value = Number.parseInt(spendAssignments[type], 10);
            normalizedAssignments[type] = Math.max(0, Number.isFinite(value) ? value : 0);
        });
        const assignedTotal = chakraTypes.reduce(
            (sum, type) => sum + (normalizedAssignments[type] || 0),
            0
        );
        if (assignedTotal !== exchangeCost) {
            throw new Error(`Assign exactly ${exchangeCost} chakra.`);
        }
        const exceeds = chakraTypes.some(
            (type) => (normalizedAssignments[type] || 0) > (Number(pool[type]) || 0)
        );
        if (exceeds) {
            throw new Error('Assigned chakra exceeds available pool.');
        }
    }

    if (normalizedAssignments) {
        chakraTypes.forEach((type) => {
            pool[type] = Math.max(0, (Number(pool[type]) || 0) - (normalizedAssignments[type] || 0));
        });
    } else {
        let remaining = exchangeCost;
        chakraTypes.forEach((type) => {
            if (remaining <= 0) return;
            const available = Math.max(0, Number(pool[type]) || 0);
            const toSpend = Math.min(available, remaining);
            pool[type] = available - toSpend;
            remaining -= toSpend;
        });
        if (remaining > 0) {
            throw new Error('Unable to exchange chakra.');
        }
    }
    pool[chakraType] = (Number(pool[chakraType]) || 0) + 1;
    match.chakraPools[username] = pool;
};

const ensureBoardState = async (match) => {
    if (!match) return match;
    let changed = false;
    const players = Array.isArray(match.players) ? match.players : [];
    if (!match.board) {
        match.board = battleLogic.buildInitialBoard(players);
        changed = true;
    }
    // Backfill aliveCount and board entries
    players.forEach((player) => {
        if (!Number.isInteger(player.aliveCount)) {
            player.aliveCount = Array.isArray(player.team) ? player.team.length : 0;
            changed = true;
        }
        if (!match.board[player.username]) {
            match.board[player.username] = battleLogic.buildInitialBoard([player])[player.username];
            changed = true;
        }
        const units = Array.isArray(match.board[player.username]) ? match.board[player.username] : [];
        let aliveCount = 0;
        units.forEach((unit, slot) => {
            if (!unit || typeof unit !== 'object') return;
            if (!Number.isInteger(unit.slot)) {
                unit.slot = slot;
                changed = true;
            }
            const numericHp = Number(unit.hp);
            if (!Number.isFinite(numericHp)) {
                unit.hp = battleLogic.DEFAULT_HP;
                changed = true;
            } else if (unit.hp !== numericHp) {
                unit.hp = numericHp;
                changed = true;
            }
            if (unit.hp <= 0) {
                if (unit.alive !== false) {
                    unit.alive = false;
                    changed = true;
                }
            } else if (unit.alive === false) {
                // Preserve explicit dead state only when hp is zero.
                unit.alive = true;
                changed = true;
            }
            const state = battleLogic.getUnitState(match, player.username, slot);
            if (!state || !Array.isArray(state.statuses) || typeof state.cooldowns !== 'object') {
                changed = true;
            }
            if (unit.alive !== false) {
                aliveCount += 1;
            }
        });
        if (player.aliveCount !== aliveCount) {
            player.aliveCount = aliveCount;
            changed = true;
        }
    });
    if (changed) {
        await matchesCollection.updateOne(
            { matchId: match.matchId },
            { $set: { board: match.board, players } }
        );
    }
    return match;
};

const finalizeTurn = async (match, username) => {
    if (!match || match.currentTurn !== username) return match;
    if (match.status === 'ended') return match;
    if (!match.board) {
        match.board = battleLogic.buildInitialBoard(match.players || []);
    }
    const econ = match.economy;
    const pools = match.chakraPools;
    match.pendingTurns = match.pendingTurns || {};
    const blockedActorGainCount = getTeamStatusFlagCount(match, username, 'preventNextTurnChakraGain');
    const pendingTurnBeforeResolve = getPendingTurn(match, username);
    const hpBeforeResolve = snapshotBattleHpByUsername(match);
    battleLogic.resolvePendingTurnSkills({
        match,
        actingUsername: username,
        characters: charactersData,
    });
    battleLogic.reduceHulkRageForInactiveTurn({
        match,
        endingUsername: username,
        pendingTurn: pendingTurnBeforeResolve,
    });
    if (match._manualSkillActorSlotsByUsername) {
        delete match._manualSkillActorSlotsByUsername;
    }
    battleLogic.tickStatusesForTurnEnd({
        match,
        endingUsername: username,
    });
    battleLogic.tickCooldownsForTurnEnd({
        match,
        endingUsername: username,
    });
    (match.players || []).forEach((player) => {
        const units = Array.isArray(match.board?.[player.username]) ? match.board[player.username] : [];
        player.aliveCount = units.reduce((sum, unit) => {
            if (!unit || typeof unit !== 'object') return sum;
            if ((Number(unit.hp) || 0) <= 0) {
                unit.alive = false;
            }
            return sum + (unit.alive === false ? 0 : 1);
        }, 0);
    });
    match.lastTurnDamageByUsername = buildLastTurnDamageByUsername({
        match,
        hpBefore: hpBeforeResolve,
        endedBy: username,
    });

    const alivePlayers = (match.players || []).filter(
        (player) => (Number(player?.aliveCount) || 0) > 0
    );
    if (alivePlayers.length <= 1) {
        const winner = alivePlayers.length === 1 ? alivePlayers[0].username : null;
        match.status = 'ended';
        match.winner = winner;
        match.surrenderedBy = null;
        match.endReason = 'elimination';
        match.endedAt = new Date();
        match.currentTurn = null;
        match.turnStartedAt = null;
        match.turnExpiresAt = null;
        match.ladderResults = await applyMatchCompletionRewards(
            match,
            match.winner,
            match.endedAt
        );
        await matchesCollection.updateOne(
            { matchId: match.matchId },
            {
                $set: {
                    mode: match.mode || 'quick',
                    status: match.status,
                    winner: match.winner,
                    surrenderedBy: match.surrenderedBy,
                    endReason: match.endReason,
                    endedAt: match.endedAt,
                    currentTurn: match.currentTurn,
                    turnStartedAt: match.turnStartedAt,
                    turnExpiresAt: match.turnExpiresAt,
                    board: match.board,
                    players: match.players,
                    chakraPools: match.chakraPools,
                    economy: match.economy,
                    pendingTurns: match.pendingTurns,
                    lastTurnDamageByUsername: match.lastTurnDamageByUsername,
                    ladderResults: match.ladderResults || null,
                },
            }
        );
        quickMatches.delete(match.matchId);
        (match.players || []).forEach((player) => userToMatch.delete(player.username));
        return match;
    }

    econ.turnCounts[username] = econ.turnCounts[username] || 0;
    const aliveCount = Math.max(1, getAliveCountForUser(match, username));
    const additionalTurnGains = getTeamStatusMetadataSum(
        match,
        username,
        'additionalRandomChakraPerTurn'
    );
    const effectiveGainCount = Math.max(0, aliveCount - blockedActorGainCount);
    const turnGains = generateRandomChakra(effectiveGainCount + additionalTurnGains);
    pools[username] = applyChakraGain(pools[username], turnGains);
    econ.lastChakraGain[username] = turnGains;

    econ.turnCounts[username] += 1;

    const opponentEntry = match.players.find((p) => p.username !== username);
    const opponent = opponentEntry ? opponentEntry.username : username;
    const nextTurn = opponent;
    match.currentTurn = nextTurn;

    econ.turnCounts[nextTurn] = econ.turnCounts[nextTurn] || 0;
    if (!econ.startGranted[nextTurn] && econ.turnCounts[nextTurn] === 0) {
        const aliveCount = Math.max(1, getAliveCountForUser(match, nextTurn));
        const additionalStartGains = getTeamStatusMetadataSum(
            match,
            nextTurn,
            'additionalRandomChakraPerTurn'
        );
        const blockedNextStartCount = getTeamStatusFlagCount(
            match,
            nextTurn,
            'preventNextTurnChakraGain'
        );
        const effectiveStartGainCount = Math.max(0, aliveCount - blockedNextStartCount);
        const startGains = generateRandomChakra(effectiveStartGainCount + additionalStartGains);
        pools[nextTurn] = applyChakraGain(pools[nextTurn], startGains);
        econ.startGranted[nextTurn] = true;
        econ.lastChakraGain[nextTurn] = startGains;
    }

    battleLogic.queueTurnStartChoicePrompts({
        match,
        startingUsername: nextTurn,
    });

    match.turnStartedAt = new Date();
    match.turnExpiresAt = new Date(Date.now() + getTurnDurationMsForUser(match, nextTurn));
    match.pendingTurns[username] = makeEmptyPendingTurn();

    await matchesCollection.updateOne(
        { matchId: match.matchId },
        {
            $set: {
                currentTurn: match.currentTurn,
                board: match.board,
                players: match.players,
                chakraPools: pools,
                economy: econ,
                pendingTurns: match.pendingTurns,
                lastTurnDamageByUsername: match.lastTurnDamageByUsername,
                turnStartedAt: match.turnStartedAt,
                turnExpiresAt: match.turnExpiresAt,
            },
        }
    );

    if (quickMatches.has(match.matchId)) {
        quickMatches.set(match.matchId, {
            ...(quickMatches.get(match.matchId) || {}),
            currentTurn: match.currentTurn,
            board: match.board,
            players: match.players,
            chakraPools: pools,
            economy: econ,
            pendingTurns: match.pendingTurns,
            lastTurnDamageByUsername: match.lastTurnDamageByUsername,
            turnStartedAt: match.turnStartedAt,
            turnExpiresAt: match.turnExpiresAt,
        });
    }

    return match;
};

const autoAdvanceTurnIfExpired = async (match) => {
    if (!match || !match.turnExpiresAt) return match;
    const pendingTurnChoice = getPendingTurn(match, match?.currentTurn || '');
    if (hasPendingTurnStartChoice(pendingTurnChoice)) {
        return match;
    }
    await ensureBoardState(match);
    const expiry =
        match.turnExpiresAt instanceof Date
            ? match.turnExpiresAt.getTime()
            : new Date(match.turnExpiresAt).getTime();
    if (Number.isNaN(expiry)) return match;
    if (Date.now() <= expiry) return match;
    return finalizeTurn(match, match.currentTurn);
};

async function initDb() {
    if (!DEFAULT_URI) {
        throw new Error('MONGODB_URI is required. Set it in your environment before starting the server.');
    }
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is required. Set it in your environment before starting the server.');
    }
    mongoClient = new MongoClient(DEFAULT_URI);
    await mongoClient.connect();
    const db = mongoClient.db(DATABASE_NAME);
    usersCollection = db.collection(USERS_COLLECTION);
    matchesCollection = db.collection(MATCHES_COLLECTION);
    appStateCollection = db.collection(APP_STATE_COLLECTION);
    newsPostsCollection = db.collection(NEWS_POSTS_COLLECTION);
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.createIndex({ usernameLower: 1 });
    await usersCollection.createIndex(
        { email: 1 },
        { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
    );
    await matchesCollection.createIndex({ matchId: 1 }, { unique: true });
    await appStateCollection.createIndex({ key: 1 }, { unique: true });
    await newsPostsCollection.createIndex({ createdAt: -1 });
    await hydrateCharactersDataFromStoredOverrides();
    await backfillUserProfiles();
    console.log('Connected to MongoDB.');
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/latest-releases', async (req, res) => {
    const releases = await getLatestCharacterReleases();
    return res.json({
        ok: true,
        releases,
    });
});

app.get('/api/admin/latest-releases', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    const releases = await getLatestCharacterReleases();
    return res.json({
        ok: true,
        releases,
    });
});

app.put('/api/admin/latest-releases', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    const { error: validationError, value } = latestReleasesUpdateSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'Invalid latest releases payload.' });
    }
    const normalizedReleases = normalizeLatestCharacterReleases(value.releases);
    await appStateCollection.updateOne(
        { key: LATEST_CHARACTER_RELEASES_STATE_KEY },
        {
            $set: {
                key: LATEST_CHARACTER_RELEASES_STATE_KEY,
                releases: normalizedReleases.map((entry) => ({
                    characterId: entry.characterId,
                })),
                updatedAt: new Date(),
            },
        },
        { upsert: true }
    );
    return res.json({
        ok: true,
        releases: normalizedReleases,
    });
});

app.get('/api/admin/maintenance', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    return res.json({
        ok: true,
        enabled: await getMaintenanceModeState(),
    });
});

app.put('/api/admin/maintenance', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    const { error: validationError, value } = maintenanceModeUpdateSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'Invalid maintenance payload.' });
    }
    await appStateCollection.updateOne(
        { key: MAINTENANCE_MODE_STATE_KEY },
        {
            $set: {
                key: MAINTENANCE_MODE_STATE_KEY,
                enabled: Boolean(value.enabled),
                updatedAt: new Date(),
            },
        },
        { upsert: true }
    );
    maintenanceModeCache = {
        enabled: Boolean(value.enabled),
        expiresAt: Date.now() + MAINTENANCE_MODE_CACHE_TTL_MS,
    };
    return res.json({
        ok: true,
        enabled: Boolean(value.enabled),
    });
});

app.post('/api/characters/faces', requireSession, async (req, res) => {
    const lookupSchema = Joi.object({
        characterIds: Joi.array().items(Joi.string().trim().min(1).max(128)).max(3).required(),
    });
    const { error: validationError, value } = lookupSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'characterIds are required.' });
    }

    const faceMap = buildCharacterFaceMap();

    return res.json({
        ok: true,
        faces: value.characterIds.map((characterId) => ({
            characterId,
            facePicture: faceMap.get(characterId) || '',
        })),
    });
});

const loginSchema = Joi.object({
    username: Joi.string().min(3).max(64).required(),
    password: Joi.string().min(8).max(128).required(),
});

const registerSchema = Joi.object({
    username: Joi.string().trim().min(3).max(64).required(),
    password: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
});

const teamSchema = Joi.array()
    .items(Joi.number().integer().min(0))
    .length(3)
    .custom((team, helpers) =>
        teamHasDuplicateCharacters(team) ? helpers.error('array.unique') : team
    )
    .messages({
        'array.unique': 'Team characters must be unique.',
    });

const getTeamValidationErrorMessage = (validationError, fallback = 'Invalid team selection.') => {
    const details = Array.isArray(validationError?.details) ? validationError.details : [];
    if (details.some((detail) => detail?.type === 'array.unique')) {
        return 'Team characters must be unique.';
    }
    return fallback;
};

const matchJoinSchema = Joi.object({
    team: teamSchema.required(),
    mode: Joi.string().valid('quick', 'ladder', 'private').default('quick'),
    targetUsername: Joi.string().trim().min(1).max(64).allow('').optional(),
    draftMode: Joi.boolean().default(false),
});

const publicProfileLookupSchema = Joi.object({
    username: Joi.string().trim().min(1).max(64).required(),
});

const activityUpdateSchema = Joi.object({
    currentPage: Joi.string().trim().max(120).allow('').required(),
});

const latestReleasesUpdateSchema = Joi.object({
    releases: Joi.array()
        .length(3)
        .items(
            Joi.object({
                characterId: Joi.string().trim().max(128).allow('').required(),
            }).required()
        )
        .required(),
});

const maintenanceModeUpdateSchema = Joi.object({
    enabled: Joi.boolean().required(),
});

const avatarUpdateSchema = Joi.object({
    avatarUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048).required(),
});

const backgroundUpdateSchema = Joi.object({
    selectionUrl: Joi.string().trim().allow('').uri({ scheme: ['http', 'https'] }).max(2048).required(),
    ingameUrl: Joi.string().trim().allow('').uri({ scheme: ['http', 'https'] }).max(2048).required(),
});

const matchmakingSettingsSchema = Joi.object({
    battleBotEnabled: Joi.boolean().required(),
});

const clanCreateSchema = Joi.object({
    name: Joi.string().trim().min(3).max(35).required(),
    abbreviation: Joi.string().trim().min(2).max(4).required(),
    bio: Joi.string().allow('').max(1000).required(),
});

const clanUpdateSchema = Joi.object({
    name: Joi.string().trim().min(3).max(35).required(),
    abbreviation: Joi.string().trim().min(2).max(4).required(),
    bio: Joi.string().allow('').max(1000).required(),
});

const clanInviteSchema = Joi.object({
    username: Joi.string().trim().min(3).max(64).required(),
});

const clanRankNamesSchema = Joi.object({
    rankKey: Joi.string()
        .valid('clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial')
        .required(),
    name: Joi.string().trim().min(1).max(40).required(),
    previousName: Joi.string().trim().allow('').max(40).required(),
});

const clanRankDeleteSchema = Joi.object({
    rankKey: Joi.string()
        .valid('clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial')
        .required(),
    name: Joi.string().trim().min(1).max(40).required(),
});

const clanMemberRankSchema = Joi.object({
    username: Joi.string().trim().min(1).max(64).required(),
    rankKey: Joi.string()
        .valid('clanLeader', 'leader', 'captain', 'lieutenant', 'member', 'trial')
        .required(),
    customRankName: Joi.string().allow('').max(40).required(),
});

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { error: validationError, value } = loginSchema.validate(req.body || {});
        if (validationError) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }
        const { username, password } = value;

        const user = await usersCollection.findOne({ usernameLower: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash || '');
        if (!isMatch) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }

        const normalizedProfile = normalizeUserProfile(user);
        normalizedProfile.activity.lastOnlineAt = new Date();
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile: normalizedProfile,
                    savedTeamIndices: Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : [],
                },
            }
        );
        const hydratedUser = {
            ...user,
            profile: normalizedProfile,
            savedTeamIndices: Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : [],
        };

        const token = signSession(hydratedUser);
        setSessionCookie(res, token);

        return res.json({
            ok: true,
            user: serializeUserForClient(hydratedUser),
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
});

app.post('/api/register', registerLimiter, async (req, res) => {
    try {
        const { error: validationError, value } = registerSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Invalid registration details.' });
        }

        const { username, password, confirmPassword, email } = value;
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        const [existingUsername, existingEmail] = await Promise.all([
            usersCollection.findOne({ username }),
            usersCollection.findOne({ email }),
        ]);

        if (existingUsername) {
            return res.status(409).json({ error: 'Username is already taken.' });
        }

        if (existingEmail) {
            return res.status(409).json({ error: 'Email is already in use.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const createdAt = new Date();
        const profile = buildDefaultUserProfile({ createdAt });
        const newUser = {
            username,
            usernameLower: username.toLowerCase(),
            email,
            passwordHash,
            role: 'player',
            createdAt,
            savedTeamIndices: [],
            profile,
        };

        const result = await usersCollection.insertOne(newUser);
        const token = signSession({ ...newUser, _id: result.insertedId });
        setSessionCookie(res, token);
        await recalculatePlayerLadderStandings();
        const createdUser = await usersCollection.findOne({ _id: result.insertedId });

        return res.status(201).json({
            ok: true,
            user: serializeUserForClient(createdUser || newUser),
        });
    } catch (error) {
        if (error?.code === 11000) {
            const field = error?.keyPattern?.email ? 'Email' : 'Username';
            return res.status(409).json({ error: `${field} is already in use.` });
        }
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// Save preferred team
app.post('/api/team/save', requireSession, async (req, res) => {
    const { error: validationError, value } = teamSchema.validate(req.body?.team);
    if (validationError) {
        return res.status(400).json({ error: getTeamValidationErrorMessage(validationError) });
    }
    if (!isValidTeamSelectionForMatch(value)) {
        return res.status(400).json({ error: 'Invalid team selection.' });
    }
    const user = await usersCollection.findOne({ username: req.authUser.username });
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    const profile = normalizeUserProfile(user);
    try {
        await assertTeamCanBeUsed(profile, value, user.role);
    } catch (error) {
        return res.status(403).json({ error: error.message || 'Character is locked.' });
    }
    await usersCollection.updateOne(
        { _id: user._id },
        {
            $set: {
                savedTeamIndices: value,
                profile,
            },
        }
    );
    return res.json({ ok: true });
});

// Quick matchmaking endpoints (demo/in-memory)
app.post('/api/match/join', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const { error: validationError, value } = matchJoinSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({
                error: getTeamValidationErrorMessage(
                    validationError,
                    'Team selection required to join match.'
                ),
            });
        }
        const team = value.team;
        const draftMode = Boolean(value.draftMode);
        if (!isValidTeamSelectionForMatch(team)) {
            return res.status(400).json({ error: 'Invalid team selection.' });
        }
        const mode = value.mode;
        const targetUsername = typeof value.targetUsername === 'string' ? value.targetUsername.trim() : '';
        if (mode === 'private') {
            if (!targetUsername) {
                return res.status(400).json({ error: 'Opponent username is required for a private game.' });
            }
            if (targetUsername.toLowerCase() === username.toLowerCase()) {
                return res.status(400).json({ error: 'You cannot start a private game with yourself.' });
            }
        }

        const draftId = userToDraft.get(username);
        if (draftId) {
            const draft = await advanceDraftIfNeeded(draftSessions.get(draftId));
            if (draft && draft.phase !== 'failed') {
                return res.json(serializeDraftForUser(draft, username));
            }
            userToDraft.delete(username);
        }

        // Already matched
        if (userToMatch.has(username)) {
            const { matchId, opponent } = userToMatch.get(username);
            const existing = await matchesCollection.findOne({ matchId });
            if (!existing || existing.status === 'ended') {
                userToMatch.delete(username);
            } else {
            const hydratedTurn = await ensureMatchTurnData(existing);
            const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
            const hydratedPending = await ensurePendingTurnState(hydratedEcon);
            const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
            if (!hydrated || hydrated.status === 'ended') {
                userToMatch.delete(username);
            } else {
            scheduleBattleBotTurn(hydrated);
            const safePayload = buildMatchPayloadForUser(hydrated, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId,
                mode: existing.mode || 'quick',
                opponent,
                matchStartsAt: existing.matchStartsAt || existing.createdAt || null,
                matchReady:
                    !existing.matchStartsAt ||
                    new Date(existing.matchStartsAt).getTime() <= Date.now(),
                currentTurn: hydrated?.currentTurn || null,
                turnOrder: hydrated?.turnOrder || null,
                turnExpiresAt: hydrated?.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
            }
            }
        }

        // If already stored in DB from earlier pairing, surface it
        const existingMatch = await matchesCollection.findOne({
            'players.username': username,
            status: { $ne: 'ended' },
        });
        if (existingMatch) {
            const hydratedTurn = await ensureMatchTurnData(existingMatch);
            const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
            const hydratedPending = await ensurePendingTurnState(hydratedEcon);
            const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
            if (!hydrated || hydrated.status === 'ended') {
                return res.json({ ok: true, matchFound: false });
            }
            const opponentEntry = hydrated.players.find((p) => p.username !== username);
            const opponent = opponentEntry ? getPlayerDisplayName(opponentEntry) : null;
            userToMatch.set(username, { matchId: hydrated.matchId, opponent });
            scheduleBattleBotTurn(hydrated);
            const safePayload = buildMatchPayloadForUser(hydrated, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId: hydrated.matchId,
                mode: hydrated.mode || 'quick',
                opponent,
                matchStartsAt: hydrated.matchStartsAt || hydrated.createdAt || null,
                matchReady:
                    !hydrated.matchStartsAt ||
                    new Date(hydrated.matchStartsAt).getTime() <= Date.now(),
                currentTurn: hydrated.currentTurn || null,
                turnOrder: hydrated.turnOrder || null,
                turnExpiresAt: hydrated.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
        }

        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        try {
            await assertTeamCanBeUsed(profile, team, user.role);
        } catch (error) {
            return res.status(403).json({ error: error.message || 'Character is locked.' });
        }

        // Try to pair with waiting opponent
        const opponent = mode === 'private'
            ? dequeuePrivateOpponent(username, targetUsername)
            : dequeueOpponent(username, mode, draftMode);
        if (opponent) {
            if (!isValidTeamSelectionForMatch(team) || !isValidTeamSelectionForMatch(opponent.team)) {
                return res.status(400).json({ error: 'Invalid team selection.' });
            }
            const shouldDraft = mode === 'private'
                ? draftMode || Boolean(opponent.draftMode)
                : draftMode && Boolean(opponent.draftMode);
            if (shouldDraft) {
                const draft = createDraftSession({
                    mode,
                    players: [
                        {
                            username,
                            team,
                            mode,
                            draftMode: true,
                            targetUsername,
                            queuedAt: new Date(),
                            allowBattleBot: Boolean(profile.matchmaking?.battleBotEnabled),
                            ladderLevel: Number(profile.ladder?.level) || 1,
                        },
                        {
                            ...opponent,
                            draftMode: true,
                        },
                    ],
                });
                return res.json(serializeDraftForUser(draft, username));
            }
            const aliveLookup = {
                [username]: Array.isArray(team) ? team.length : 3,
                [opponent.username]: Array.isArray(opponent.team) ? opponent.team.length : 3,
            };
            const {
                matchId,
                matchStartsAt,
                turnOrder,
                currentTurn,
                chakraPools,
                economy,
                pendingTurns,
                turnExpiresAt,
            } =
                buildMatch([username, opponent.username], aliveLookup);
            const playerDocs = [
                { username, team, aliveCount: aliveLookup[username] },
                { username: opponent.username, team: opponent.team, aliveCount: aliveLookup[opponent.username] },
            ];
            const board = battleLogic.buildInitialBoard(playerDocs);
            await matchesCollection.insertOne({
                matchId,
                mode,
                status: 'active',
                createdAt: new Date(),
                matchStartsAt,
                chakraPools,
                economy,
                pendingTurns,
                currentTurn,
                turnOrder,
                turnExpiresAt,
                board,
                players: playerDocs,
            });
            const createdMatch = {
                matchId,
                mode,
                status: 'active',
                createdAt: new Date(),
                matchStartsAt,
                chakraPools,
                economy,
                pendingTurns,
                currentTurn,
                turnOrder,
                turnExpiresAt,
                board,
                players: playerDocs,
            };
            scheduleBattleBotTurn(createdMatch);
            const opponentName = opponent.username;
            return res.json({
                ok: true,
                matchFound: true,
                matchId,
                mode,
                opponent: opponentName,
                matchStartsAt,
                matchReady: new Date(matchStartsAt).getTime() <= Date.now(),
                currentTurn,
                turnOrder,
                turnExpiresAt,
                turnDurationMs: getTurnDurationMsForUser({ players: playerDocs, board }, currentTurn),
                pendingTurn: makeEmptyPendingTurn(),
            });
        }

        const queuedBotMatch = await maybeCreateBattleBotMatch({
            username,
            mode,
            userProfile: profile,
        });
        if (queuedBotMatch?.draftId) {
            return res.json(serializeDraftForUser(queuedBotMatch, username));
        }
        if (queuedBotMatch) {
            scheduleBattleBotTurn(queuedBotMatch);
            const safePayload = buildMatchPayloadForUser(queuedBotMatch, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId: queuedBotMatch.matchId,
                mode: queuedBotMatch.mode || mode,
                opponent: GAME_BOT_DISPLAY_NAME,
                matchStartsAt: queuedBotMatch.matchStartsAt || queuedBotMatch.createdAt || null,
                matchReady:
                    !queuedBotMatch.matchStartsAt ||
                    new Date(queuedBotMatch.matchStartsAt).getTime() <= Date.now(),
                currentTurn: queuedBotMatch.currentTurn || null,
                turnOrder: queuedBotMatch.turnOrder || null,
                turnExpiresAt: queuedBotMatch.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(queuedBotMatch, queuedBotMatch?.currentTurn),
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
        }

        // Otherwise enqueue
        enqueuePlayer({
            username,
            team,
            mode,
            draftMode,
            targetUsername,
            queuedAt: new Date(),
            allowBattleBot: Boolean(profile.matchmaking?.battleBotEnabled),
            ladderLevel: Number(profile.ladder?.level) || 1,
        });
        return res.json({ ok: true, queued: true, mode });
    } catch (error) {
        console.error('Matchmaking error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.get('/api/match/status', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const user = await usersCollection.findOne(
            { username },
            { projection: { _id: 1, username: 1, createdAt: 1, profile: 1 } }
        );
        const normalizedProfile = user ? normalizeUserProfile(user) : null;
        const draftId = userToDraft.get(username);
        if (draftId) {
            const draft = await advanceDraftIfNeeded(draftSessions.get(draftId));
            if (draft) {
                if (draft.phase === 'completed' && draft.matchId) {
                    userToDraft.delete(username);
                }
                if (draft.phase === 'failed') {
                    userToDraft.delete(username);
                }
                return res.json(serializeDraftForUser(draft, username));
            }
            userToDraft.delete(username);
        }
        const mapping = userToMatch.get(username);
        if (mapping) {
            const match = await matchesCollection.findOne({ matchId: mapping.matchId });
            if (!match || match.status === 'ended') {
                userToMatch.delete(username);
                return res.json({ ok: true, matchFound: false });
            }
            const hydratedTurn = await ensureMatchTurnData(match);
            const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
            const hydratedPending = await ensurePendingTurnState(hydratedEcon);
            const hydratedBoard = await ensureBoardState(hydratedPending);
            const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
            if (!hydrated || hydrated.status === 'ended') {
                userToMatch.delete(username);
                return res.json({ ok: true, matchFound: false });
            }
            scheduleBattleBotTurn(hydrated);
            const safePayload = buildMatchPayloadForUser(hydrated, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId: mapping.matchId,
                mode: hydrated.mode || 'quick',
                opponent: mapping.opponent,
                matchStartsAt: hydrated.matchStartsAt || hydrated.createdAt || null,
                matchReady:
                    !hydrated.matchStartsAt ||
                    new Date(hydrated.matchStartsAt).getTime() <= Date.now(),
                currentTurn: hydrated?.currentTurn || null,
                turnOrder: hydrated?.turnOrder || null,
                turnExpiresAt: hydrated?.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
                board: safePayload?.board || null,
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
        }

        const queuedEntry = findQueuedEntry(username);
        const botMatch = await maybeCreateBattleBotMatch({
            username,
            mode: queuedEntry?.mode || 'quick',
            userProfile: normalizedProfile,
        });
        if (botMatch?.draftId) {
            return res.json(serializeDraftForUser(botMatch, username));
        }
        if (botMatch) {
            scheduleBattleBotTurn(botMatch);
            const safePayload = buildMatchPayloadForUser(botMatch, username);
            return res.json({
                ok: true,
                matchFound: true,
                matchId: botMatch.matchId,
                mode: botMatch.mode || 'quick',
                opponent: GAME_BOT_DISPLAY_NAME,
                matchStartsAt: botMatch.matchStartsAt || botMatch.createdAt || null,
                matchReady:
                    !botMatch.matchStartsAt ||
                    new Date(botMatch.matchStartsAt).getTime() <= Date.now(),
                currentTurn: botMatch.currentTurn || null,
                turnOrder: botMatch.turnOrder || null,
                turnExpiresAt: botMatch.turnExpiresAt || null,
                turnDurationMs: getTurnDurationMsForUser(botMatch, botMatch?.currentTurn),
                chakraPools: safePayload?.chakraPools || null,
                lastChakraGain: safePayload?.lastChakraGain || null,
                pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            });
        }

        // Fallback: lookup persisted match
        const match = await matchesCollection.findOne({
            'players.username': username,
            status: { $ne: 'ended' },
        });
        if (!match) {
            return res.json({ ok: true, matchFound: false });
        }
        const hydratedTurn = await ensureMatchTurnData(match);
        const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
        const hydratedPending = await ensurePendingTurnState(hydratedEcon);
        const hydratedBoard = await ensureBoardState(hydratedPending);
        const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
        if (!hydrated || hydrated.status === 'ended') {
            return res.json({ ok: true, matchFound: false });
        }
        const opponentEntry = hydrated.players.find((p) => p.username !== username);
        const opponent = opponentEntry ? getPlayerDisplayName(opponentEntry) : null;
        userToMatch.set(username, { matchId: hydrated.matchId, opponent });
        scheduleBattleBotTurn(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            matchFound: true,
            matchId: hydrated.matchId,
            mode: hydrated.mode || 'quick',
            opponent,
            matchStartsAt: hydrated.matchStartsAt || hydrated.createdAt || null,
            matchReady:
                !hydrated.matchStartsAt ||
                new Date(hydrated.matchStartsAt).getTime() <= Date.now(),
            currentTurn: hydrated.currentTurn || null,
            turnOrder: hydrated.turnOrder || null,
            turnExpiresAt: hydrated.turnExpiresAt || null,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
            board: safePayload?.board || null,
            chakraPools: safePayload?.chakraPools || null,
            lastChakraGain: safePayload?.lastChakraGain || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
        });
    } catch (error) {
        console.error('Match status error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/match/cancel', requireSession, (req, res) => {
    const username = req.authUser.username;
    // If already matched, do not allow cancelling
    if (userToMatch.has(username)) {
        return res.json({ ok: false, message: 'Match already found.' });
    }
    const draftId = userToDraft.get(username);
    if (draftId) {
        const draft = draftSessions.get(draftId);
        if (draft && draft.phase !== 'completed' && draft.phase !== 'failed') {
            finishDraftWithFailure(draft, [username], 'A player left draft.');
        }
        userToDraft.delete(username);
    }
    removeQueuedEntry(username);
    // Do not remove from existing matches here; only queue
    return res.json({ ok: true, cancelled: true });
});

app.post('/api/draft/:draftId/bans', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const draft = await advanceDraftIfNeeded(draftSessions.get(req.params.draftId));
        if (!draft || !draft.players?.some((player) => player.username === username)) {
            return res.status(404).json({ error: 'Draft not found.' });
        }
        if (draft.phase !== 'ban') {
            return res.status(400).json({ error: 'Ban phase is closed.' });
        }
        const bans = normalizeDraftBans(req.body?.bans);
        if (bans.length !== DRAFT_BAN_COUNT) {
            return res.status(400).json({ error: `Select ${DRAFT_BAN_COUNT} bans.` });
        }
        draft.submissions[username] = {
            ...(draft.submissions[username] || {}),
            bans,
            banSubmitted: true,
        };
        await advanceDraftIfNeeded(draft);
        return res.json(serializeDraftForUser(draft, username));
    } catch (error) {
        console.error('Draft ban error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/draft/:draftId/team', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const draft = await advanceDraftIfNeeded(draftSessions.get(req.params.draftId));
        if (!draft || !draft.players?.some((player) => player.username === username)) {
            return res.status(404).json({ error: 'Draft not found.' });
        }
        if (draft.phase !== 'pick') {
            return res.status(400).json({ error: 'Pick phase is not open.' });
        }
        const bannedSet = new Set(draft.revealedBans || []);
        const team = normalizeDraftTeam(req.body?.team, bannedSet);
        if (team.length !== DRAFT_TEAM_SIZE) {
            return res.status(400).json({ error: `Select ${DRAFT_TEAM_SIZE} available characters.` });
        }
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        try {
            await assertTeamCanBeUsed(normalizeUserProfile(user), team, user.role);
        } catch (error) {
            return res.status(403).json({ error: error.message || 'Character is locked.' });
        }
        draft.submissions[username] = {
            ...(draft.submissions[username] || {}),
            team,
            teamSubmitted: true,
        };
        await advanceDraftIfNeeded(draft);
        return res.json(serializeDraftForUser(draft, username));
    } catch (error) {
        console.error('Draft team error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.get('/api/match/:matchId', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const match = await matchesCollection.findOne({ matchId });
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const playerEntry = hydrated.players.find((p) => p.username === req.authUser.username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    scheduleBattleBotTurn(hydrated);
    return res.json(buildMatchPayloadForUser(hydrated, req.authUser.username));
});

app.post('/api/match/:matchId/surrender', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const username = req.authUser.username;
    const playerEntry = match.players.find((p) => p.username === username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    if (match.status === 'ended') {
        return res.json({
            ok: true,
            mode: match.mode || 'quick',
            status: 'ended',
            winner: match.winner || null,
            surrenderedBy: match.surrenderedBy || null,
            endReason: match.endReason || null,
            endedAt: match.endedAt || null,
            ladderResult: match.ladderResults?.[username] || null,
        });
    }
    const opponentEntry = match.players.find((p) => p.username !== username);
    const endedAt = new Date();
    const winnerUsername = opponentEntry ? opponentEntry.username : null;
    const endedMatch = {
        ...match,
        mode: match.mode || 'quick',
        status: 'ended',
        winner: winnerUsername,
        surrenderedBy: username,
        endReason: 'surrender',
        endedAt,
        currentTurn: null,
        turnExpiresAt: null,
    };
    await matchesCollection.updateOne(
        { matchId },
        {
            $set: {
                mode: endedMatch.mode,
                status: 'ended',
                winner: winnerUsername,
                surrenderedBy: username,
                endReason: 'surrender',
                endedAt,
                currentTurn: null,
                turnExpiresAt: null,
            },
        }
    );
    quickMatches.delete(matchId);
    (match.players || []).forEach((player) => userToMatch.delete(player.username));
    queueMatchStateBroadcast(endedMatch);
    res.json({
        ok: true,
        mode: endedMatch.mode,
        status: 'ended',
        surrenderedBy: username,
        winner: winnerUsername,
        endReason: 'surrender',
        endedAt,
    });
    applyMatchCompletionRewards(endedMatch, winnerUsername, endedAt)
        .then(async (ladderResults) => {
            if (ladderResults) {
                await matchesCollection.updateOne({ matchId }, { $set: { ladderResults } });
                queueMatchStateBroadcast(matchId);
            }
        })
        .catch((error) => {
            console.error('Surrender reward processing error:', error);
        });
});

app.post('/api/match/:matchId/turn/end', requireSession, async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await matchesCollection.findOne({ matchId });
        if (!match) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        const hydratedTurn = await ensureMatchTurnData(match);
        const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
        const hydratedPending = await ensurePendingTurnState(hydratedEcon);
        const hydratedBoard = await ensureBoardState(hydratedPending);
        const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
        if (!hydrated) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        if (hydrated.status === 'ended') {
            queueMatchStateBroadcast(hydrated);
            return res.status(409).json({ error: 'Match already ended.' });
        }

        const username = req.authUser.username;
        if (hydrated.currentTurn !== username) {
            queueMatchStateBroadcast(hydrated);
            return res.status(403).json({ error: 'Not your turn.' });
        }
        const pendingTurn = getPendingTurn(hydrated, username);
        if (hasPendingTurnStartChoice(pendingTurn)) {
            return res.status(400).json({ error: 'Resolve the Doctor\'s Bag choice first.' });
        }
        if ((pendingTurn.unresolvedRandom || 0) > 0) {
            return res.status(400).json({ error: 'Resolve random chakra before ending turn.' });
        }

        const updated = await finalizeTurn(hydrated, username);
        await broadcastMatchState(updated || hydrated);
        scheduleBattleBotTurn(updated || hydrated);

        return res.json(buildMatchPayloadForUser(updated, username));
    } catch (error) {
        console.error('Failed to end turn:', error);
        return res.status(500).json({
            error: 'Failed to end turn.',
            details: String(error?.stack || error?.message || error),
        });
    }
});

app.post('/api/match/:matchId/skill/queue', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlot = Number.parseInt(req.body?.actorSlot, 10);
    const skillIndex = Number.parseInt(req.body?.skillIndex, 10);
    const targetSelection = req.body?.targetSelection;
    const classChoice = req.body?.classChoice;
    if (!Number.isInteger(actorSlot) || actorSlot < 0 || !Number.isInteger(skillIndex) || skillIndex < 0) {
        return res.status(400).json({ error: 'actorSlot and skillIndex are required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return res.status(409).json({ error: 'Match already ended.' });
    }
    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return res.status(403).json({ error: 'Not your turn.' });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return res.status(400).json({ error: 'Resolve the Doctor\'s Bag choice first.' });
    }
    const options = battleLogic.computeTargetOptions({
        match: hydrated,
        actingUsername: username,
        actorSlot,
        skillIndex,
        characters: charactersData,
    });
    if (!options.targetType || options.mode === 'unknown') {
        return res.status(400).json({ error: 'Skill target could not be resolved.' });
    }
    if (!battleLogic.validateTargetSelection(options, targetSelection)) {
        return res.status(400).json({ error: 'Invalid target selection.' });
    }
    try {
        queueSkillForActorSlot({
            match: hydrated,
            username,
            actorSlot,
            skillIndex,
            targetSelection,
            classChoice,
        });
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
            pendingTurns: hydrated.pendingTurns,
        });
        queueMatchStateBroadcast(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            chakraPools: safePayload?.chakraPools || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to queue skill.' });
    }
});

app.post('/api/match/:matchId/turn/start-choice', requireSession, async (req, res) => {
    try {
        const { matchId } = req.params;
        const choiceKey =
            typeof req.body?.choiceKey === 'string' ? req.body.choiceKey.trim().toLowerCase() : '';
        if (!choiceKey) {
            return res.status(400).json({ error: 'choiceKey is required.' });
        }
        const match = await matchesCollection.findOne({ matchId });
        if (!match) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        const hydratedTurn = await ensureMatchTurnData(match);
        const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
        const hydratedPending = await ensurePendingTurnState(hydratedEcon);
        const hydratedBoard = await ensureBoardState(hydratedPending);
        const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
        if (!hydrated) {
            return res.status(404).json({ error: 'Match not found.' });
        }
        if (hydrated.status === 'ended') {
            return res.status(409).json({ error: 'Match already ended.' });
        }
        const username = req.authUser.username;
        if (hydrated.currentTurn !== username) {
            return res.status(403).json({ error: 'Not your turn.' });
        }
        const pendingTurn = getPendingTurn(hydrated, username);
        const prompt = pendingTurn.turnStartChoice;
        if (!hasPendingTurnStartChoice(pendingTurn) || !prompt) {
            return res.status(400).json({ error: 'No Doctor\'s Bag choice is pending.' });
        }
        const option = Array.isArray(prompt.options)
            ? prompt.options.find((entry) => entry?.key === choiceKey)
            : null;
        if (!option) {
            return res.status(400).json({ error: 'Invalid choice.' });
        }
        resolveTurnStartChoiceForUser({ match: hydrated, username, choiceKey });
        await persistMatchState(hydrated, {
            board: hydrated.board,
            players: hydrated.players,
            pendingTurns: hydrated.pendingTurns,
        });
        queueMatchStateBroadcast(hydrated);
        scheduleBattleBotTurn(hydrated);
        return res.json(buildMatchPayloadForUser(hydrated, username));
    } catch (error) {
        console.error('Failed to resolve turn start choice:', error);
        return res.status(500).json({
            error: 'Failed to resolve turn start choice.',
        });
    }
});

app.post('/api/match/:matchId/skill/cancel', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlot = Number.parseInt(req.body?.actorSlot, 10);
    if (!Number.isInteger(actorSlot) || actorSlot < 0) {
        return res.status(400).json({ error: 'actorSlot is required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return res.status(409).json({ error: 'Match already ended.' });
    }
    const authUsername = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => usernamesEqual(p.username, authUsername));
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    const username = playerEntry.username;
    if (!usernamesEqual(hydrated.currentTurn, username)) {
        return res.status(403).json({ error: 'Not your turn.' });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return res.status(400).json({ error: 'Resolve the Doctor\'s Bag choice first.' });
    }
    const changed = cancelQueuedSkillForActorSlot({ match: hydrated, username, actorSlot });
    if (changed) {
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
            pendingTurns: hydrated.pendingTurns,
        });
        queueMatchStateBroadcast(hydrated);
    }
    const safePayload = buildMatchPayloadForUser(hydrated, username);
    return res.json({
        ok: true,
        chakraPools: safePayload?.chakraPools || null,
        pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
        turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
    });
});

app.post('/api/match/:matchId/skill/reorder', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlots = Array.isArray(req.body?.actorSlots) ? req.body.actorSlots : [];
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return res.status(409).json({ error: 'Match already ended.' });
    }
    const username = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => p.username === username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    if (hydrated.currentTurn !== username) {
        return res.status(403).json({ error: 'Not your turn.' });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return res.status(400).json({ error: 'Resolve the Doctor\'s Bag choice first.' });
    }
    reorderQueuedSkills({ match: hydrated, username, actorSlots });
    await persistMatchState(hydrated, {
        pendingTurns: hydrated.pendingTurns,
    });
    await broadcastMatchState(hydrated);
    return res.json({
        ok: true,
        pendingTurn: getPendingTurn(hydrated, username),
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
        turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
    });
});

app.post('/api/match/:matchId/turn/random/adjust', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const chakraType = typeof req.body?.chakraType === 'string' ? req.body.chakraType.trim().toLowerCase() : '';
    const deltaRaw = Number.parseInt(req.body?.delta, 10);
    const delta = deltaRaw > 0 ? 1 : deltaRaw < 0 ? -1 : 0;
    if (!chakraTypes.includes(chakraType) || !delta) {
        return res.status(400).json({ error: 'chakraType and delta are required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return res.status(409).json({ error: 'Match already ended.' });
    }
    const username = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => p.username === username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    if (hydrated.currentTurn !== username) {
        return res.status(403).json({ error: 'Not your turn.' });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return res.status(400).json({ error: 'Resolve the Doctor\'s Bag choice first.' });
    }
    try {
        adjustRandomAssignment({ match: hydrated, username, chakraType, delta });
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
            pendingTurns: hydrated.pendingTurns,
        });
        queueMatchStateBroadcast(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            chakraPools: safePayload?.chakraPools || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Unable to adjust random chakra.' });
    }
});

app.post('/api/match/:matchId/chakra/exchange', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const chakraType = typeof req.body?.chakraType === 'string' ? req.body.chakraType.trim().toLowerCase() : '';
    const spendAssignments =
        req.body?.spendAssignments && typeof req.body.spendAssignments === 'object'
            ? req.body.spendAssignments
            : null;
    if (!chakraTypes.includes(chakraType)) {
        return res.status(400).json({ error: 'chakraType is required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedPending);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return res.status(409).json({ error: 'Match already ended.' });
    }
    const username = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => p.username === username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    if (hydrated.currentTurn !== username) {
        return res.status(403).json({ error: 'Not your turn.' });
    }
    if (hasPendingTurnStartChoice(getPendingTurn(hydrated, username))) {
        return res.status(400).json({ error: 'Resolve the Doctor\'s Bag choice first.' });
    }
    try {
        exchangeChakra({
            match: hydrated,
            username,
            chakraType,
            cost: 5,
            spendAssignments,
        });
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
        });
        queueMatchStateBroadcast(hydrated);
        const safePayload = buildMatchPayloadForUser(hydrated, username);
        return res.json({
            ok: true,
            chakraPools: safePayload?.chakraPools || null,
            pendingTurn: safePayload?.pendingTurn || makeEmptyPendingTurn(),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
            turnDurationMs: getTurnDurationMsForUser(hydrated, hydrated?.currentTurn),
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Unable to exchange chakra.' });
    }
});

app.post('/api/match/:matchId/skill/targets', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlot = Number.parseInt(req.body?.actorSlot, 10);
    const skillIndex = Number.parseInt(req.body?.skillIndex, 10);
    if (!Number.isInteger(actorSlot) || actorSlot < 0 || !Number.isInteger(skillIndex) || skillIndex < 0) {
        return res.status(400).json({ error: 'actorSlot and skillIndex are required.' });
    }
    const match = await matchesCollection.findOne({ matchId });
    if (!match) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    const hydratedTurn = await ensureMatchTurnData(match);
    const hydratedEcon = await ensureMatchEconomy(hydratedTurn);
    const hydratedPending = await ensurePendingTurnState(hydratedEcon);
    const hydratedBoard = await ensureBoardState(hydratedPending);
    const hydrated = await autoAdvanceTurnIfExpired(hydratedBoard);
    if (!hydrated) {
        return res.status(404).json({ error: 'Match not found.' });
    }
    if (hydrated.status === 'ended') {
        return res.status(409).json({ error: 'Match already ended.' });
    }

    const username = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => p.username === username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    if (hydrated.currentTurn !== username) {
        return res.status(403).json({ error: 'Not your turn.' });
    }

    const options = battleLogic.computeTargetOptions({
        match: hydrated,
        actingUsername: username,
        actorSlot,
        skillIndex,
        characters: charactersData,
    });

    if (!options.targetType || options.mode === 'unknown') {
        return res.status(400).json({ error: 'Skill target could not be resolved.' });
    }

    return res.json({
        ok: true,
        targetType: options.targetType,
        mode: options.mode,
        targets: options.targets,
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
        pendingTurn: getPendingTurn(hydrated, username),
    });
});

app.post('/api/refresh', requireSession, async (req, res) => {
    try {
        const token = signSession(req.authUser);
        setSessionCookie(res, token);
        return res.json({ ok: true, user: req.authUser });
    } catch (error) {
        console.error('Refresh error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.get('/api/me', requireSession, async (req, res) => {
    const user = await usersCollection.findOne({ username: req.authUser.username });
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const normalizedProfile = normalizeUserProfile(user);
    normalizedProfile.activity.lastOnlineAt = new Date();
    await usersCollection.updateOne(
        { _id: user._id },
        {
            $set: {
                profile: normalizedProfile,
                savedTeamIndices: Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : [],
            },
        }
    );
    const hydratedUser = {
        ...user,
        profile: normalizedProfile,
        savedTeamIndices: Array.isArray(user.savedTeamIndices) ? user.savedTeamIndices : [],
    };
    res.json({ ok: true, user: serializeUserForClient(hydratedUser) });
});

app.post('/api/activity', requireSession, async (req, res) => {
    const { error: validationError, value } = activityUpdateSchema.validate(req.body || {});
    if (validationError) {
        return res.status(400).json({ error: 'Invalid activity payload.' });
    }
    const user = await usersCollection.findOne({ username: req.authUser.username });
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const normalizedProfile = normalizeUserProfile(user);
    normalizedProfile.activity.lastOnlineAt = new Date();
    normalizedProfile.activity.currentPage = value.currentPage || '';
    await usersCollection.updateOne(
        { _id: user._id },
        {
            $set: {
                profile: normalizedProfile,
            },
        }
    );
    return res.json({
        ok: true,
        activity: normalizedProfile.activity,
    });
});

app.get('/api/admin/winrates', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const winratesState = await appStateCollection.findOne({ key: 'winrates' });
        const resetAt =
            winratesState && winratesState.resetAt
                ? new Date(winratesState.resetAt)
                : null;
        const characters = charactersData.map((character = {}, index) => ({
            characterIndex: index,
            characterId: typeof character.characterId === 'string' ? character.characterId : '',
            name: typeof character.name === 'string' ? character.name : `Character ${index + 1}`,
            facePicture: typeof character.facePicture === 'string' ? character.facePicture : '',
            totalGamesWon: 0,
            totalMatchesPlayed: 0,
        }));

        const ladderMatches = await matchesCollection.find(
            {
                mode: 'ladder',
                status: 'ended',
                players: { $exists: true, $ne: [] },
                ...(resetAt && !Number.isNaN(resetAt.getTime())
                    ? {
                        endedAt: { $gte: resetAt },
                    }
                    : {}),
            },
            {
                projection: {
                    winner: 1,
                    players: 1,
                },
            }
        ).toArray();

        ladderMatches.forEach((match = {}) => {
            const winnerUsername = typeof match.winner === 'string' ? match.winner.trim() : '';
            const players = Array.isArray(match.players) ? match.players : [];

            players.forEach((player = {}) => {
                const team = Array.isArray(player.team) ? player.team : [];
                const didWin =
                    winnerUsername &&
                    typeof player.username === 'string' &&
                    player.username.trim() === winnerUsername;

                team.forEach((characterIndex) => {
                    const index = Number(characterIndex);
                    if (!Number.isInteger(index) || !characters[index]) {
                        return;
                    }
                    characters[index].totalMatchesPlayed += 1;
                    if (didWin) {
                        characters[index].totalGamesWon += 1;
                    }
                });
            });
        });

        return res.json({
            ok: true,
            characters,
        });
    } catch (error) {
        console.error('Admin winrates load error:', error);
        return res.status(500).json({ error: 'Unable to load winrates.' });
    }
});

app.post('/api/admin/winrates/reset', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const resetAt = new Date();
        await appStateCollection.updateOne(
            { key: 'winrates' },
            {
                $set: {
                    key: 'winrates',
                    resetAt,
                    updatedBy: req.authUser.username,
                },
            },
            { upsert: true }
        );

        return res.json({
            ok: true,
            resetAt,
        });
    } catch (error) {
        console.error('Admin winrates reset error:', error);
        return res.status(500).json({ error: 'Unable to reset winrates.' });
    }
});

app.get('/api/news', async (req, res) => {
    try {
        const posts = await newsPostsCollection
            .find({}, { sort: { createdAt: -1 } })
            .toArray();
        return res.json({
            ok: true,
            posts: posts.map(serializeNewsPost),
        });
    } catch (error) {
        console.error('News load error:', error);
        return res.status(500).json({ error: 'Unable to load news posts.' });
    }
});

app.get('/api/missions', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const missions = await getStoredMissionCatalog();
        let missionState = createDefaultMissionState();
        try {
            const token = req.cookies?.[SESSION_COOKIE_NAME];
            const authUser = token ? await getSessionUserFromToken(token) : null;
            if (authUser) {
                const normalizedProfile = normalizeUserProfile(authUser);
                missionState = normalizeMissionState(normalizedProfile.missions);
            }
        } catch (sessionError) {
            console.warn('Mission session lookup failed:', sessionError);
        }
        return res.json({
            ok: true,
            missions,
            missionProgressByMissionId: missionState.progressByMissionId,
            unlockedCharacterIds: missionState.unlockedCharacterIds,
        });
    } catch (error) {
        console.error('Mission catalog load error:', error);
        return res.status(500).json({ error: 'Unable to load missions.' });
    }
});

app.post('/api/missions/:missionId/pve/start', requireSession, async (req, res) => {
    try {
        const missionId = slugifyMissionId(req.params?.missionId || '');
        const missions = await getStoredMissionCatalog();
        const mission = missions.find((entry) => entry?.missionId === missionId);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found.' });
        }
        const specialPve = mission.special_pve || {};
        if (!specialPve.enabled) {
            return res.status(400).json({ error: 'This mission does not have a PvE fight.' });
        }

        const username = req.authUser.username;
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Session expired.' });
        }
        const profile = normalizeUserProfile(user);
        const userLevel = Number(profile?.ladder?.level) || 1;
        const levelRequirement = Math.max(0, Number(mission.level_requirement) || 0);
        const isAdmin = String(user.role || '').trim().toLowerCase() === 'admin';
        if (!isAdmin && levelRequirement > 0 && userLevel < levelRequirement) {
            return res.status(403).json({ error: `Requires level ${levelRequirement}.` });
        }

        const presetTeamCharacterIds = Array.isArray(specialPve.playerTeamCharacterIds)
            ? specialPve.playerTeamCharacterIds.map((entry) => normalizeCharacterId(entry)).filter(Boolean)
            : [];
        const presetTeam =
            presetTeamCharacterIds.length > 0
                ? presetTeamCharacterIds.map((characterId) => getRosterIndexByCharacterId(characterId))
                : [];
        if (presetTeam.some((rosterIndex) => !Number.isInteger(rosterIndex) || rosterIndex < 0)) {
            return res.status(400).json({ error: 'Mission preset team is missing a roster character.' });
        }
        const team = presetTeam.length > 0
            ? presetTeam
            : Array.isArray(req.body?.team)
                ? req.body.team.map((slot) => Number.parseInt(slot, 10))
                : [];
        await assertTeamCanBeUsed(profile, team, user.role);

        const botRosterIndex = getRosterIndexByCharacterId(specialPve.botTeamCharacterId);
        if (!Number.isInteger(botRosterIndex) || botRosterIndex < 0) {
            return res.status(400).json({ error: 'Mission PvE bot character is not in the roster.' });
        }
        const botTeamSize = Math.max(1, Math.min(6, Number(specialPve.botTeamSize) || 3));
        const botTeam = Array.from({ length: botTeamSize }, () => botRosterIndex);
        const botName = specialPve.botName || 'Mission Bot';
        const botPlayer = createBattleBotPlayer({
            matchId: `${missionId}-${Date.now()}`,
            team: botTeam,
            ladderLevel: userLevel,
        });
        botPlayer.displayName = botName;

        const matchDocument = await createMatchDocumentFromTeams({
            mode: 'pve',
            players: [
                {
                    username,
                    team,
                },
                botPlayer,
            ],
            botMatch: {
                enabled: true,
                displayName: botName,
            },
            extraFields: {
                specialPveMissionId: mission.missionId,
                backgroundOverride: specialPve.backgroundImage || '',
                pveBattle: {
                    missionId: mission.missionId,
                    rewardCharacterId: normalizeCharacterId(mission.reward_character),
                    botName,
                },
            },
        });
        userToMatch.set(username, {
            matchId: matchDocument.matchId,
            opponent: botName,
        });
        scheduleBattleBotTurn(matchDocument);
        const hydrated = await hydrateMatchForBroadcast(matchDocument.matchId);
        return res.json(buildMatchPayloadForUser(hydrated || matchDocument, username));
    } catch (error) {
        console.error('Mission PvE start error:', error);
        return res.status(400).json({ error: error.message || 'Unable to start mission fight.' });
    }
});

app.get('/api/admin/missions', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const missions = await getStoredMissionCatalog();
        return res.json({
            ok: true,
            missions,
        });
    } catch (error) {
        console.error('Admin mission catalog load error:', error);
        return res.status(500).json({ error: 'Unable to load missions.' });
    }
});

app.put('/api/admin/missions', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const missions = Array.isArray(req.body?.missions) ? req.body.missions : null;
    if (!missions) {
        return res.status(400).json({ error: 'Missions are required.' });
    }

    try {
        const savedMissions = await saveMissionCatalog(missions, req.authUser.username);
        return res.json({
            ok: true,
            missions: savedMissions,
        });
    } catch (error) {
        console.error('Admin mission catalog save error:', error);
        return res.status(400).json({ error: error.message || 'Unable to save missions.' });
    }
});

app.get('/api/characters/catalog', (req, res) => {
    res.set('Cache-Control', 'no-store');
    refreshCharactersDataFromFile();
    return res.json({
        ok: true,
        characters: characterCatalog,
    });
});

app.get('/api/characters/play-rates', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
        const rosterIndexToCharacterId = new Map(
            (Array.isArray(charactersData) ? charactersData : []).map((character, rosterIndex) => [
                rosterIndex,
                typeof character?.characterId === 'string' ? character.characterId : '',
            ])
        );
        const pickCountsByCharacterId = new Map();
        let totalPicks = 0;

        const rows = await matchesCollection
            .aggregate([
                { $unwind: '$players' },
                { $unwind: '$players.team' },
                {
                    $group: {
                        _id: '$players.team',
                        pickCount: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        rows.forEach((row) => {
            const rosterIndex = Number.parseInt(row?._id, 10);
            if (!Number.isInteger(rosterIndex)) return;
            const characterId = rosterIndexToCharacterId.get(rosterIndex);
            if (!characterId) return;
            const pickCount = Math.max(0, Number(row?.pickCount) || 0);
            totalPicks += pickCount;
            pickCountsByCharacterId.set(
                characterId,
                (pickCountsByCharacterId.get(characterId) || 0) + pickCount
            );
        });

        return res.json({
            ok: true,
            totalPicks,
            playRates: (Array.isArray(charactersData) ? charactersData : []).map((character) => {
                const characterId = typeof character?.characterId === 'string' ? character.characterId : '';
                const pickCount = pickCountsByCharacterId.get(characterId) || 0;
                return {
                    characterId,
                    pickCount,
                    playRatePercent: totalPicks > 0 ? (pickCount / totalPicks) * 100 : 0,
                };
            }),
        });
    } catch (error) {
        console.error('Character play rate load error:', error);
        return res.status(500).json({ error: 'Unable to load character play rates.' });
    }
});

app.get('/api/admin/characters', requireSession, (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    return res.json({
        ok: true,
        characters: characterCatalog,
    });
});

app.get('/api/admin/characters/export', requireSession, (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const serialized = serializeCharactersDataFile(Array.isArray(charactersData) ? charactersData : []);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="characters.js"');
    return res.send(serialized);
});

app.get('/api/admin/characters/:characterId', requireSession, (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const characterId = typeof req.params?.characterId === 'string' ? req.params.characterId.trim() : '';
    const currentCharacters = refreshCharactersDataFromFile();
    const character = currentCharacters.find(
        (entry) => typeof entry?.characterId === 'string' && entry.characterId === characterId
    );
    if (!character) {
        return res.status(404).json({ error: 'Character not found.' });
    }

    return res.json({
        ok: true,
        character,
    });
});

app.put('/api/admin/characters/:characterId', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const characterId = typeof req.params?.characterId === 'string' ? req.params.characterId.trim() : '';
    const nextCharacter = req.body && typeof req.body === 'object' ? req.body : null;
    if (!characterId || !nextCharacter || typeof nextCharacter.characterId !== 'string' || !nextCharacter.characterId.trim()) {
        return res.status(400).json({ error: 'A valid character payload is required.' });
    }

    const currentCharacters = refreshCharactersDataFromFile();
    const characterIndex = currentCharacters.findIndex(
        (entry) => typeof entry?.characterId === 'string' && entry.characterId === characterId
    );

    const duplicateCharacterIndex = currentCharacters.findIndex(
        (entry, index) =>
            index !== characterIndex &&
            typeof entry?.characterId === 'string' &&
            entry.characterId === nextCharacter.characterId.trim()
    );
    if (duplicateCharacterIndex !== -1) {
        return res.status(409).json({ error: 'Character id is already in use.' });
    }

    try {
        const updatedCharacters = currentCharacters.slice();
        const saveIndex = characterIndex === -1 ? updatedCharacters.length : characterIndex;
        updatedCharacters[saveIndex] = {
            ...nextCharacter,
            characterId: nextCharacter.characterId.trim(),
        };
        await saveCharactersDataFile(updatedCharacters, {
            characterOverride: updatedCharacters[saveIndex],
            previousCharacterId: characterId,
            updatedBy: req.authUser.username,
        });
        return res.json({
            ok: true,
            character: updatedCharacters[saveIndex],
        });
    } catch (error) {
        console.error('Admin character update error:', error);
        return res.status(500).json({ error: 'Unable to update character.' });
    }
});

app.get('/api/admin/news', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const posts = await newsPostsCollection
            .find({}, { sort: { createdAt: -1 } })
            .toArray();
        return res.json({
            ok: true,
            posts: posts.map(serializeNewsPost),
        });
    } catch (error) {
        console.error('Admin news load error:', error);
        return res.status(500).json({ error: 'Unable to load news posts.' });
    }
});

app.post('/api/admin/news', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const blocks = normalizeNewsBlocks(req.body?.blocks);
    const paragraphs = normalizeNewsParagraphs(req.body?.paragraphs);
    const changes = normalizeNewsChanges(req.body?.changes);
    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        const now = new Date();
        const post = {
            title,
            blocks,
            paragraphs,
            changes,
            author: req.authUser.username,
            createdAt: now,
            updatedAt: now,
        };
        const result = await newsPostsCollection.insertOne(post);
        return res.status(201).json({
            ok: true,
            post: serializeNewsPost({ ...post, _id: result.insertedId }),
        });
    } catch (error) {
        console.error('Admin news create error:', error);
        return res.status(500).json({ error: 'Unable to create news post.' });
    }
});

app.put('/api/admin/news/:id', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid news post id.' });
    }

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const blocks = normalizeNewsBlocks(req.body?.blocks);
    const paragraphs = normalizeNewsParagraphs(req.body?.paragraphs);
    const changes = normalizeNewsChanges(req.body?.changes);
    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        const existing = await newsPostsCollection.findOne({ _id: new ObjectId(id) });
        if (!existing) {
            return res.status(404).json({ error: 'News post not found.' });
        }
        const nextPost = {
            title,
            blocks,
            paragraphs,
            changes,
            author: existing.author || req.authUser.username,
            createdAt: existing.createdAt || new Date(),
            updatedAt: new Date(),
        };
        await newsPostsCollection.updateOne(
            { _id: existing._id },
            {
                $set: nextPost,
            }
        );
        return res.json({
            ok: true,
            post: serializeNewsPost({ ...existing, ...nextPost }),
        });
    } catch (error) {
        console.error('Admin news update error:', error);
        return res.status(500).json({ error: 'Unable to update news post.' });
    }
});

app.delete('/api/admin/news/:id', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid news post id.' });
    }

    try {
        const result = await newsPostsCollection.deleteOne({ _id: new ObjectId(id) });
        if (!result.deletedCount) {
            return res.status(404).json({ error: 'News post not found.' });
        }
        return res.json({ ok: true });
    } catch (error) {
        console.error('Admin news delete error:', error);
        return res.status(500).json({ error: 'Unable to delete news post.' });
    }
});

app.get('/api/admin/users', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 0,
                        username: 1,
                        role: 1,
                        profile: 1,
                    },
                    sort: { username: 1 },
                }
            )
            .toArray();

        return res.json({
            ok: true,
            users: users.map((user = {}) => {
                const profile = normalizeUserProfile(user);
                const wins = Number(profile?.ladder?.wins) || 0;
                const losses = Number(profile?.ladder?.losses) || 0;
                const total = wins + losses;
                return {
                    username: typeof user.username === 'string' ? user.username : '',
                    role: typeof user.role === 'string' ? user.role : 'player',
                    ladderRatio: total > 0 ? ((wins / total) * 100).toFixed(2) + '%' : '0.00%',
                };
            }),
        });
    } catch (error) {
        console.error('Admin users list error:', error);
        return res.status(500).json({ error: 'Unable to load player accounts.' });
    }
});

app.get('/api/admin/users/:username', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const username = typeof req.params?.username === 'string' ? req.params.username.trim() : '';
    if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    try {
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const profile = normalizeUserProfile(user);
        const wins = Number(profile?.ladder?.wins) || 0;
        const losses = Number(profile?.ladder?.losses) || 0;
        const total = wins + losses;

        return res.json({
            ok: true,
            username: user.username,
            role: user.role || 'player',
            ladderRatio: total > 0 ? ((wins / total) * 100).toFixed(2) + '%' : '0.00%',
            document: serializeAdminUserDocument(user),
        });
    } catch (error) {
        console.error('Admin user detail error:', error);
        return res.status(500).json({ error: 'Unable to load player account.' });
    }
});

app.put('/api/admin/users/:username', requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const originalUsername = typeof req.params?.username === 'string' ? req.params.username.trim() : '';
    const document = req.body && typeof req.body === 'object' ? req.body : null;
    if (!originalUsername || !document) {
        return res.status(400).json({ error: 'A username and document payload are required.' });
    }

    const nextUsername = typeof document.username === 'string' ? document.username.trim() : '';
    if (!nextUsername) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    try {
        const existingUser = await usersCollection.findOne({ username: originalUsername });
        if (!existingUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        if (nextUsername !== originalUsername) {
            const conflictingUser = await usersCollection.findOne({ username: nextUsername });
            if (conflictingUser) {
                return res.status(409).json({ error: 'Username is already taken.' });
            }
        }

        const nextEmail = typeof document.email === 'string' ? document.email.trim().toLowerCase() : '';
        if (nextEmail) {
            const conflictingEmailUser = await usersCollection.findOne({
                email: nextEmail,
                username: { $ne: originalUsername },
            });
            if (conflictingEmailUser) {
                return res.status(409).json({ error: 'Email is already in use.' });
            }
        }

        const nextUser = {
            username: nextUsername,
            usernameLower: nextUsername.toLowerCase(),
            email: nextEmail,
            passwordHash:
                typeof document.passwordHash === 'string' && document.passwordHash.trim()
                    ? document.passwordHash.trim()
                    : existingUser.passwordHash,
            role:
                typeof document.role === 'string' && document.role.trim()
                    ? document.role.trim().toLowerCase()
                    : existingUser.role || 'player',
            createdAt: document.createdAt || existingUser.createdAt,
            savedTeamIndices: Array.isArray(document.savedTeamIndices) ? document.savedTeamIndices : [],
            profile: normalizeUserProfile({
                ...existingUser,
                profile: document.profile || existingUser.profile,
                createdAt: document.createdAt || existingUser.createdAt,
            }),
        };

        await usersCollection.updateOne(
            { _id: existingUser._id },
            {
                $set: nextUser,
            }
        );

        const updatedUser = await usersCollection.findOne({ _id: existingUser._id });
        return res.json({
            ok: true,
            user: serializeAdminUserDocument(updatedUser || { ...existingUser, ...nextUser }),
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Username or email is already in use.' });
        }
        console.error('Admin user update error:', error);
        return res.status(500).json({ error: 'Unable to update player account.' });
    }
});

app.get('/api/users/:username/profile', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { error: validationError, value } = publicProfileLookupSchema.validate({
        username: req.params.username,
    });
    if (validationError) {
        return res.status(400).json({ error: 'Invalid username.' });
    }
    const requestedUsername = value.username.trim();
    const normalizedRequestedUsername = requestedUsername.toLowerCase();
    let user = await usersCollection.findOne({ usernameLower: normalizedRequestedUsername });
    if (!user) {
        user = await usersCollection.findOne({ username: requestedUsername });
    }
    if (!user) {
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        username: 1,
                    },
                }
            )
            .toArray();
        const matchedUser = users.find((candidate) => {
            const candidateUsername =
                typeof candidate?.username === 'string' ? candidate.username.trim().toLowerCase() : '';
            return candidateUsername === normalizedRequestedUsername;
        });
        if (matchedUser?._id) {
            user = await usersCollection.findOne({ _id: matchedUser._id });
            if (user) {
                await usersCollection.updateOne(
                    { _id: matchedUser._id },
                    {
                        $set: {
                            usernameLower: normalizedRequestedUsername,
                        },
                    }
                );
            }
        }
    }
    if (!user) {
        return res.status(404).json({ error: 'Player not found.' });
    }

    return res.json({
        ok: true,
        user: serializePublicUserProfile(user),
    });
});

app.get('/api/clans/:clanName/profile', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const requestedClanName = typeof req.params?.clanName === 'string' ? req.params.clanName.trim() : '';
    if (!requestedClanName || requestedClanName.length > 35) {
        return res.status(400).json({ error: 'Invalid clan name.' });
    }

    try {
        const clan = await buildPublicClanProfile(requestedClanName);
        if (!clan) {
            return res.status(404).json({ error: 'Clan not found.' });
        }
        return res.json({
            ok: true,
            clan,
        });
    } catch (error) {
        console.error('Public clan profile error:', error);
        return res.status(500).json({ error: 'Unable to load clan.' });
    }
});

app.get('/api/leaderboards/sidebar', async (req, res) => {
    try {
        const leaderboards = await buildSidebarLeaderboards();
        return res.json({
            ok: true,
            leaderboards,
        });
    } catch (error) {
        console.error('Sidebar leaderboard error:', error);
        return res.status(500).json({ error: 'Unable to load leaderboards.' });
    }
});

app.get('/api/community/users', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 0,
                        username: 1,
                        role: 1,
                        createdAt: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const communityUsers = users
            .filter((user) => !isGameBotUsername(user?.username))
            .map(serializeCommunityUserSummary)
            .sort((left, right) => {
                const rankDelta =
                    (Number(left?.ladder?.ladderRank) || Number.MAX_SAFE_INTEGER) -
                    (Number(right?.ladder?.ladderRank) || Number.MAX_SAFE_INTEGER);
                if (rankDelta !== 0) {
                    return rankDelta;
                }
                const levelDelta = (Number(right?.ladder?.level) || 0) - (Number(left?.ladder?.level) || 0);
                if (levelDelta !== 0) {
                    return levelDelta;
                }
                const winsDelta = (Number(right?.ladder?.wins) || 0) - (Number(left?.ladder?.wins) || 0);
                if (winsDelta !== 0) {
                    return winsDelta;
                }
                return String(left?.username || '').localeCompare(String(right?.username || ''));
            });

        return res.json({
            ok: true,
            users: communityUsers,
            stats: {
                totalRegisteredPlayers: communityUsers.length,
                rankedPlayers: communityUsers.filter((user) => Number(user?.ladder?.totalGames) > 0).length,
                clanPlayers: communityUsers.filter((user) => user?.clan?.name).length,
            },
        });
    } catch (error) {
        console.error('Community users load error:', error);
        return res.status(500).json({ error: 'Unable to load community players.' });
    }
});

app.post('/api/profile/avatar', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = avatarUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid direct image URL is required.' });
        }

        await validateAvatarUrl(value.avatarUrl);
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        profile.avatarUrl = value.avatarUrl;
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );
        const updatedUser = {
            ...user,
            profile,
        };
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Unable to update avatar.' });
    }
});

app.post('/api/profile/matchmaking', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = matchmakingSettingsSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid matchmaking preference is required.' });
        }
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        profile.matchmaking = {
            ...profile.matchmaking,
            battleBotEnabled: Boolean(value.battleBotEnabled),
        };
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );
        return res.json({
            ok: true,
            user: serializeUserForClient({
                ...user,
                profile,
            }),
        });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to update matchmaking settings.' });
    }
});

app.post('/api/clan/avatar', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = avatarUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid direct image URL is required.' });
        }

        await validateAvatarUrl(value.avatarUrl);
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'manageAvatar')) {
            return res.status(403).json({ error: 'Your clan rank cannot manage the clan avatar.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                entryProfile.clan = {
                    ...entryProfile.clan,
                    avatarUrl: value.avatarUrl,
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Unable to update clan avatar.' });
    }
});

app.post('/api/profile/reset-account', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        profile.recentQuickGames = [];
        profile.recentPrivateGames = [];
        profile.recentLadderGames = [];
        profile.ladder.level = 1;
        profile.ladder.rank = 'Academy Student';
        profile.ladder.rankHatUrl = 'assets/images/hats/academy.png';
        profile.ladder.experiencePoints = 0;
        profile.ladder.experienceIntoLevel = 0;
        profile.ladder.experienceForNextLevel = getExperienceRequiredForNextLevel(1);
        profile.ladder.experienceToNextLevel = getExperienceRequiredForNextLevel(1);
        profile.ladder.ladderRank = null;
        profile.ladder.wins = 0;
        profile.ladder.losses = 0;
        profile.ladder.streak = 0;
        profile.ladder.highestStreak = 0;
        profile.ladder.highestLevel = 1;
        profile.ladder.famePoints = 0;
        profile.ladder.isHokage = false;

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );
        await recalculatePlayerLadderStandings();
        const updatedUser = await usersCollection.findOne({ _id: user._id });

        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser || { ...user, profile }),
        });
    } catch (error) {
        console.error('Reset account error:', error);
        return res.status(500).json({ error: 'Unable to reset account.' });
    }
});

app.post('/api/profile/backgrounds', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = backgroundUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Direct background URLs are required.' });
        }

        await validateBackgroundUrl(value.selectionUrl);
        await validateBackgroundUrl(value.ingameUrl);

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const profile = normalizeUserProfile(user);
        profile.backgrounds = {
            selectionUrl: value.selectionUrl,
            ingameUrl: value.ingameUrl,
        };

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );

        return res.json({
            ok: true,
            user: serializeUserForClient({
                ...user,
                profile,
            }),
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Unable to update backgrounds.' });
    }
});

app.post('/api/clan/create', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanCreateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid clan details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        if (profile.clan && profile.clan.name) {
            return res.status(409).json({ error: 'You are already in a clan.' });
        }

        const requestedName = value.name.trim();
        const requestedAbbreviation = value.abbreviation.trim();
        const requestedNameLower = requestedName.toLowerCase();
        const requestedAbbreviationLower = requestedAbbreviation.toLowerCase();

        const existingClanHolder = await usersCollection.findOne(
            {},
            {
                projection: {
                    _id: 1,
                    profile: 1,
                },
            }
        );

        if (existingClanHolder) {
            const users = await usersCollection
                .find(
                    {},
                    {
                        projection: {
                            _id: 1,
                            profile: 1,
                        },
                    }
                )
                .toArray();
            const duplicateClan = users.some((entry) => {
                const clan = normalizeUserProfile(entry).clan;
                if (!clan || !clan.name) {
                    return false;
                }
                const clanName = String(clan.name || '').trim().toLowerCase();
                const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
                return clanName === requestedNameLower || clanAbbreviation === requestedAbbreviationLower;
            });
            if (duplicateClan) {
                return res.status(409).json({ error: 'Clan name or abbreviation is already in use.' });
            }
        }

        const now = new Date();
        profile.clan = {
            name: requestedName,
            abbreviation: requestedAbbreviation,
            rankKey: 'clanLeader',
            customRankName: '',
            rank: DEFAULT_CLAN_RANK_NAMES.clanLeader,
            avatarUrl: '',
            joinedAt: now,
            bio: value.bio || '',
            createdBy: user.username,
            createdAt: now,
            customRankNames: normalizeClanRankNames(),
        };

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );

        return res.status(201).json({
            ok: true,
            user: serializeUserForClient({
                ...user,
                profile,
            }),
        });
    } catch (error) {
        console.error('Clan creation error:', error);
        return res.status(500).json({ error: 'Unable to create clan.' });
    }
});

app.post('/api/clan/leave', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;

        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const isClanLeader = String(clan.rankKey || '').trim() === 'clanLeader';
        const allUsers = await usersCollection.find({}).toArray();
        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }

            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            if (!entryClanName) {
                return false;
            }

            if (clanAbbreviation && entryClanAbbreviation) {
                return entryClanName === clanName && entryClanAbbreviation === clanAbbreviation;
            }

            return entryClanName === clanName;
        });

        const otherClanLeaders = clanMembers.filter((entry = {}) => {
            if (String(entry.username || '') === String(user.username || '')) {
                return false;
            }
            const entryClan = normalizeUserProfile(entry).clan;
            return String(entryClan && entryClan.rankKey ? entryClan.rankKey : '').trim() === 'clanLeader';
        });

        const shouldDisbandClan = isClanLeader && otherClanLeaders.length === 0;

        if (shouldDisbandClan) {
            await Promise.all(clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                entryProfile.clan = null;
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile
                        }
                    }
                );
            }));
        } else {
            profile.clan = null;
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile
                    }
                }
            );
        }

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            disbanded: shouldDisbandClan,
            user: serializeUserForClient(updatedUser)
        });
    } catch (error) {
        console.error('Failed to leave clan', error);
        return res.status(500).json({ error: 'Unable to leave clan right now.' });
    }
});

app.post('/api/clan/update', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanUpdateSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid clan details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'manageInfo')) {
            return res.status(403).json({ error: 'Your clan rank cannot manage clan info.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const requestedName = value.name.trim();
        const requestedAbbreviation = value.abbreviation.trim();
        const requestedNameLower = requestedName.toLowerCase();
        const requestedAbbreviationLower = requestedAbbreviation.toLowerCase();

        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        const duplicateClan = allUsers.some((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            const sameCurrentClan = currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
            if (sameCurrentClan) {
                return false;
            }
            return entryClanName === requestedNameLower || entryClanAbbreviation === requestedAbbreviationLower;
        });

        if (duplicateClan) {
            return res.status(409).json({ error: 'Clan name or abbreviation is already in use.' });
        }

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                entryProfile.clan = {
                    ...entryProfile.clan,
                    name: requestedName,
                    abbreviation: requestedAbbreviation,
                    bio: value.bio || '',
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan update error:', error);
        return res.status(500).json({ error: 'Unable to update clan.' });
    }
});

app.post('/api/clan/ranks', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanRankNamesSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid custom rank details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'assignRanks')) {
            return res.status(403).json({ error: 'Your clan rank cannot assign ranks.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        const normalizedName = value.name.trim();
        const previousName = value.previousName.trim();
        const rankKey = value.rankKey;
        const existingRankNames = normalizeClanRankNames(clan.customRankNames);
        const updatedRankNames = {
            ...existingRankNames,
            [rankKey]: [...existingRankNames[rankKey]],
        };

        if (previousName) {
            const targetIndex = updatedRankNames[rankKey].findIndex((entry) => entry === previousName);
            if (targetIndex === -1) {
                return res.status(404).json({ error: 'Custom rank not found.' });
            }
            const duplicateElsewhere = updatedRankNames[rankKey].some(
                (entry, index) => index !== targetIndex && entry.toLowerCase() === normalizedName.toLowerCase()
            );
            if (duplicateElsewhere) {
                return res.status(409).json({ error: 'That custom rank already exists for this tier.' });
            }
            updatedRankNames[rankKey][targetIndex] = normalizedName;
        } else {
            const duplicateRank = updatedRankNames[rankKey].some(
                (entry) => entry.toLowerCase() === normalizedName.toLowerCase()
            );
            if (duplicateRank) {
                return res.status(409).json({ error: 'That custom rank already exists for this tier.' });
            }
            updatedRankNames[rankKey].push(normalizedName);
        }

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                const entryRankKey = normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan);
                const nextCustomRankName =
                    entryProfile.clan.customRankName === previousName ? normalizedName : entryProfile.clan.customRankName;
                entryProfile.clan = {
                    ...entryProfile.clan,
                    customRankNames: updatedRankNames,
                    rankKey: entryRankKey,
                    rank:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? resolveClanRankLabel(entryRankKey, nextCustomRankName)
                        : resolveBaseClanRankLabel(entryRankKey),
                    customRankName:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? nextCustomRankName
                            : '',
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan rank update error:', error);
        return res.status(500).json({ error: 'Unable to update clan ranks.' });
    }
});

app.post('/api/clan/ranks/delete', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanRankDeleteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Valid custom rank details are required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const currentClanName = String(clan.name || '').trim().toLowerCase();
        const currentClanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        _id: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const clanMembers = allUsers.filter((entry = {}) => {
            const entryClan = normalizeUserProfile(entry).clan;
            if (!entryClan || !entryClan.name) {
                return false;
            }
            const entryClanName = String(entryClan.name || '').trim().toLowerCase();
            const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
            return currentClanAbbreviation && entryClanAbbreviation
                ? entryClanName === currentClanName && entryClanAbbreviation === currentClanAbbreviation
                : entryClanName === currentClanName;
        });

        const rankKey = value.rankKey;
        const targetName = value.name.trim();
        const existingRankNames = normalizeClanRankNames(clan.customRankNames);
        const targetIndex = existingRankNames[rankKey].findIndex((entry) => entry === targetName);
        if (targetIndex === -1) {
            return res.status(404).json({ error: 'Custom rank not found.' });
        }

        const updatedRankNames = {
            ...existingRankNames,
            [rankKey]: existingRankNames[rankKey].filter((entry) => entry !== targetName),
        };

        await Promise.all(
            clanMembers.map(async (entry = {}) => {
                const entryProfile = normalizeUserProfile(entry);
                if (!entryProfile.clan) {
                    return;
                }
                const entryRankKey = normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan);
                const nextCustomRankName =
                    entryProfile.clan.customRankName === targetName ? '' : entryProfile.clan.customRankName;
                entryProfile.clan = {
                    ...entryProfile.clan,
                    customRankNames: updatedRankNames,
                    rankKey: entryRankKey,
                    rank:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? resolveClanRankLabel(entryRankKey, nextCustomRankName)
                            : resolveBaseClanRankLabel(entryRankKey),
                    customRankName:
                        nextCustomRankName && updatedRankNames[entryRankKey].includes(nextCustomRankName)
                            ? nextCustomRankName
                            : '',
                };
                await usersCollection.updateOne(
                    { _id: entry._id },
                    {
                        $set: {
                            profile: entryProfile,
                        },
                    }
                );
            })
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan rank delete error:', error);
        return res.status(500).json({ error: 'Unable to delete custom rank.' });
    }
});

app.get('/api/clan/members', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const allUsers = await usersCollection
            .find(
                {},
                {
                    projection: {
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const members = allUsers
            .map((entry = {}) => ({
                username: entry.username,
                profile: normalizeUserProfile(entry),
            }))
            .filter((entry) => {
                const entryClan = entry.profile.clan;
                if (!entryClan || !entryClan.name) {
                    return false;
                }
                const entryClanName = String(entryClan.name || '').trim().toLowerCase();
                const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
                return clanAbbreviation && entryClanAbbreviation
                    ? entryClanName === clanName && entryClanAbbreviation === clanAbbreviation
                    : entryClanName === clanName;
            })
            .map((entry) => ({
                username: entry.username,
                rankKey: entry.profile.clan.rankKey || 'member',
                customRankName: entry.profile.clan.customRankName || '',
                rank: entry.profile.clan.rank || DEFAULT_CLAN_RANK_NAMES.member,
            }))
            .sort((left, right) => left.username.localeCompare(right.username));

        return res.json({ ok: true, members });
    } catch (error) {
        console.error('Clan member list error:', error);
        return res.status(500).json({ error: 'Unable to load clan members.' });
    }
});

app.post('/api/clan/member-rank', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanMemberRankSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid member and rank are required.' });
        }

        const actingUser = await usersCollection.findOne({ username: req.authUser.username });
        if (!actingUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const actingProfile = normalizeUserProfile(actingUser);
        const clan = actingProfile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'assignRanks')) {
            return res.status(403).json({ error: 'Your clan rank cannot assign ranks.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const targetUser = await usersCollection.findOne({ usernameLower: value.username.trim().toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const targetProfile = normalizeUserProfile(targetUser);
        const targetClan = targetProfile.clan;
        if (!targetClan || !targetClan.name) {
            return res.status(400).json({ error: 'That player is not in a clan.' });
        }

        const targetClanName = String(targetClan.name || '').trim().toLowerCase();
        const targetClanAbbreviation = String(targetClan.abbreviation || '').trim().toLowerCase();
        const sameClan = clanAbbreviation && targetClanAbbreviation
            ? targetClanName === clanName && targetClanAbbreviation === clanAbbreviation
            : targetClanName === clanName;
        if (!sameClan) {
            return res.status(400).json({ error: 'That player is not in your clan.' });
        }

        const requestedCustomRankName = value.customRankName.trim();
        const allowedCustomRanks = normalizeClanRankNames(clan.customRankNames)[value.rankKey];
        if (requestedCustomRankName && !allowedCustomRanks.includes(requestedCustomRankName)) {
            return res.status(400).json({ error: 'That custom rank does not exist for the selected tier.' });
        }

        if (value.rankKey === 'clanLeader') {
            const allUsers = await usersCollection
                .find(
                    {},
                    {
                        projection: {
                            _id: 1,
                            username: 1,
                            profile: 1,
                        },
                    }
                )
                .toArray();

            const clanMembers = allUsers.filter((entry = {}) => {
                const entryClan = normalizeUserProfile(entry).clan;
                if (!entryClan || !entryClan.name) {
                    return false;
                }
                const entryClanName = String(entryClan.name || '').trim().toLowerCase();
                const entryClanAbbreviation = String(entryClan.abbreviation || '').trim().toLowerCase();
                return clanAbbreviation && entryClanAbbreviation
                    ? entryClanName === clanName && entryClanAbbreviation === clanAbbreviation
                    : entryClanName === clanName;
            });

            await Promise.all(
                clanMembers.map(async (entry = {}) => {
                    const entryProfile = normalizeUserProfile(entry);
                    if (!entryProfile.clan) {
                        return;
                    }
                    const isTarget =
                        String(entry.username || '').trim().toLowerCase() === targetUser.username.trim().toLowerCase();
                    const nextRankKey = isTarget
                        ? 'clanLeader'
                        : normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan) === 'clanLeader'
                            ? 'leader'
                            : normalizeClanRankKey(entryProfile.clan.rankKey, entry, entryProfile.clan);
                    const nextCustomRankName = isTarget ? requestedCustomRankName : '';
                    entryProfile.clan = {
                        ...entryProfile.clan,
                        rankKey: nextRankKey,
                        customRankName: nextCustomRankName,
                        rank: nextCustomRankName
                            ? resolveClanRankLabel(nextRankKey, nextCustomRankName)
                            : resolveBaseClanRankLabel(nextRankKey),
                    };
                    await usersCollection.updateOne(
                        { _id: entry._id },
                        {
                            $set: {
                                profile: entryProfile,
                            },
                        }
                    );
                })
            );
        } else {
            targetProfile.clan = {
                ...targetProfile.clan,
                rankKey: value.rankKey,
                customRankName: requestedCustomRankName,
                rank:
                    requestedCustomRankName
                        ? resolveClanRankLabel(value.rankKey, requestedCustomRankName)
                        : resolveBaseClanRankLabel(value.rankKey),
            };
            await usersCollection.updateOne(
                { _id: targetUser._id },
                {
                    $set: {
                        profile: targetProfile,
                    },
                }
            );
        }

        const updatedUser = await usersCollection.findOne({ username: req.authUser.username });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan member rank update error:', error);
        return res.status(500).json({ error: 'Unable to update member rank.' });
    }
});

app.get('/api/clan/recruitment', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const clan = profile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You are not in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const users = await usersCollection
            .find(
                {},
                {
                    projection: {
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();

        const outgoingInvitations = [];
        users.forEach((entry = {}) => {
            const entryProfile = normalizeUserProfile(entry);
            entryProfile.clanInvitations.forEach((invite) => {
                const inviteClanName = String(invite.clanName || '').trim().toLowerCase();
                const inviteClanAbbreviation = String(invite.clanAbbreviation || '').trim().toLowerCase();
                const sameClan = clanAbbreviation && inviteClanAbbreviation
                    ? inviteClanName === clanName && inviteClanAbbreviation === clanAbbreviation
                    : inviteClanName === clanName;
                if (!sameClan) {
                    return;
                }
                outgoingInvitations.push({
                    username: entry.username,
                    invitedAt: invite.invitedAt || null,
                });
            });
        });

        return res.json({
            ok: true,
            invitations: outgoingInvitations.sort((left, right) => {
                const leftTime = new Date(left.invitedAt || 0).getTime() || 0;
                const rightTime = new Date(right.invitedAt || 0).getTime() || 0;
                return rightTime - leftTime;
            }),
        });
    } catch (error) {
        console.error('Clan recruitment lookup error:', error);
        return res.status(500).json({ error: 'Unable to load clan invitations.' });
    }
});

app.post('/api/clan/invite', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanInviteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid username is required.' });
        }

        const inviter = await usersCollection.findOne({ username: req.authUser.username });
        if (!inviter) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const inviterProfile = normalizeUserProfile(inviter);
        const clan = inviterProfile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You must be in a clan to invite players.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'invite')) {
            return res.status(403).json({ error: 'Your clan rank cannot invite players.' });
        }

        const requestedUsername = value.username.trim();
        if (requestedUsername.toLowerCase() === inviter.username.toLowerCase()) {
            return res.status(400).json({ error: 'You cannot invite yourself.' });
        }

        const targetUser = await usersCollection.findOne({ usernameLower: requestedUsername.toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const targetProfile = normalizeUserProfile(targetUser);
        if (targetProfile.clan && targetProfile.clan.name) {
            return res.status(409).json({ error: 'That player is already in a clan.' });
        }

        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const alreadyInvited = targetProfile.clanInvitations.some((invite) => {
            const inviteClanName = String(invite.clanName || '').trim().toLowerCase();
            const inviteClanAbbreviation = String(invite.clanAbbreviation || '').trim().toLowerCase();
            return clanAbbreviation && inviteClanAbbreviation
                ? inviteClanName === clanName && inviteClanAbbreviation === clanAbbreviation
                : inviteClanName === clanName;
        });

        if (alreadyInvited) {
            return res.status(409).json({ error: 'That player already has an invitation from your clan.' });
        }

        targetProfile.clanInvitations = [
            {
                clanName: clan.name,
                clanAbbreviation: clan.abbreviation || '',
                invitedBy: inviter.username,
                invitedUsername: targetUser.username,
                invitedAt: new Date(),
            },
            ...targetProfile.clanInvitations,
        ].slice(0, 50);

        await usersCollection.updateOne(
            { _id: targetUser._id },
            {
                $set: {
                    profile: targetProfile,
                },
            }
        );

        return res.status(201).json({ ok: true });
    } catch (error) {
        console.error('Clan invite error:', error);
        return res.status(500).json({ error: 'Unable to send clan invitation.' });
    }
});

app.post('/api/clan/invite/retract', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanInviteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid username is required.' });
        }

        const inviter = await usersCollection.findOne({ username: req.authUser.username });
        if (!inviter) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const inviterProfile = normalizeUserProfile(inviter);
        const clan = inviterProfile.clan;
        if (!clan || !clan.name) {
            return res.status(400).json({ error: 'You must be in a clan to retract invitations.' });
        }
        if (!clanRankHasPermission(clan.rankKey, 'invite')) {
            return res.status(403).json({ error: 'Your clan rank cannot retract invitations.' });
        }

        const targetUser = await usersCollection.findOne({ usernameLower: value.username.trim().toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        const targetProfile = normalizeUserProfile(targetUser);
        const clanName = String(clan.name || '').trim().toLowerCase();
        const clanAbbreviation = String(clan.abbreviation || '').trim().toLowerCase();
        const startingCount = targetProfile.clanInvitations.length;

        targetProfile.clanInvitations = targetProfile.clanInvitations.filter((invite) => {
            const inviteClanName = String(invite.clanName || '').trim().toLowerCase();
            const inviteClanAbbreviation = String(invite.clanAbbreviation || '').trim().toLowerCase();
            const sameClan = clanAbbreviation && inviteClanAbbreviation
                ? inviteClanName === clanName && inviteClanAbbreviation === clanAbbreviation
                : inviteClanName === clanName;
            return !sameClan;
        });

        if (targetProfile.clanInvitations.length === startingCount) {
            return res.status(404).json({ error: 'No active invitation found for that player.' });
        }

        await usersCollection.updateOne(
            { _id: targetUser._id },
            {
                $set: {
                    profile: targetProfile,
                },
            }
        );

        return res.json({ ok: true });
    } catch (error) {
        console.error('Clan invite retract error:', error);
        return res.status(500).json({ error: 'Unable to retract clan invitation.' });
    }
});

app.get('/api/clan/invitations', requireSession, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        const invitations = Array.isArray(profile.clanInvitations) ? profile.clanInvitations : [];
        if (!invitations.length) {
            return res.json({
                ok: true,
                invitations: [],
            });
        }

        const inviters = await usersCollection
            .find(
                { username: { $in: invitations.map((entry) => entry.invitedBy).filter(Boolean) } },
                {
                    projection: {
                        username: 1,
                        profile: 1,
                    },
                }
            )
            .toArray();
        const inviterMap = new Map(
            inviters.map((entry) => [String(entry.username || '').trim().toLowerCase(), normalizeUserProfile(entry)])
        );
        const validInvitations = invitations.filter((entry) => {
            const inviterProfile = inviterMap.get(String(entry.invitedBy || '').trim().toLowerCase());
            const inviterClan = inviterProfile && inviterProfile.clan ? inviterProfile.clan : null;
            if (!inviterClan || !inviterClan.name) {
                return false;
            }
            const sameClanName =
                String(inviterClan.name || '').trim().toLowerCase() === String(entry.clanName || '').trim().toLowerCase();
            if (!sameClanName) {
                return false;
            }
            if (entry.clanAbbreviation) {
                return (
                    String(inviterClan.abbreviation || '').trim().toLowerCase() ===
                    String(entry.clanAbbreviation || '').trim().toLowerCase()
                );
            }
            return true;
        });

        if (validInvitations.length !== invitations.length) {
            profile.clanInvitations = validInvitations;
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        profile,
                    },
                }
            );
        }

        return res.json({
            ok: true,
            invitations: validInvitations,
        });
    } catch (error) {
        console.error('Clan invitations lookup error:', error);
        return res.status(500).json({ error: 'Unable to load clan invitations.' });
    }
});

app.post('/api/clan/invitations/accept', requireSession, async (req, res) => {
    try {
        const { error: validationError, value } = clanInviteSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'A valid clan name is required.' });
        }

        const user = await usersCollection.findOne({ username: req.authUser.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const profile = normalizeUserProfile(user);
        if (profile.clan && profile.clan.name) {
            return res.status(409).json({ error: 'You are already in a clan.' });
        }

        const requestedClanName = value.username.trim().toLowerCase();
        const invitation = (Array.isArray(profile.clanInvitations) ? profile.clanInvitations : []).find(
            (entry) => String(entry.clanName || '').trim().toLowerCase() === requestedClanName
        );
        if (!invitation) {
            return res.status(404).json({ error: 'Clan invitation not found.' });
        }

        const inviter = await usersCollection.findOne({ username: invitation.invitedBy });
        if (!inviter) {
            return res.status(404).json({ error: 'Inviting clan could not be found.' });
        }

        const inviterProfile = normalizeUserProfile(inviter);
        const inviterClan = inviterProfile.clan;
        if (!inviterClan || !inviterClan.name) {
            return res.status(404).json({ error: 'Inviting clan could not be found.' });
        }

        const sameClanName =
            String(inviterClan.name || '').trim().toLowerCase() === String(invitation.clanName || '').trim().toLowerCase();
        if (!sameClanName) {
            return res.status(409).json({ error: 'That invitation is no longer valid.' });
        }

        profile.clan = {
            name: inviterClan.name,
            abbreviation: inviterClan.abbreviation || '',
            rankKey: 'member',
            customRankName: '',
            rank: resolveBaseClanRankLabel('member'),
            avatarUrl: inviterClan.avatarUrl || '',
            joinedAt: new Date(),
            bio: inviterClan.bio || '',
            experiencePoints: Math.max(0, Number(inviterClan.experiencePoints) || 0),
            createdBy: inviterClan.createdBy || inviter.username,
            createdAt: inviterClan.createdAt || new Date(),
            customRankNames: normalizeClanRankNames(inviterClan.customRankNames),
        };
        profile.clanInvitations = (Array.isArray(profile.clanInvitations) ? profile.clanInvitations : []).filter(
            (entry) => String(entry.clanName || '').trim().toLowerCase() !== requestedClanName
        );

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    profile,
                },
            }
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return res.json({
            ok: true,
            user: serializeUserForClient(updatedUser),
        });
    } catch (error) {
        console.error('Clan invitation accept error:', error);
        return res.status(500).json({ error: 'Unable to accept clan invitation.' });
    }
});

// Basic static routes for the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get(['/selection-login', '/selection-login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'selection-login.html'));
});

app.get(['/register', '/register.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get(['/selection', '/selection.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'selection.html'));
});

app.get(['/ingame', '/ingame.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'ingame.html'));
});

app.get(['/profile', '/profile.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get(['/community', '/community.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'community.html'));
});

app.get(['/events', '/events.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'events.html'));
});

app.get(['/manual', '/manual.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'manual.html'));
});

app.get(['/changeavatar', '/changeavatar.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'changeavatar.html'));
});

app.get(['/resetaccount', '/resetaccount.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'resetaccount.html'));
});

app.get(['/changebackgrounds', '/changebackgrounds.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'changebackgrounds.html'));
});

app.get(['/clan-panel', '/clan panel.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'clan panel.html'));
});

app.get(['/editmission', '/editmission.html'], requireSession, async (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.redirect('/');
    }
    return res.sendFile(path.join(__dirname, 'editmission.html'));
});

const startServer = async () => {
    await initDb();

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Naruto-Arena API listening on http://localhost:${PORT}`);
    });
    attachWebSocketSupport(server);

    let httpsServer = null;
    if (HTTPS_KEY_PATH && HTTPS_CERT_PATH) {
        try {
            const key = fs.readFileSync(HTTPS_KEY_PATH);
            const cert = fs.readFileSync(HTTPS_CERT_PATH);
            httpsServer = https.createServer({ key, cert }, app);
            httpsServer.listen(PORT + 1, () =>
                console.log(`Naruto-Arena API (HTTPS) listening on https://localhost:${PORT + 1}`)
            );
            attachWebSocketSupport(httpsServer);
        } catch (error) {
            console.error('Failed to start HTTPS server:', error);
        }
    }

    if (!turnSweepTimer) {
        turnSweepTimer = setInterval(() => {
            sweepExpiredMatches().catch((error) => {
                console.error('Failed to sweep expired matches:', error);
            });
        }, 2000);
    }

    process.on('SIGINT', async () => {
        if (turnSweepTimer) {
            clearInterval(turnSweepTimer);
            turnSweepTimer = null;
        }
        wsConnections.forEach((ws) => {
            try {
                ws.close();
            } catch (error) {
                // Ignore socket close failures.
            }
        });
        wsConnections.clear();
        if (mongoClient) {
            await mongoClient.close();
        }
        server.close(() => process.exit(0));
        if (httpsServer) {
            httpsServer.close(() => {});
        }
        try {
            wsServer.close();
        } catch (error) {
            // Ignore websocket server shutdown failures.
        }
    });
};

startServer().catch((error) => {
    console.error('Failed to initialize the server:', error);
    process.exit(1);
});
