const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { test, expect } = require('@playwright/test');
const { WebSocketServer } = require('ws');

const repoRoot = path.resolve(__dirname, '..', '..');

const findCharacter = (characters, id) => {
    const character = characters.find((entry) => entry && (entry.id === id || entry.characterId === id));
    if (!character) {
        throw new Error(`Missing character: ${id}`);
    }
    return character;
};

const characters = require(path.join(repoRoot, 'characters.js'));
const pokemonTrainer = findCharacter(characters, 'pokemon-trainer');
const charmander = findCharacter(characters, 'charmander');
const squirtle = findCharacter(characters, 'squirtle');

const buildHealthyMatchPayload = ({ currentTurn = 'ash' } = {}) => ({
    ok: true,
    matchId: 'match-e2e-1',
    mode: 'quick',
    arena: 'pokemon',
    status: 'active',
    player: {
        username: 'ash',
        displayName: 'Ash',
        team: [pokemonTrainer.id, charmander.id, squirtle.id],
        profile: {
            avatarUrl: 'assets/images/PokemonArena/found-pokeball.png',
            arenas: {
                pokemon: {
                    ladder: { rank: 'Trainer', level: 8 },
                },
            },
        },
    },
    opponent: {
        username: 'gary',
        displayName: 'Gary',
        team: [squirtle.id, charmander.id, pokemonTrainer.id],
        profile: {
            avatarUrl: 'assets/images/PokemonArena/found-pokeball.png',
            arenas: {
                pokemon: {
                    ladder: { rank: 'Rival', level: 9 },
                },
            },
        },
    },
    currentTurn,
    turnOrder: ['ash', 'gary'],
    turnStartedAt: new Date('2026-06-28T12:00:00.000Z').toISOString(),
    turnExpiresAt: new Date('2026-06-28T12:01:00.000Z').toISOString(),
    turnDurationMs: 60000,
    board: {
        ash: [
            { slot: 0, rosterIndex: characters.findIndex((entry) => entry === pokemonTrainer), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
            { slot: 1, rosterIndex: characters.findIndex((entry) => entry === charmander), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
            { slot: 2, rosterIndex: characters.findIndex((entry) => entry === squirtle), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
        ],
        gary: [
            { slot: 0, rosterIndex: characters.findIndex((entry) => entry === squirtle), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
            { slot: 1, rosterIndex: characters.findIndex((entry) => entry === charmander), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
            { slot: 2, rosterIndex: characters.findIndex((entry) => entry === pokemonTrainer), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
        ],
    },
    chakraPools: {
        ash: { taijutsu: 1, ninjutsu: 1, bloodline: 1, genjutsu: 1 },
    },
    lastChakraGain: {
        ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
    },
    pendingTurn: {
        queuedByActorSlot: {},
        queueOrder: [],
        unresolvedRandom: 0,
        randomAssignments: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
        turnStartChoice: null,
    },
    backgroundOverride: 'assets/images/PokemonArena/newingamebgPA.png',
});

const buildBrokenInitialPayload = () => {
    const payload = buildHealthyMatchPayload();
    payload.player.team = [pokemonTrainer.id];
    payload.opponent.team = [squirtle.id];
    payload.board.ash = payload.board.ash.slice(0, 1);
    payload.board.gary = payload.board.gary.slice(0, 1);
    return payload;
};

const createHarnessServer = async () => {
    const state = {
        matchGets: 0,
        turnEnds: 0,
        useBrokenInitialPayload: false,
        payload: buildHealthyMatchPayload(),
    };

    const server = http.createServer((req, res) => {
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        const pathname = requestUrl.pathname;

        if (pathname === '/api/me') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
                JSON.stringify({
                    ok: true,
                    user: {
                        username: 'ash',
                        role: 'player',
                        savedTeamIndicesByArena: {},
                        profile: {
                            arenas: {
                                pokemon: {
                                    ladder: { rank: 'Trainer', level: 8 },
                                },
                            },
                        },
                    },
                })
            );
            return;
        }

        if (pathname === '/api/missions') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, missions: [] }));
            return;
        }

        if (pathname === '/api/match/match-e2e-1' && req.method === 'GET') {
            state.matchGets += 1;
            const payload =
                state.useBrokenInitialPayload && state.matchGets === 1
                    ? buildBrokenInitialPayload()
                    : state.payload;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(payload));
            return;
        }

        if (pathname === '/api/match/match-e2e-1/turn/end' && req.method === 'POST') {
            state.turnEnds += 1;
            state.payload = buildHealthyMatchPayload({ currentTurn: 'gary' });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state.payload));
            return;
        }

        if (pathname.startsWith('/api/')) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Unhandled API route: ${pathname}` }));
            return;
        }

        const relativePath = pathname === '/' ? '/ingame.html' : pathname;
        const filePath = path.join(repoRoot, decodeURIComponent(relativePath));
        if (!filePath.startsWith(repoRoot)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        fs.readFile(filePath, (error, buffer) => {
            if (error) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const extension = path.extname(filePath).toLowerCase();
            const contentType =
                extension === '.html'
                    ? 'text/html; charset=utf-8'
                    : extension === '.js'
                    ? 'application/javascript; charset=utf-8'
                    : extension === '.css'
                    ? 'text/css; charset=utf-8'
                    : extension === '.json'
                    ? 'application/json; charset=utf-8'
                    : extension === '.png'
                    ? 'image/png'
                    : extension === '.jpg' || extension === '.jpeg'
                    ? 'image/jpeg'
                    : extension === '.webp'
                    ? 'image/webp'
                    : extension === '.svg'
                    ? 'image/svg+xml'
                    : 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(buffer);
        });
    });

    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        if (requestUrl.pathname !== '/ws') {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });
    wss.on('connection', (ws) => {
        ws.on('message', () => {});
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    return {
        baseUrl,
        state,
        close: async () => {
            await new Promise((resolve) => wss.close(resolve));
            await new Promise((resolve) => server.close(resolve));
        },
    };
};

let harness;

test.beforeAll(async () => {
    harness = await createHarnessServer();
});

test.afterAll(async () => {
    await harness.close();
});

test.beforeEach(async () => {
    harness.state.matchGets = 0;
    harness.state.turnEnds = 0;
    harness.state.useBrokenInitialPayload = false;
    harness.state.payload = buildHealthyMatchPayload();
});

test('pokemon ingame stays in pokemon arena after turn confirm and refresh', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-pokemon/);
    await expect(page.locator('.player-name.red').first()).toHaveText('Ash');
    await expect(page.locator('.player-characters .character-face').first()).toHaveAttribute('src', /PokemonArena\/pokemontrainer\/FP\.jpg/);

    await page.locator('.ready-section').click();
    await expect(page.locator('.ChakraChooseEndTurn')).toBeVisible();
    await page.locator('.ok-buttonendturn').click();

    await expect(page.locator('.ready-text')).toHaveText("OPPONENT'S TURN...");
    expect(harness.state.turnEnds).toBe(1);

    await page.reload();

    await expect(page.locator('body')).toHaveClass(/arena-mode-pokemon/);
    await expect(page).toHaveURL(/arena=pokemon/);
    await expect(page.locator('.player-characters .character-face').first()).toHaveAttribute('src', /PokemonArena\/pokemontrainer\/FP\.jpg/);
  });

test('pokemon ingame auto-recovers from broken initial team payload', async ({ page }) => {
    harness.state.useBrokenInitialPayload = true;

    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-pokemon/);
    await expect(page.locator('.match-issue-banner')).toContainText(/Match sync restored|Reloading the match|couldn't load the live match/i);
    await expect(page.locator('.player-characters .character-face').first()).toHaveAttribute('src', /PokemonArena\/pokemontrainer\/FP\.jpg/);
    expect(harness.state.matchGets).toBeGreaterThanOrEqual(2);
});

