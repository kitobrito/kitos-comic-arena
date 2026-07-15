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
const ironMan = findCharacter(characters, 'iron-man');
const spiderMan = findCharacter(characters, 'spider-man');
const captainAmerica = findCharacter(characters, 'captain-america');
const spiderSensesIconUrl = '/assets/images/external-mirror/i.imgur.com/7d93942e20ecddadf0ae.jpg';

const buildTurnTimestamps = () => ({
    turnStartedAt: new Date(Date.now()).toISOString(),
    turnExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    turnDurationMs: 60000,
});

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
    ...buildTurnTimestamps(),
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

const buildComicMatchPayload = ({ currentTurn = 'ash' } = {}) => ({
    ok: true,
    matchId: 'match-e2e-comic-1',
    mode: 'quick',
    arena: 'comic',
    status: 'active',
    player: {
        username: 'ash',
        displayName: 'Ash',
        team: [ironMan.id, spiderMan.id, captainAmerica.id],
        profile: {
            avatarUrl: '/assets/images/external-mirror/i.postimg.cc/971bcdc8d3154d6d16a9.png',
            ladder: { rank: 'Hero', level: 8 },
        },
    },
    opponent: {
        username: 'doom',
        displayName: 'Doom',
        team: [captainAmerica.id, spiderMan.id, ironMan.id],
        profile: {
            avatarUrl: '/assets/images/external-mirror/i.postimg.cc/971bcdc8d3154d6d16a9.png',
            ladder: { rank: 'Villain', level: 9 },
        },
    },
    currentTurn,
    turnOrder: ['ash', 'doom'],
    ...buildTurnTimestamps(),
    board: {
        ash: [
            { slot: 0, rosterIndex: characters.findIndex((entry) => entry === ironMan), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
            {
                slot: 1,
                rosterIndex: characters.findIndex((entry) => entry === spiderMan),
                alive: true,
                hp: 100,
                state: {
                    statuses: [
                        {
                            id: 'spider_man_spider_senses_passive',
                            remainingTurns: 99,
                            sourceSkillId: 'spider-man-passive-spider-senses',
                            metadata: {
                                statusIconUrl: spiderSensesIconUrl,
                                tooltipText: 'Spider Senses is active.',
                            },
                        },
                    ],
                    cooldowns: {},
                    skillUses: {},
                },
            },
            { slot: 2, rosterIndex: characters.findIndex((entry) => entry === captainAmerica), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
        ],
        doom: [
            { slot: 0, rosterIndex: characters.findIndex((entry) => entry === captainAmerica), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
            { slot: 1, rosterIndex: characters.findIndex((entry) => entry === spiderMan), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
            { slot: 2, rosterIndex: characters.findIndex((entry) => entry === ironMan), alive: true, hp: 100, state: { statuses: [], cooldowns: {}, skillUses: {} } },
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
    backgroundOverride: 'assets/images/defaultbgCA.png',
});

const createHarnessServer = async () => {
    const state = {
        matchGets: 0,
        comicMatchGets: 0,
        turnEnds: 0,
        comicTurnEnds: 0,
        comicSkillTargets: 0,
        comicSkillQueues: 0,
        useBrokenInitialPayload: false,
        useComicStaleNotYourTurnOnEnd: false,
        payload: buildHealthyMatchPayload(),
        comicPayload: buildComicMatchPayload(),
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

        if (pathname === '/api/match/match-e2e-comic-1' && req.method === 'GET') {
            state.comicMatchGets += 1;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(state.comicPayload));
            return;
        }

        if (pathname === '/api/match/match-e2e-comic-1/skill/targets' && req.method === 'POST') {
            state.comicSkillTargets += 1;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                targetType: 'single-enemy',
                mode: 'single',
                skillIndex: 0,
                targets: [{ username: 'doom', slot: 0, rosterIndex: characters.findIndex((entry) => entry === captainAmerica), alive: true }],
                pendingTurn: state.comicPayload.pendingTurn,
            }));
            return;
        }

        if (pathname === '/api/match/match-e2e-comic-1/skill/queue' && req.method === 'POST') {
            state.comicSkillQueues += 1;
            const pendingTurn = {
                queuedByActorSlot: {
                    '0': {
                        actorSlot: 0,
                        skillIndex: 0,
                        targetSelection: { username: 'doom', slot: 0 },
                    },
                },
                queueOrder: [0],
                unresolvedRandom: 1,
                randomAssignments: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
                turnStartChoice: null,
            };
            state.comicPayload = {
                ...state.comicPayload,
                pendingTurn,
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                chakraPools: state.comicPayload.chakraPools,
                pendingTurn,
                currentTurn: state.comicPayload.currentTurn,
                turnExpiresAt: state.comicPayload.turnExpiresAt,
                turnDurationMs: state.comicPayload.turnDurationMs,
            }));
            return;
        }

        if (pathname === '/api/match/match-e2e-comic-1/turn/end' && req.method === 'POST') {
            state.comicTurnEnds += 1;
            state.comicPayload = buildComicMatchPayload({ currentTurn: 'doom' });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
                JSON.stringify(
                    state.useComicStaleNotYourTurnOnEnd
                        ? {
                              ...state.comicPayload,
                              staleAction: true,
                              actionRejected: 'not-your-turn',
                          }
                        : state.comicPayload
                )
            );
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
    harness.state.comicMatchGets = 0;
    harness.state.turnEnds = 0;
    harness.state.comicTurnEnds = 0;
    harness.state.comicSkillTargets = 0;
    harness.state.comicSkillQueues = 0;
    harness.state.useBrokenInitialPayload = false;
    harness.state.useComicStaleNotYourTurnOnEnd = false;
    harness.state.payload = buildHealthyMatchPayload();
    harness.state.comicPayload = buildComicMatchPayload();
});

