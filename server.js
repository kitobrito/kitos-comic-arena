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
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const battleLogic = require('./battleLogic');
const charactersData = require('./characters');

const app = express();

const PORT = process.env.PORT || 4000;
const TURN_DURATION_MS = 60 * 1000;
const DEFAULT_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB || 'naruto-arena';
const USERS_COLLECTION = process.env.MONGODB_USERS_COLLECTION || 'users';
const MATCHES_COLLECTION = process.env.MONGODB_MATCHES_COLLECTION || 'matches';
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

let mongoClient;
let usersCollection;
let matchesCollection;

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
            username: user.username,
            role: user.role || 'player',
            createdAt: user.createdAt,
            savedTeamIndices: user.savedTeamIndices || [],
        };
        next();
    } catch (error) {
        console.error('Session verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized.' });
    }
};

// In-memory quick matchmaking (demo)
let quickQueue = [];
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
    const { chakraPools, economy, turnExpiresAt } = initializeEconomyState(
        players,
        currentTurn,
        aliveLookup
    );
    quickMatches.set(matchId, {
        players,
        createdAt: new Date(),
        turnOrder,
        currentTurn,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt,
    });
    players.forEach((p) => {
        const opponent = players.find((x) => x !== p) || null;
        userToMatch.set(p, { matchId, opponent });
    });
    return {
        matchId,
        turnOrder,
        currentTurn,
        chakraPools,
        economy,
        pendingTurns: Object.fromEntries(players.map((username) => [username, makeEmptyPendingTurn()])),
        turnExpiresAt,
    };
};

const enqueuePlayer = (entry) => {
    quickQueue = quickQueue.filter((u) => u.username !== entry.username);
    quickQueue.push(entry);
};

const dequeueOpponent = (username) => {
    const opponent = quickQueue.find((u) => u.username !== username);
    if (!opponent) return null;
    quickQueue = quickQueue.filter((u) => u.username !== opponent.username);
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

const queueSkillForActorSlot = ({ match, username, actorSlot, skillIndex, targetSelection }) => {
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
        await matchesCollection.updateOne(
            { matchId: match.matchId },
            {
                $set: {
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
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.createIndex(
        { email: 1 },
        { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
    );
    await matchesCollection.createIndex({ matchId: 1 }, { unique: true });
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
});

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { error: validationError, value } = loginSchema.validate(req.body || {});
        if (validationError) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }
        const { username, password } = value;

        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash || '');
        if (!isMatch) {
            return res.status(401).json({ error: 'Wrong username or password.' });
        }

        const token = signSession(user);
        setSessionCookie(res, token);

        return res.json({
            ok: true,
            user: {
                username: user.username,
                role: user.role || 'player',
                createdAt: user.createdAt,
                savedTeamIndices: user.savedTeamIndices || [],
            },
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
        const newUser = {
            username,
            email,
            passwordHash,
            role: 'player',
            createdAt,
            savedTeamIndices: [],
        };

        const result = await usersCollection.insertOne(newUser);
        const token = signSession({ ...newUser, _id: result.insertedId });
        setSessionCookie(res, token);

        return res.status(201).json({
            ok: true,
            user: {
                username,
                email,
                role: 'player',
                createdAt,
                savedTeamIndices: [],
            },
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
                opponent,
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
                opponent,
                currentTurn: hydrated.currentTurn || null,
                turnOrder: hydrated.turnOrder || null,
                turnExpiresAt: hydrated.turnExpiresAt || null,
                chakraPools: hydrated.chakraPools || null,
                lastChakraGain: hydrated.economy?.lastChakraGain || null,
                pendingTurn: getPendingTurn(hydrated, username),
            });
        }

        // Try to pair with waiting opponent
        const opponent = dequeueOpponent(username);
        if (opponent) {
            const aliveLookup = {
                [username]: Array.isArray(team) ? team.length : 3,
                [opponent.username]: Array.isArray(opponent.team) ? opponent.team.length : 3,
            };
            const { matchId, turnOrder, currentTurn, chakraPools, economy, pendingTurns, turnExpiresAt } =
                buildMatch([username, opponent.username], aliveLookup);
            const playerDocs = [
                { username, team, aliveCount: aliveLookup[username] },
                { username: opponent.username, team: opponent.team, aliveCount: aliveLookup[opponent.username] },
            ];
            const board = battleLogic.buildInitialBoard(playerDocs);
            await matchesCollection.insertOne({
                matchId,
                status: 'active',
                createdAt: new Date(),
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
                opponent: opponentName,
                currentTurn,
                turnOrder,
                turnExpiresAt,
                pendingTurn: makeEmptyPendingTurn(),
            });
        }

        // Otherwise enqueue
        enqueuePlayer({ username, team });
        return res.json({ ok: true, queued: true });
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
                opponent: mapping.opponent,
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
            opponent,
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
            status: 'ended',
            winner: match.winner || null,
            surrenderedBy: match.surrenderedBy || null,
            endReason: match.endReason || null,
            endedAt: match.endedAt || null,
        });
    }
    const opponentEntry = match.players.find((p) => p.username !== username);
    const endedAt = new Date();
    await matchesCollection.updateOne(
        { matchId },
        {
            $set: {
                status: 'ended',
                winner: opponentEntry ? opponentEntry.username : null,
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
    return res.json({
        ok: true,
        status: 'ended',
        surrenderedBy: username,
        winner: opponentEntry ? opponentEntry.username : null,
        endReason: 'surrender',
        endedAt,
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
    });
});

app.post('/api/match/:matchId/skill/queue', requireSession, async (req, res) => {
    const { matchId } = req.params;
    const actorSlot = Number.parseInt(req.body?.actorSlot, 10);
    const skillIndex = Number.parseInt(req.body?.skillIndex, 10);
    const targetSelection = req.body?.targetSelection;
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

app.get('/api/me', requireSession, (req, res) => {
    res.json({ ok: true, user: req.authUser });
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
