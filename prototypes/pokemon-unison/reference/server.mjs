import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMatchService, MatchServiceError } from './match-service.mjs';
import { createJsonMatchStorage } from './match-storage.mjs';

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

async function handleApi(request, response, url, matchService, publicBasePath) {
    const parts = routeParts(url.pathname);
    if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { ok: true, matches: matchService.size() });
        return true;
    }
    if (request.method === 'GET' && url.pathname === '/api/roster') {
        sendJson(response, 200, matchService.roster());
        return true;
    }
    if (request.method === 'POST' && url.pathname === '/api/matches') {
        const body = await readJson(request);
        const created = matchService.create({
            seed: body.seed,
            teams: body.teams,
            startingPlayer: body.startingPlayer,
            opponent: body.opponent,
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
        sendJson(response, 200, matchService.join(matchId, body.inviteCode));
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

export function createPokemonUnisonHandler({ matchService = createMatchService(), publicBasePath = '/' } = {}) {
    const normalizedBasePath = normalizePublicBasePath(publicBasePath);
    return async (request, response) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        try {
            if (url.pathname.startsWith('/api/')) {
                if (!(await handleApi(request, response, url, matchService, normalizedBasePath))) {
                    sendJson(response, 404, { error: 'api_not_found', message: 'API route not found.' });
                }
                return;
            }
            if (!serveStatic(response, url)) {
                response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
                response.end('Not found');
            }
        } catch (error) {
            if (error instanceof MatchServiceError) {
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
    const storage = createJsonMatchStorage(
        process.env.POKEMON_UNISON_DATA_DIR ?? resolve(referenceRoot, '..', 'runtime-data', 'matches')
    );
    const matchService = createMatchService({ storage });
    const server = createPokemonUnisonServer({ matchService });
    server.listen(port, '127.0.0.1', () => {
        console.log(`Pokemon Unison standalone: http://127.0.0.1:${port}`);
        console.log('This server is isolated from the current Comic/Pokemon Arena application.');
        console.log(`Persistent match data: ${storage.directory}`);
    });
}