const waitForBattleIntroToFinish = async (page) => {
    await expect(page.locator('.battle-intro-overlay')).toHaveAttribute('aria-hidden', 'true');
};

test('pokemon battle intro uses the current match background', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('.battle-intro-overlay')).toHaveCSS(
        'background-image',
        /PokemonArena\/newingamebgPA\.png/
    );
});

test('ingame resumes fullscreen intent and centers the game stage', async ({ page }) => {
    await page.goto(harness.baseUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        sessionStorage.setItem('comicArenaFullscreenIntent', 'true');
    });
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('.ingame-fullscreen-toggle')).toHaveText(/Resume Full|Exit Full/);
    if (!(await page.evaluate(() => Boolean(document.fullscreenElement)))) {
        await page.mouse.click(1400, 850);
    }
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);

    const placement = await page.locator('.ingame-stage').evaluate((stage) => {
        const rect = stage.getBoundingClientRect();
        return {
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            viewportCenterX: window.innerWidth / 2,
            viewportCenterY: window.innerHeight / 2,
        };
    });
    expect(Math.abs(placement.centerX - placement.viewportCenterX)).toBeLessThan(2);
    expect(Math.abs(placement.centerY - placement.viewportCenterY)).toBeLessThan(2);
});

test('pokemon ingame stays in pokemon arena after turn confirm and refresh', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-pokemon/);
    await expect(page.locator('.player-name.red').first()).toHaveText(/ash/i);
    await expect(page.locator('.player-characters .character-face').first()).toHaveAttribute('src', /PokemonArena\/pokemontrainer\/FP\.jpg/);
    await waitForBattleIntroToFinish(page);

    await page.locator('.ok-buttonendturn').evaluate((button) => button.click());

    await expect(page.locator('.ready-text')).toHaveText("OPPONENT'S TURN...");
    expect(harness.state.turnEnds).toBe(1);

    await page.reload();

    await expect(page.locator('body')).toHaveClass(/arena-mode-pokemon/);
    await expect(page).toHaveURL(/arena=pokemon/);
    await expect(page.locator('.player-characters .character-face').first()).toHaveAttribute('src', /PokemonArena\/pokemontrainer\/FP\.jpg/);
  });

test('comic ingame ends turn without reloading the match page', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-comic-1&arena=comic`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-comic/);
    await expect(page.locator('.player-name.red').first()).toHaveText(/ash/i);
    await waitForBattleIntroToFinish(page);

    const initialUrl = page.url();
    await page.locator('.ok-buttonendturn').evaluate((button) => button.click());

    await expect(page.locator('.ready-text')).toHaveText("OPPONENT'S TURN...");
    expect(harness.state.comicTurnEnds).toBe(1);
    await page.waitForTimeout(600);
    expect(page.url()).toBe(initialUrl);
    expect(harness.state.comicMatchGets).toBe(1);
    await expect(page.locator('.match-issue-banner')).toBeHidden();
});

test('comic ingame renders passive status icons and queues skill clicks', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-comic-1&arena=comic`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-comic/);
    const passiveIcon = page.locator('.player-characters .character-card').nth(1).locator('.skilltooltips .skilltooltipimage').first();
    await expect(passiveIcon).toHaveAttribute('src', /ImdCo6q/);
    await waitForBattleIntroToFinish(page);

    await page.locator('.player-characters .character-card').first().locator('.skillimage').first().click({ force: true });
    await expect.poll(() => harness.state.comicSkillTargets).toBeGreaterThanOrEqual(1);
    await page.locator('.enemy-characters .character-card').first().click({ force: true });

    await expect.poll(() => harness.state.comicSkillQueues).toBe(1);
    await expect(page.locator('.match-issue-banner')).toBeHidden();
});

test('comic stale not-your-turn end response is treated as already advanced', async ({ page }) => {
    harness.state.useComicStaleNotYourTurnOnEnd = true;
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-comic-1&arena=comic`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-comic/);
    await waitForBattleIntroToFinish(page);

    const initialUrl = page.url();
    await page.locator('.ok-buttonendturn').evaluate((button) => button.click());

    await expect(page.locator('.ready-text')).toHaveText("OPPONENT'S TURN...");
    expect(harness.state.comicTurnEnds).toBe(1);
    await page.waitForTimeout(600);
    expect(page.url()).toBe(initialUrl);
    expect(harness.state.comicMatchGets).toBe(1);
    await expect(page.locator('.match-issue-banner')).toBeHidden();
});

test('pokemon ingame auto-recovers from broken initial team payload', async ({ page }) => {
    harness.state.useBrokenInitialPayload = true;

    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-pokemon/);
    await expect(page.locator('.player-characters .character-face').first()).toHaveAttribute('src', /PokemonArena\/pokemontrainer\/FP\.jpg/);
    expect(harness.state.matchGets).toBeGreaterThanOrEqual(2);
});
