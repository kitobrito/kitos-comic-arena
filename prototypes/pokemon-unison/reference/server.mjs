import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMatchService, MatchServiceError } from './match-service.mjs';
import { createJsonMatchStorage } from './match-storage.mjs';
import { createDefaultMissionState } from './mission-catalog.mjs';
import { createMissionService } from './mission-service.mjs';
import { createPlayerService, PlayerServiceError } from './player-service.mjs';
import { createJsonPlayerStorage } from './player-storage.mjs';
import { createDefaultSkinState } from './skin-catalog.mjs';
import { createSkinService, SkinServiceError } from './skin-service.mjs';

const referenceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const repositoryRoot = resolve(referenceRoot, '..', '..', '..');
const gameAssetsRoot = resolve(repositoryRoot, 'assets');

const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
};

function safeResolve(root, requestPath) {
    const target = resolve(root, `.${decodeURIComponent(requestPath)}`);
    return target === root || target.startsWith(`${root}${sep}`) ? target : null;
}

function sendJson(response, status, payload) {
    response.writeHead(status, {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify(payload));
}

function bearerToken(request) {
    const authorization = request.headers.authorization ?? '';
    return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

async function readJson(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 32 * 1024) {
            throw new MatchServiceError(413, 'body_too_large', 'Request bodies are limited to 32 KB.');
        }
        chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new MatchServiceError(400, 'invalid_json', 'The request body must be valid JSON.');
    }
}

function routeParts(pathname) {
    return pathname.split('/').filter(Boolean).map(decodeURIComponent);
}

function normalizePublicBasePath(value = '/') {
    const normalized = `/${String(value).replace(/^\/+|\/+$/g, '')}`;
    return normalized === '/' ? '/' : `${normalized}/`;
}

function requireAuthenticatedPlayer(request, playerService) {
    const player = playerService.verifySession(bearerToken(request));
    if (!player) {
        throw new PlayerServiceError(401, 'invalid_session', 'Sign in first.');
    }
    return player;
}

async function handlePlayersApi(request, response, url, playerService) {
    const parts = routeParts(url.pathname);
    if (parts[0] !== 'api' || parts[1] !== 'players') return false;

    if (request.method === 'POST' && parts[2] === 'register' && parts.length === 3) {
        const body = await readJson(request);
        const result = await playerService.register({
            username: body.username,
            email: body.email,
            password: body.password,
        });
        sendJson(response, 201, result);
        return true;
    }
    if (request.method === 'POST' && parts[2] === 'login' && parts.length === 3) {
        const body = await readJson(request);
        const result = await playerService.login({ username: body.username, password: body.password });
        sendJson(response, 200, result);
        return true;
    }
    if (request.method === 'POST' && parts[2] === 'logout' && parts.length === 3) {
        playerService.logout(bearerToken(request));
        sendJson(response, 200, { ok: true });
        return true;
    }
    if (request.method === 'GET' && parts[2] === 'me' && parts.length === 3) {
        const player = playerService.verifySession(bearerToken(request));
        if (!player) {
            throw new PlayerServiceError(401, 'invalid_session', 'Sign in to view this player.');
        }
        sendJson(response, 200, { player });
        return true;
    }
    return false;
}

async function handleMissionsApi(request, response, url, missionService, playerService) {
    if (request.method !== 'GET' || url.pathname !== '/api/missions') return false;
    const player = playerService.verifySession(bearerToken(request));
    const missionsState = player?.profile?.missions ?? createDefaultMissionState();
    sendJson(response, 200, {
        missions: missionService.catalog(),
        missionProgressByMissionId: missionsState.progressByMissionId,
        unlockedCharacterIds: missionsState.unlockedCharacterIds,
        unlockPoints: missionsState.unlockPoints,
        purchasedUnlocks: missionsState.purchasedUnlocks,
    });
    return true;
}

async function handleSkinsApi(request, response, url, skinService, playerService) {
    const parts = routeParts(url.pathname);
    if (parts[0] !== 'api' || parts[1] !== 'skins') return false;

    if (request.method === 'GET' && parts.length === 2) {
        const player = playerService.verifySession(bearerToken(request));
        const skinsState = player?.profile?.skins ?? createDefaultSkinState();
        sendJson(response, 200, {
            skins: skinService.catalog(),
            unlockedSkinIds: skinsState.unlockedSkinIds,
            equippedSkinByCharacterId: skinsState.equippedSkinByCharacterId,
            unlockPoints: player?.profile?.missions?.unlockPoints ?? 0,
        });
        return true;
    }
    if (request.method === 'POST' && parts[2] === 'unlock' && parts.length === 3) {
        const player = requireAuthenticatedPlayer(request, playerService);
        const body = await readJson(request);
        const updated = skinService.unlock(player.id, body.skinId);
        sendJson(response, 200, { player: updated });
        return true;
    }
    if (request.method === 'POST' && parts[2] === 'equip' && parts.length === 3) {
        const player = requireAuthenticatedPlayer(request, playerService);
        const body = await readJson(request);
        const updated = skinService.equip(player.id, body.characterId, body.skinId);
        sendJson(response, 200, { player: updated });
        return true;
    }
    return false;
}

