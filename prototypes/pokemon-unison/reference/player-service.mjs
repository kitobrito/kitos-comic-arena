import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { comparePassword, hashPassword } from './password-hashing.mjs';
import { createMemoryPlayerStorage } from './player-storage.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class PlayerServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'PlayerServiceError';
        this.status = status;
        this.code = code;
    }
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,24}$/;
const MINIMUM_PASSWORD_LENGTH = 8;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function base64UrlEncode(buffer) {
    return buffer.toString('base64url');
}

function base64UrlEncodeJson(value) {
    return base64UrlEncode(Buffer.from(JSON.stringify(value)));
}

function base64UrlDecodeJson(segment) {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

function signToken(payload, secret) {
    const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
    const body = base64UrlEncodeJson(payload);
    const signature = base64UrlEncode(
        createHmac('sha256', secret).update(`${header}.${body}`).digest()
    );
    return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret) {
    if (typeof token !== 'string' || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = base64UrlEncode(
        createHmac('sha256', secret).update(`${header}.${body}`).digest()
    );
    let providedBuffer;
    let expectedBuffer;
    try {
        providedBuffer = Buffer.from(signature, 'base64url');
        expectedBuffer = Buffer.from(expectedSignature, 'base64url');
    } catch {
        return null;
    }
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
        return null;
    }
    let payload;
    try {
        payload = base64UrlDecodeJson(body);
    } catch {
        return null;
    }
    if (typeof payload?.exp === 'number' && Date.now() >= payload.exp) return null;
    return payload;
}

function createDefaultMissionState() {
    return {
        progressByMissionId: {},
        unlockedCharacterIds: [],
        unlockPoints: 0,
        purchasedUnlocks: [],
    };
}

function createDefaultSkinState() {
    return {
        unlockedSkinIds: [],
        equippedSkinByCharacterId: {},
    };
}

function createDefaultProfile() {
    return {
        missions: createDefaultMissionState(),
        skins: createDefaultSkinState(),
    };
}

function normalizeUsername(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function publicPlayer(player) {
    return {
        id: player.id,
        username: player.username,
        email: player.email,
        createdAt: player.createdAt,
        profile: clone(player.profile),
    };
}

export function createPlayerService({ storage = createMemoryPlayerStorage(), sessionSecret } = {}) {
    const players = new Map();
    const idByUsernameLower = new Map();
    storage.loadAll().forEach((player) => {
        players.set(player.id, player);
        idByUsernameLower.set(player.usernameLower, player.id);
    });

    const secret = sessionSecret ?? storage.loadOrCreateSessionSecret();
    const revokedTokenIds = new Set();

    function persist(player) {
        player.updatedAt = new Date().toISOString();
        storage.save(player);
    }

    function issueSession(player) {
        const jti = randomUUID();
        const token = signToken(
            {
                sub: player.id,
                username: player.username,
                jti,
                iat: Date.now(),
                exp: Date.now() + SESSION_TTL_MS,
            },
            secret
        );
        return token;
    }

    return {
        async register({ username, email, password } = {}) {
            const trimmedUsername = normalizeUsername(username);
            const usernameLower = trimmedUsername.toLowerCase();
            const normalizedEmail = normalizeEmail(email);
            if (!USERNAME_PATTERN.test(trimmedUsername)) {
                throw new PlayerServiceError(
                    400,
                    'invalid_username',
                    'Usernames must be 3-24 letters, numbers, hyphens, or underscores.'
                );
            }
            if (typeof password !== 'string' || password.length < MINIMUM_PASSWORD_LENGTH) {
                throw new PlayerServiceError(
                    400,
                    'invalid_password',
                    `Passwords must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`
                );
            }
            if (idByUsernameLower.has(usernameLower)) {
                throw new PlayerServiceError(409, 'username_taken', 'That username is already taken.');
            }
            const passwordHash = await hashPassword(password);
            const now = new Date().toISOString();
            const player = {
                id: randomUUID(),
                username: trimmedUsername,
                usernameLower,
                email: normalizedEmail,
                passwordHash,
                createdAt: now,
                updatedAt: now,
                profile: createDefaultProfile(),
            };
            players.set(player.id, player);
            idByUsernameLower.set(usernameLower, player.id);
            persist(player);
            return { player: publicPlayer(player), token: issueSession(player) };
        },

        async login({ username, password } = {}) {
            const usernameLower = normalizeUsername(username).toLowerCase();
            const playerId = idByUsernameLower.get(usernameLower);
            const player = playerId ? players.get(playerId) : null;
            const matches = player ? await comparePassword(password, player.passwordHash) : false;
            if (!player || !matches) {
                throw new PlayerServiceError(401, 'invalid_credentials', 'Incorrect username or password.');
            }
            return { player: publicPlayer(player), token: issueSession(player) };
        },

        logout(token) {
            const payload = verifyToken(token, secret);
            if (payload?.jti) {
                revokedTokenIds.add(payload.jti);
            }
        },

        verifySession(token) {
            const payload = verifyToken(token, secret);
            if (!payload?.sub || (payload.jti && revokedTokenIds.has(payload.jti))) {
                return null;
            }
            const player = players.get(payload.sub);
            return player ? publicPlayer(player) : null;
        },

        getById(id) {
            const player = players.get(id);
            return player ? publicPlayer(player) : null;
        },

        updateProfile(id, updater) {
            const player = players.get(id);
            if (!player) return null;
            player.profile = updater(clone(player.profile));
            persist(player);
            return publicPlayer(player);
        },

        size() {
            return players.size;
        },
    };
}
