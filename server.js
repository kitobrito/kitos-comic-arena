require('dotenv').config();
const fs = require('fs');
const https = require('https');
const path = require('path');
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
const battleLogic = require('./battleLogic');
let charactersData = require('./characters');

const app = express();

const PORT = process.env.PORT || 4000;
const TURN_DURATION_MS = 60 * 1000;
const MATCH_FOUND_HOLD_MS = 3 * 1000;
const DEFAULT_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB || 'naruto-arena';
const USERS_COLLECTION = process.env.MONGODB_USERS_COLLECTION || 'users';
const MATCHES_COLLECTION = process.env.MONGODB_MATCHES_COLLECTION || 'matches';
const APP_STATE_COLLECTION = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const NEWS_POSTS_COLLECTION = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const CHARACTERS_FILE_PATH = path.join(__dirname, 'characters.js');
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'naruto_session';
const SESSION_MAX_AGE_MS =
    Number.parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 7 * 24 * 60 * 60 * 1000;
const ALLOW_INSECURE_HTTP = process.env.ALLOW_INSECURE_HTTP === 'true';
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH;
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH;
const LATEST_CHARACTER_RELEASES = [
    { label: 'Rock Lee', characterId: 'rock-lee' },
    { label: 'Aburame Shino', characterId: 'aburame-shino' },
    { label: 'Latest Character 3', characterId: '' },
];
const DEFAULT_PROFILE_AVATAR = 'https://i.postimg.cc/3JqVcPXm/default.png';
const LEGACY_DEFAULT_PROFILE_AVATAR = 'https://i.postimg.cc/zG3W1w6K/itachi.png';