async function handleApi(request, response, url, matchService, playerService, missionService, skinService, publicBasePath) {
    const parts = routeParts(url.pathname);
    if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { ok: true, matches: matchService.size(), players: playerService.size() });
        return true;
    }
    if (request.method === 'GET' && url.pathname === '/api/roster') {
        sendJson(response, 200, matchService.roster());
        return true;
    }
    if (await handlePlayersApi(request, response, url, playerService)) {
        return true;
    }
    if (await handleMissionsApi(request, response, url, missionService, playerService)) {
        return true;
    }
    if (await handleSkinsApi(request, response, url, skinService, playerService)) {
        return true;
    }
    if (request.method === 'POST' && url.pathname === '/api/matches') {
        const body = await readJson(request);
        const created = matchService.create({
            seed: body.seed,
            teams: body.teams,
            startingPlayer: body.startingPlayer,
            opponent: body.opponent,
            playerId: playerService.verifySession(body.playerToken)?.id ?? null,
        });
        sendJson(response, 201, {
            ...created,
            ...(created.inviteCode
                ? { invitePath: `${publicBasePath}?match=${encodeURIComponent(created.matchId)}&invite=${encodeURIComponent(created.inviteCode)}` }
                : {}),
        });
        return true;
    }
    if (parts[0] !== 'api' || parts[1] !== 'matches' || !parts[2]) return false;

    const matchId = parts[2];
    if (request.method === 'POST' && parts[3] === 'join' && parts.length === 4) {
        const body = await readJson(request);
        sendJson(response, 200, matchService.join(matchId, body.inviteCode, {
            playerId: playerService.verifySession(body.playerToken)?.id ?? null,
        }));
        return true;
    }
    if (request.method === 'GET' && parts[3] === 'state' && parts.length === 4) {
        sendJson(response, 200, matchService.view(matchId, bearerToken(request)));
        return true;
    }
    if (request.method === 'POST' && parts[3] === 'actions' && parts.length === 4) {
        const body = await readJson(request);
        sendJson(response, 200, matchService.act(matchId, bearerToken(request), body));
        return true;
    }
    if (request.method === 'POST' && parts[3] === 'queue' && parts.length === 4) {
        const body = await readJson(request);
        sendJson(response, 200, matchService.queue(matchId, bearerToken(request), body));
        return true;
    }
    if (request.method === 'DELETE' && parts[3] === 'queue' && parts.length === 4) {
        sendJson(response, 200, matchService.undoQueued(matchId, bearerToken(request)));
        return true;
    }
    if (request.method === 'POST' && parts[3] === 'resolve' && parts.length === 4) {
        sendJson(response, 200, matchService.resolveTurn(matchId, bearerToken(request)));
        return true;
    }
    if (request.method === 'POST' && parts[3] === 'surrender' && parts.length === 4) {
        sendJson(response, 200, matchService.surrender(matchId, bearerToken(request)));
        return true;
    }
    if (request.method === 'GET' && parts[3] === 'replay' && parts.length === 4) {
        sendJson(response, 200, matchService.replay(matchId, bearerToken(request)));
        return true;
    }
    return false;
}

function serveStatic(response, url) {
    const assetRequest = url.pathname.startsWith('/game-assets/');
    const relativePath = assetRequest
        ? url.pathname.slice('/game-assets'.length)
        : url.pathname === '/'
          ? '/index.html'
          : url.pathname;
    const root = assetRequest ? gameAssetsRoot : referenceRoot;
    const filePath = safeResolve(root, relativePath);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
        return false;
    }
    response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': mimeTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
        'x-robots-tag': 'noindex, nofollow, noarchive',
    });
    createReadStream(filePath).pipe(response);
    return true;
}

export function createPokemonUnisonHandler({
    playerService = createPlayerService(),
    missionService = createMissionService({ playerService }),
    skinService = createSkinService({ playerService }),
    matchService = createMatchService({ onMatchComplete: missionService.onMatchComplete }),
    publicBasePath = '/',
} = {}) {
    const normalizedBasePath = normalizePublicBasePath(publicBasePath);
    return async (request, response) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        try {
            if (url.pathname.startsWith('/api/')) {
                if (
                    !(await handleApi(
                        request,
                        response,
                        url,
                        matchService,
                        playerService,
                        missionService,
                        skinService,
                        normalizedBasePath
                    ))
                ) {
                    sendJson(response, 404, { error: 'api_not_found', message: 'API route not found.' });
                }
                return;
            }
            if (!serveStatic(response, url)) {
                response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
                response.end('Not found');
            }
        } catch (error) {
            if (
                error instanceof MatchServiceError ||
                error instanceof PlayerServiceError ||
                error instanceof SkinServiceError
            ) {
                sendJson(response, error.status, { error: error.code, message: error.message });
                return;
            }
            console.error(error);
            sendJson(response, 500, { error: 'internal_error', message: 'The standalone server failed.' });
        }
    };
}

export function createPokemonUnisonServer(options = {}) {
    return http.createServer(createPokemonUnisonHandler(options));
}

const launchedDirectly = typeof process !== 'undefined' && process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (launchedDirectly) {
    const port = Number.parseInt(process.env.PORT ?? '4173', 10);
    const dataDir = process.env.POKEMON_UNISON_DATA_DIR ?? resolve(referenceRoot, '..', 'runtime-data');
    const storage = createJsonMatchStorage(resolve(dataDir, 'matches'));
    const playerStorage = createJsonPlayerStorage(resolve(dataDir, 'players'));
    const playerService = createPlayerService({ storage: playerStorage });
    const missionService = createMissionService({ playerService });
    const skinService = createSkinService({ playerService });
    const matchService = createMatchService({ storage, onMatchComplete: missionService.onMatchComplete });
    const server = createPokemonUnisonServer({ matchService, playerService, missionService, skinService });
    server.listen(port, '127.0.0.1', () => {
        console.log(`Pokemon Unison standalone: http://127.0.0.1:${port}`);
        console.log('This server is isolated from the current Comic/Pokemon Arena application.');
        console.log(`Persistent match data: ${storage.directory}`);
        console.log(`Persistent player data: ${playerStorage.directory}`);
    });
}