let mongoClient;
let usersCollection;
let matchesCollection;
let appStateCollection;
let newsPostsCollection;

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
    { minLevel: 46, rank: 'Kage', hatUrl: 'hats/kage.png' },
    { minLevel: 41, rank: 'Akatsuki', hatUrl: 'hats/akatsuki.png' },
    { minLevel: 36, rank: 'Jinchuriki', hatUrl: 'hats/jinch.png' },
    { minLevel: 31, rank: 'Sannin', hatUrl: 'hats/sannin.png' },
    { minLevel: 26, rank: 'Jounin', hatUrl: 'hats/jounin.png' },
    { minLevel: 21, rank: 'Anbu', hatUrl: 'hats/anbu.png' },
    { minLevel: 16, rank: 'Missing-Nin', hatUrl: 'hats/missingnin.png' },
    { minLevel: 12, rank: 'Chunnin', hatUrl: 'hats/chunin.png' },
    { minLevel: 6, rank: 'Genin', hatUrl: 'hats/genin.png' },
    { minLevel: 1, rank: 'Academy Student', hatUrl: 'hats/academy.png' },
];
const HOKAGE_RANK_INFO = {
    rank: 'Hokage',
    hatUrl: 'hats/hokage.png',
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
        ladder: {
            level: 1,
            rank: 'Academy Student',
            rankHatUrl: 'hats/academy.png',
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

const normalizeUserProfile = (user = {}) => {
    const defaults = buildDefaultUserProfile(user);
    const source = user.profile && typeof user.profile === 'object' ? user.profile : {};
    const ladder = source.ladder && typeof source.ladder === 'object' ? source.ladder : {};
    const activity = source.activity && typeof source.activity === 'object' ? source.activity : {};
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
        recentLadderGames: normalizeRecentLadderGames(source.recentLadderGames),
        recentQuickGamesCount24Hours: normalizeRecentQuickGames(source.recentQuickGames).length,
        recentPrivateGamesCount24Hours: normalizeRecentQuickGames(source.recentPrivateGames).length,
        recentLadderGamesCount24Hours: normalizeRecentLadderGames(source.recentLadderGames).length,
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
            streak: Number.isFinite(Number(ladder.streak)) ? Number(ladder.streak) : defaults.ladder.streak,
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
        },
    };
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
            const opponentUsername = usernames.find((name) => name !== user.username) || '';
            const profile = normalizeUserProfile(user);
            profile.recentQuickGames = normalizeRecentQuickGames([
                {
                    playedAt: endedDate,
                    opponentUsername,
                    winnerUsername: winnerUsername || '',
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
            const opponentUsername = usernames.find((name) => name !== user.username) || '';
            const profile = normalizeUserProfile(user);
            profile.recentPrivateGames = normalizeRecentQuickGames([
                {
                    playedAt: endedDate,
                    opponentUsername,
                    winnerUsername: winnerUsername || '',
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

    if (match.mode === 'private') {
        await recordRecentPrivateGameForUsers({
            players: match.players || [],
            winnerUsername: winnerUsername || '',
            endedAt,
        });
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
    if (users.length < 2) {
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
        const opponentUsername = usernames.find((entry) => entry !== username) || '';
        const opponentProfile = initialProfiles.get(opponentUsername) || buildDefaultUserProfile();
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
            profile.ladder.streak = 0;
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
                opponentUsername,
                winnerUsername: winnerUsername || '',
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
        skills: (Array.isArray(character.skills) ? character.skills : []).map((skill = {}) => ({
            id: typeof skill.id === 'string' ? skill.id : '',
            name: typeof skill.name === 'string' ? skill.name : '',
            skillimage: typeof skill.skillimage === 'string' ? skill.skillimage : '',
        })),
    }));

let characterCatalog = buildCharacterCatalog();

const saveCharactersDataFile = async (nextCharacters) => {
    const serialized =
        'const characters = ' +
        JSON.stringify(nextCharacters, null, 4) +
        ';\n\nif (typeof module !== \'undefined\') {\n    module.exports = characters;\n}\n';
    await fs.promises.writeFile(CHARACTERS_FILE_PATH, serialized, 'utf8');
    charactersData = nextCharacters;
    characterCatalog = buildCharacterCatalog();
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

const allowedOrigins = (
    process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:4000,https://localhost:4001'
)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);
app.use(express.static(path.join(__dirname)));
app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:', '*'],
                connectSrc: ["'self'", ...allowedOrigins],
                objectSrc: ["'none'"],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
    })
);
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

// In-memory matchmaking queues (demo)
let quickQueue = [];
let ladderQueue = [];
let privateQueue = [];
const quickMatches = new Map(); // matchId -> { players, createdAt }
const userToMatch = new Map(); // username -> { matchId, opponent }

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

const makeEmptyPendingTurn = () => ({
    queuedByActorSlot: {},
    queueOrder: [],
    unresolvedRandom: 0,
    randomAssignments: createEmptyChakraCost(),
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

    return { chakraPools, economy, turnExpiresAt: new Date(Date.now() + TURN_DURATION_MS) };
};

const buildMatch = (players, aliveLookup = {}) => {
    const { turnOrder, currentTurn } = pickInitialTurn(players);
    const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const matchStartsAt = new Date(Date.now() + MATCH_FOUND_HOLD_MS);
    const { chakraPools, economy, turnExpiresAt } = initializeEconomyState(
        players,
        currentTurn,
        aliveLookup
    );
    const delayedTurnExpiry = turnExpiresAt
        ? new Date(new Date(turnExpiresAt).getTime() + MATCH_FOUND_HOLD_MS)
        : matchStartsAt;
    quickMatches.set(matchId, {
        players,
        createdAt: new Date(),
        matchStartsAt,
        turnOrder,
        currentTurn,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt: delayedTurnExpiry,
    });
    players.forEach((p) => {
        const opponent = players.find((x) => x !== p) || null;
        userToMatch.set(p, { matchId, opponent });
    });
    return {
        matchId,
        matchStartsAt,
        turnOrder,
        currentTurn,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt: delayedTurnExpiry,
    };
};

const enqueuePlayer = (entry) => {
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

const dequeueOpponent = (username, mode = 'quick') => {
    const queue = mode === 'ladder' ? ladderQueue : quickQueue;
    const opponent = queue.find((u) => u.username !== username);
    if (!opponent) return null;
    if (mode === 'ladder') {
        ladderQueue = ladderQueue.filter((u) => u.username !== opponent.username);
    } else {
        quickQueue = quickQueue.filter((u) => u.username !== opponent.username);
    }
    return opponent;
};

const dequeuePrivateOpponent = (username, targetUsername) => {
    const normalizedTarget = typeof targetUsername === 'string' ? targetUsername.trim().toLowerCase() : '';
    if (!normalizedTarget) return null;
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
    const turnExpiresAt = new Date(Date.now() + TURN_DURATION_MS);
    await matchesCollection.updateOne(
        { matchId: match.matchId },
        { $set: { currentTurn, turnOrder, turnExpiresAt } }
    );
    return { ...match, currentTurn, turnOrder, turnExpiresAt };
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
        if (!match.turnExpiresAt) {
            match.turnExpiresAt = new Date(Date.now() + TURN_DURATION_MS);
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

const persistMatchState = async (match, fields = {}) => {
    await matchesCollection.updateOne({ matchId: match.matchId }, { $set: fields });
    if (quickMatches.has(match.matchId)) {
        quickMatches.set(match.matchId, {
            ...(quickMatches.get(match.matchId) || {}),
            ...fields,
        });
    }
};

const normalizeClassChoice = (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

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

const exchangeChakra = ({ match, username, chakraType, cost = 5, spendAssignments = null }) => {
    if (!chakraTypes.includes(chakraType)) {
        throw new Error('Invalid chakra type.');
    }
    const pool = match.chakraPools?.[username];
    if (!pool) {
        throw new Error('Chakra pool unavailable.');
    }
    const exchangeCost = Math.max(1, Number(cost) || 5);
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
    battleLogic.resolvePendingTurnSkills({
        match,
        actingUsername: username,
        characters: charactersData,
    });
    battleLogic.tickStatusesForTurnEnd({
        match,
        endingUsername: username,
    });
    battleLogic.tickCooldownsForTurnEnd({
        match,
        endingUsername: username,
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
                    turnExpiresAt: match.turnExpiresAt,
                    board: match.board,
                    players: match.players,
                    chakraPools: match.chakraPools,
                    economy: match.economy,
                    pendingTurns: match.pendingTurns,
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

    match.turnExpiresAt = new Date(Date.now() + TURN_DURATION_MS);
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
            turnExpiresAt: match.turnExpiresAt,
        });
    }

    return match;
};

const autoAdvanceTurnIfExpired = async (match) => {
    if (!match || !match.turnExpiresAt) return match;
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
    await backfillUserProfiles();
    console.log('Connected to MongoDB.');
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/latest-releases', (req, res) => {
    const faceMap = buildCharacterFaceMap();
    return res.json({
        ok: true,
        releases: LATEST_CHARACTER_RELEASES.map((item) => ({
            label: item.label,
            characterId: item.characterId,
            facePicture: item.characterId ? faceMap.get(item.characterId) || '' : '',
        })),
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

const teamSchema = Joi.array().items(Joi.number().integer().min(0)).length(3);

const matchJoinSchema = Joi.object({
    team: teamSchema.required(),
    mode: Joi.string().valid('quick', 'ladder', 'private').default('quick'),
    targetUsername: Joi.string().trim().min(1).max(64).allow('').optional(),
});

const publicProfileLookupSchema = Joi.object({
    username: Joi.string().trim().min(1).max(64).required(),
});

const avatarUpdateSchema = Joi.object({
    avatarUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048).required(),
});

const backgroundUpdateSchema = Joi.object({
    selectionUrl: Joi.string().trim().allow('').uri({ scheme: ['http', 'https'] }).max(2048).required(),
    ingameUrl: Joi.string().trim().allow('').uri({ scheme: ['http', 'https'] }).max(2048).required(),
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
        return res.status(400).json({ error: 'Invalid team selection.' });
    }
    await usersCollection.updateOne(
        { username: req.authUser.username },
        { $set: { savedTeamIndices: value } }
    );
    return res.json({ ok: true });
});

// Quick matchmaking endpoints (demo/in-memory)
app.post('/api/match/join', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
        const { error: validationError, value } = matchJoinSchema.validate(req.body || {});
        if (validationError) {
            return res.status(400).json({ error: 'Team selection required to join match.' });
        }
        const team = value.team;
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
                chakraPools: hydrated?.chakraPools || null,
                lastChakraGain: hydrated?.economy?.lastChakraGain || null,
                pendingTurn: hydrated ? getPendingTurn(hydrated, username) : makeEmptyPendingTurn(),
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
            const opponent = opponentEntry ? opponentEntry.username : null;
            userToMatch.set(username, { matchId: hydrated.matchId, opponent });
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
                chakraPools: hydrated.chakraPools || null,
                lastChakraGain: hydrated.economy?.lastChakraGain || null,
                pendingTurn: getPendingTurn(hydrated, username),
            });
        }

        // Try to pair with waiting opponent
        const opponent = mode === 'private'
            ? dequeuePrivateOpponent(username, targetUsername)
            : dequeueOpponent(username, mode);
        if (opponent) {
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
                pendingTurn: makeEmptyPendingTurn(),
            });
        }

        // Otherwise enqueue
        enqueuePlayer({ username, team, mode, targetUsername });
        return res.json({ ok: true, queued: true, mode });
    } catch (error) {
        console.error('Matchmaking error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.get('/api/match/status', requireSession, async (req, res) => {
    try {
        const username = req.authUser.username;
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
                board: hydrated?.board || null,
                chakraPools: hydrated?.chakraPools || null,
                lastChakraGain: hydrated?.economy?.lastChakraGain || null,
                pendingTurn: hydrated ? getPendingTurn(hydrated, username) : makeEmptyPendingTurn(),
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
        const opponent = opponentEntry ? opponentEntry.username : null;
        userToMatch.set(username, { matchId: hydrated.matchId, opponent });
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
            board: hydrated.board || null,
            chakraPools: hydrated.chakraPools || null,
            lastChakraGain: hydrated.economy?.lastChakraGain || null,
            pendingTurn: getPendingTurn(hydrated, username),
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
    quickQueue = quickQueue.filter((u) => u.username !== username);
    ladderQueue = ladderQueue.filter((u) => u.username !== username);
    privateQueue = privateQueue.filter((u) => u.username !== username);
    // Do not remove from existing matches here; only queue
    return res.json({ ok: true, cancelled: true });
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
    const opponentEntry = hydrated.players.find((p) => p.username !== req.authUser.username);
    return res.json({
        ok: true,
        matchId,
        mode: hydrated.mode || 'quick',
        status: hydrated.status || 'active',
        winner: hydrated.winner || null,
        surrenderedBy: hydrated.surrenderedBy || null,
        endReason: hydrated.endReason || null,
        endedAt: hydrated.endedAt || null,
        player: playerEntry || null,
        opponent: opponentEntry || null,
        currentTurn: hydrated.currentTurn || null,
        turnOrder: hydrated.turnOrder || null,
        turnExpiresAt: hydrated.turnExpiresAt || null,
        board: hydrated.board || null,
        chakraPools: hydrated.chakraPools || null,
        lastChakraGain: hydrated.economy?.lastChakraGain || null,
        pendingTurn: getPendingTurn(hydrated, req.authUser.username),
        ladderResult: hydrated.ladderResults?.[req.authUser.username] || null,
    });
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
    const ladderResults = await applyMatchCompletionRewards(
        match,
        opponentEntry ? opponentEntry.username : null,
        endedAt
    );
    await matchesCollection.updateOne(
        { matchId },
        {
            $set: {
                mode: match.mode || 'quick',
                status: 'ended',
                winner: opponentEntry ? opponentEntry.username : null,
                surrenderedBy: username,
                endReason: 'surrender',
                endedAt,
                currentTurn: null,
                turnExpiresAt: null,
                ladderResults: ladderResults || null,
            },
        }
    );
    quickMatches.delete(matchId);
    (match.players || []).forEach((player) => userToMatch.delete(player.username));
    return res.json({
        ok: true,
        mode: match.mode || 'quick',
        status: 'ended',
        surrenderedBy: username,
        winner: opponentEntry ? opponentEntry.username : null,
        endReason: 'surrender',
        endedAt,
        ladderResult: ladderResults?.[username] || null,
    });
});

app.post('/api/match/:matchId/turn/end', requireSession, async (req, res) => {
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
        return res.status(409).json({ error: 'Match already ended.' });
    }

    const username = req.authUser.username;
    if (hydrated.currentTurn !== username) {
        return res.status(403).json({ error: 'Not your turn.' });
    }
    const pendingTurn = getPendingTurn(hydrated, username);
    if ((pendingTurn.unresolvedRandom || 0) > 0) {
        return res.status(400).json({ error: 'Resolve random chakra before ending turn.' });
    }

    const updated = await finalizeTurn(hydrated, username);

    return res.json({
        ok: true,
        matchId,
        mode: updated.mode || hydrated.mode || 'quick',
        status: updated.status || 'active',
        winner: updated.winner || null,
        surrenderedBy: updated.surrenderedBy || null,
        endReason: updated.endReason || null,
        endedAt: updated.endedAt || null,
        currentTurn: updated.currentTurn,
        turnOrder: updated.turnOrder,
        turnExpiresAt: updated.turnExpiresAt,
        board: updated.board || null,
        chakraPools: updated.chakraPools,
        lastChakraGain: updated.economy?.lastChakraGain,
        pendingTurn: getPendingTurn(updated, username),
        ladderResult: updated.ladderResults?.[username] || null,
    });
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
        return res.json({
            ok: true,
            chakraPools: hydrated.chakraPools,
            pendingTurn: getPendingTurn(hydrated, username),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to queue skill.' });
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
    const username = req.authUser.username;
    const playerEntry = hydrated.players.find((p) => p.username === username);
    if (!playerEntry) {
        return res.status(403).json({ error: 'Not part of this match.' });
    }
    if (hydrated.currentTurn !== username) {
        return res.status(403).json({ error: 'Not your turn.' });
    }
    const changed = cancelQueuedSkillForActorSlot({ match: hydrated, username, actorSlot });
    if (changed) {
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
            pendingTurns: hydrated.pendingTurns,
        });
    }
    return res.json({
        ok: true,
        chakraPools: hydrated.chakraPools,
        pendingTurn: getPendingTurn(hydrated, username),
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
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
    reorderQueuedSkills({ match: hydrated, username, actorSlots });
    await persistMatchState(hydrated, {
        pendingTurns: hydrated.pendingTurns,
    });
    return res.json({
        ok: true,
        pendingTurn: getPendingTurn(hydrated, username),
        currentTurn: hydrated.currentTurn,
        turnExpiresAt: hydrated.turnExpiresAt,
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
    try {
        adjustRandomAssignment({ match: hydrated, username, chakraType, delta });
        await persistMatchState(hydrated, {
            chakraPools: hydrated.chakraPools,
            pendingTurns: hydrated.pendingTurns,
        });
        return res.json({
            ok: true,
            chakraPools: hydrated.chakraPools,
            pendingTurn: getPendingTurn(hydrated, username),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
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
        return res.json({
            ok: true,
            chakraPools: hydrated.chakraPools,
            pendingTurn: getPendingTurn(hydrated, username),
            currentTurn: hydrated.currentTurn,
            turnExpiresAt: hydrated.turnExpiresAt,
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

app.get('/api/characters/catalog', (req, res) => {
    return res.json({
        ok: true,
        characters: characterCatalog,
    });
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

app.get('/api/admin/characters/:characterId', requireSession, (req, res) => {
    if (String(req.authUser?.role || '').trim().toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const characterId = typeof req.params?.characterId === 'string' ? req.params.characterId.trim() : '';
    const character = (Array.isArray(charactersData) ? charactersData : []).find(
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

    const currentCharacters = Array.isArray(charactersData) ? charactersData : [];
    const characterIndex = currentCharacters.findIndex(
        (entry) => typeof entry?.characterId === 'string' && entry.characterId === characterId
    );
    if (characterIndex === -1) {
        return res.status(404).json({ error: 'Character not found.' });
    }

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
        updatedCharacters[characterIndex] = nextCharacter;
        await saveCharactersDataFile(updatedCharacters);
        return res.json({
            ok: true,
            character: updatedCharacters[characterIndex],
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
        profile.ladder.rankHatUrl = 'hats/academy.png';
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
app.get(['/', '/selection-login', '/selection-login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'selection-login.html'));
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

const startServer = async () => {
    await initDb();

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Naruto-Arena API listening on http://localhost:${PORT}`);
    });

    if (HTTPS_KEY_PATH && HTTPS_CERT_PATH) {
        try {
            const key = fs.readFileSync(HTTPS_KEY_PATH);
            const cert = fs.readFileSync(HTTPS_CERT_PATH);
            https
                .createServer({ key, cert }, app)
                .listen(PORT + 1, () =>
                    console.log(`Naruto-Arena API (HTTPS) listening on https://localhost:${PORT + 1}`)
                );
        } catch (error) {
            console.error('Failed to start HTTPS server:', error);
        }
    }

    process.on('SIGINT', async () => {
        if (mongoClient) {
            await mongoClient.close();
        }
        server.close(() => process.exit(0));
    });
};

startServer().catch((error) => {
    console.error('Failed to initialize the server:', error);
    process.exit(1);
});
