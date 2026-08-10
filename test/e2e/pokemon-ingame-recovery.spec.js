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

const buildHealthyMatchPayload = ({ currentTurn = 'ash', stateRevision = 1, turnNumber = 0 } = {}) => ({
    ok: true,
    matchId: 'match-e2e-1',
    stateRevision,
    turnNumber,
    serverTime: new Date().toISOString(),
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
                    clan: { abbreviation: 'INDIGO' },
                    ladder: { rank: 'Trainer', level: 8, experiencePoints: 2450, ladderRank: 42, wins: 18, losses: 7, streak: 4 },
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
                    clan: { abbreviation: 'ROCKET' },
                    ladder: { rank: 'Rival', level: 9, experiencePoints: 3120, ladderRank: 31, wins: 21, losses: 9, streak: 2 },
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

const buildComicMatchPayload = ({ currentTurn = 'ash', stateRevision = 1, turnNumber = 0 } = {}) => ({
    ok: true,
    matchId: 'match-e2e-comic-1',
    stateRevision,
    turnNumber,
    serverTime: new Date().toISOString(),
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
        pokemonSkillTargets: 0,
        pokemonSkillQueues: 0,
        pokemonRandomAdjusts: 0,
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
                                    skins: {
                                        unlockedSkinIds: ['charmander-charizard-legendary'],
                                        equippedSkinByCharacterId: {
                                            charmander: 'charmander-charizard-legendary',
                                        },
                                    },
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

        if (pathname === '/api/match/match-e2e-1/skill/targets' && req.method === 'POST') {
            state.pokemonSkillTargets += 1;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                targetType: 'single-ally',
                mode: 'single',
                skillIndex: 2,
                targets: [{
                    username: 'ash',
                    slot: 1,
                    rosterIndex: characters.findIndex((entry) => entry.id === 'clefairy'),
                    alive: true,
                    damagePreview: {
                        available: true,
                        baseDamage: 20,
                        totalDamage: 25,
                        moveType: 'Fire',
                        defendingTypes: ['Grass'],
                        effectivenessLabel: 'Super Effective',
                        effectivenessModifier: 5,
                        variable: false,
                    },
                }],
                pendingTurn: state.payload.pendingTurn,
            }));
            return;
        }

        if (pathname === '/api/match/match-e2e-1/skill/queue' && req.method === 'POST') {
            state.pokemonSkillQueues += 1;
            const pendingTurn = {
                queuedByActorSlot: {
                    '0': {
                        actorSlot: 0,
                        skillIndex: 2,
                        targetSelection: { username: 'ash', slot: 1 },
                    },
                },
                queueOrder: [0],
                unresolvedRandom: 1,
                randomAssignments: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
                turnStartChoice: null,
            };
            state.payload = { ...state.payload, pendingTurn };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                chakraPools: state.payload.chakraPools,
                pendingTurn,
                currentTurn: state.payload.currentTurn,
                turnExpiresAt: state.payload.turnExpiresAt,
                turnDurationMs: state.payload.turnDurationMs,
            }));
            return;
        }

        if (pathname === '/api/match/match-e2e-1/turn/random/adjust' && req.method === 'POST') {
            state.pokemonRandomAdjusts += 1;
            const pendingTurn = {
                ...state.payload.pendingTurn,
                unresolvedRandom: 0,
                randomAssignments: { taijutsu: 1, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
            };
            const chakraPools = {
                ...state.payload.chakraPools,
                ash: { ...state.payload.chakraPools.ash, taijutsu: 0 },
            };
            state.payload = { ...state.payload, pendingTurn, chakraPools };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                chakraPools,
                pendingTurn,
                currentTurn: state.payload.currentTurn,
                turnExpiresAt: state.payload.turnExpiresAt,
                turnDurationMs: state.payload.turnDurationMs,
            }));
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

        if (pathname === '/characters.js') {
            res.writeHead(200, {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-store',
            });
            res.end(`const characters = ${JSON.stringify(characters)};\nwindow.characters = characters;`);
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
    const socketClients = new Set();
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
        socketClients.add(ws);
        ws.on('close', () => socketClients.delete(ws));
        ws.on('message', () => {});
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    return {
        baseUrl,
        state,
        broadcastMatchState: (payload) => {
            socketClients.forEach((ws) => {
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: 'match_state', payload }));
                }
            });
        },
        close: async () => {
            socketClients.forEach((ws) => ws.terminate());
            socketClients.clear();
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
    harness.state.pokemonSkillTargets = 0;
    harness.state.pokemonSkillQueues = 0;
    harness.state.pokemonRandomAdjusts = 0;
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

test('experimental selection player card stays readable and clear of mobile controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${harness.baseUrl}/selection.html?layout=experimental&arena=pokemon`);
    await expect(page.locator('body')).not.toHaveClass(/app-loading-selection/);

    const cardLayout = await page.evaluate(() => {
        const card = document.querySelector('.player-card');
        const controls = document.querySelector('.selection-mode-controls');
        const name = document.querySelector('.player-nameselection');
        const value = document.querySelector('.player-stat strong');
        const cardStyle = getComputedStyle(card);
        return {
            card: card.getBoundingClientRect().toJSON(),
            controls: controls.getBoundingClientRect().toJSON(),
            background: cardStyle.backgroundColor,
            backgroundImage: cardStyle.backgroundImage,
            nameColor: getComputedStyle(name).color,
            valueColor: getComputedStyle(value).color,
            statCount: document.querySelectorAll('.player-stat[data-player-stat]').length,
        };
    });

    expect(cardLayout.statCount).toBe(6);
    expect(cardLayout.card.right).toBeLessThanOrEqual(390);
    expect(cardLayout.card.bottom).toBeLessThanOrEqual(cardLayout.controls.top);
    expect(cardLayout.backgroundImage).not.toBe('none');
    expect(cardLayout.nameColor).toBe('rgb(255, 255, 255)');
    expect(cardLayout.valueColor).toBe('rgb(255, 255, 255)');
});

test('equipped selection skins use showcase renders and expose both Charizard Mega forms', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/selection.html?layout=experimental&arena=pokemon`);
    await expect(page.locator('body')).not.toHaveClass(/app-loading-selection/);

    await page.getByLabel('Select Charmander').click();
    await expect(page.locator('#character-name')).toHaveText('Charizard');
    await expect(page.locator('#character-portrait')).toHaveAttribute('src', /charizard\.png\.webp\?v=/);

    const megaXButton = page.locator('[data-character-form="mega-x"]');
    const megaYButton = page.locator('[data-character-form="mega-y"]');
    await expect(megaXButton).toBeVisible();
    await expect(megaYButton).toBeVisible();

    await megaXButton.click();
    await expect(page.locator('#character-name')).toHaveText('Mega Charizard X');
    await expect(page.locator('#character-portrait')).toHaveAttribute('src', /megacharizardx\.png\.webp\?v=/);

    await megaYButton.click();
    await expect(page.locator('#character-name')).toHaveText('Mega Charizard Y');
    await expect(page.locator('#character-portrait')).toHaveAttribute('src', /megacharizardy\.png\.webp\?v=/);
});

test('Nincada new UI tabs expose Ninjask and Shedinja renders and skills', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/selection.html?layout=experimental&arena=pokemon`);
    await expect(page.locator('body')).not.toHaveClass(/app-loading-selection/);

    await page.getByLabel('Select Nincada').click();
    await expect(page.locator('#character-name')).toHaveText('Nincada');
    await expect(page.locator('#character-portrait')).toHaveAttribute('src', /nincada\.png\.webp\?v=/);

    const ninjaskButton = page.locator('[data-character-form="ninjask"]');
    const shedinjaButton = page.locator('[data-character-form="shedinja"]');
    await expect(ninjaskButton).toBeVisible();
    await expect(shedinjaButton).toBeVisible();

    await ninjaskButton.click();
    await expect(page.locator('#character-name')).toHaveText('Ninjask');
    await expect(page.locator('#character-portrait')).toHaveAttribute('src', /ninjask\.png\.webp\?v=/);
    await expect(page.locator('.skill-images img[alt="Skitter Smack"]')).toBeVisible();
    await expect(page.locator('.skill-images img[alt="Ability: Speed Boost"]')).toBeVisible();

    await shedinjaButton.click();
    await expect(page.locator('#character-name')).toHaveText('Shedinja');
    await expect(page.locator('#character-portrait')).toHaveAttribute('src', /shedinja\.png\.webp\?v=/);
    await expect(page.locator('.skill-images img[alt="Bug Buzz"]')).toBeVisible();
    await expect(page.locator('.skill-images img[alt="Ability: Wonder Guard"]')).toBeVisible();
});

test('Pokemon type badges render in selection and desktop keeps double-click team removal', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/selection.html?layout=experimental&arena=pokemon`);
    await expect(page.locator('body')).not.toHaveClass(/app-loading-selection/);

    const charmanderSlot = page.getByLabel('Select Charmander');
    await charmanderSlot.click();
    await expect(page.locator('#character-role .pokemon-type-fire')).toHaveText('Fire');
    await page.locator('.skill-images img[alt="Ember"]').click();
    await expect(page.locator('#skill-classes .pokemon-type-fire')).toHaveText('Fire');

    await charmanderSlot.dblclick();
    const selectedCharmander = page.locator('.selected-character-slot .selected-slot-image[alt="Charmander"]');
    await expect(selectedCharmander).toBeVisible();
    await selectedCharmander.dblclick();
    await expect(selectedCharmander).toHaveCount(0);
    await expect(page.getByLabel('Select Charmander')).toBeVisible();
});

test('a mobile tap reliably removes a selected Pokemon from the team', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
    });
    const page = await context.newPage();
    try {
        await page.goto(`${harness.baseUrl}/selection.html?layout=experimental&arena=pokemon`);
        await expect(page.locator('body')).not.toHaveClass(/app-loading-selection/);
        const charmanderSlot = page.getByLabel('Select Charmander');
        await charmanderSlot.tap();
        await charmanderSlot.tap();
        const selectedCharmander = page.locator('.selected-character-slot .selected-slot-image[alt="Charmander"]');
        await expect(selectedCharmander).toBeVisible();
        await selectedCharmander.tap();
        await expect(selectedCharmander).toHaveCount(0);
        await expect(page.getByLabel('Select Charmander')).toBeVisible();
    } finally {
        await context.close();
    }
});

test('experimental post-game copy remains readable against the dark result panel', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon&layout=experimental`);
    await waitForBattleIntroToFinish(page);
    await page.locator('.battle-end-overlay').evaluate((overlay) => overlay.classList.add('visible'));

    await expect(page.locator('.battle-end-message')).toHaveCSS('color', 'rgb(244, 247, 248)');
    await expect(page.locator('.battle-end-title')).toHaveCSS('color', 'rgb(255, 113, 137)');
    await expect(page.locator('.battle-end-panel')).toHaveCSS('background-color', 'rgba(8, 16, 20, 0.96)');
});

test('experimental battle skin keeps the HUD framed on desktop and mobile', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon&layout=experimental`);
    await expect(page.locator('html')).toHaveClass(/battle-experimental/);
    await expect(page.locator('body')).not.toHaveClass(/app-loading-ingame/);

    const desktopLayout = await page.evaluate(() => {
        const bounds = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON();
        return {
            scale: Number.parseFloat(
                getComputedStyle(document.querySelector('.backgroundingame'))
                    .getPropertyValue('--experimental-battle-scale')
            ),
            hud: bounds('.game-hud'),
            playerTeam: bounds('.player-characters'),
            enemyTeam: bounds('.enemy-characters'),
            skillPanel: bounds('.skillinformation'),
        };
    });
    expect(desktopLayout.scale).toBe(1);
    expect(desktopLayout.hud.y).toBeGreaterThanOrEqual(0);
    expect(desktopLayout.skillPanel.y + desktopLayout.skillPanel.height).toBeLessThanOrEqual(900);
    expect(desktopLayout.playerTeam.x).toBeLessThan(desktopLayout.enemyTeam.x);

    const desktopOverlap = await page.evaluate(() => {
        const panel = document.querySelector('.skillinformation').getBoundingClientRect();
        const playerSkills = Array.from(
            document.querySelectorAll('.player-characters .skillscrollingame')
        ).map((element) => element.getBoundingClientRect());
        const enemyCards = Array.from(
            document.querySelectorAll('.enemy-characters .character-card')
        ).map((element) => element.getBoundingClientRect());
        return {
            latestPlayerSkillBottom: Math.max(...playerSkills.map((rect) => rect.bottom)),
            latestEnemyCardBottom: Math.max(...enemyCards.map((rect) => rect.bottom)),
            panelTop: panel.top,
        };
    });
    expect(desktopOverlap.latestPlayerSkillBottom).toBeLessThan(desktopOverlap.panelTop);
    expect(desktopOverlap.latestEnemyCardBottom).toBeLessThan(desktopOverlap.panelTop);

    await page.locator('.player-avatar-left').click();
    await expect(page.locator('.skillinformation')).toHaveClass(/profile-information/);
    await expect(page.locator('.ingameskillname')).toHaveText('ash', { ignoreCase: true });
    await expect(page.locator('.ingameskilldescription')).toContainText('2,450 XP · Lv 8');
    await expect(page.locator('.ingameskilldescription')).toContainText('INDIGO');

    await page.locator('.player-avatar-right').click();
    await expect(page.locator('.ingameskillname')).toHaveText('Gary');
    await expect(page.locator('.ingameskilldescription')).toContainText('21');
    await expect(page.locator('.ingameskilldescription')).toContainText('ROCKET');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/app-loading-ingame/);
    const mobileBounds = await page.locator('.backgroundingame').boundingBox();
    expect(mobileBounds.x).toBeGreaterThanOrEqual(0);
    expect(mobileBounds.y).toBeGreaterThanOrEqual(0);
    expect(mobileBounds.x + mobileBounds.width).toBeLessThanOrEqual(390);
    expect(mobileBounds.y + mobileBounds.height).toBeLessThanOrEqual(844);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/app-loading-ingame/);
    const landscapeBounds = await page.locator('.backgroundingame').boundingBox();
    expect(landscapeBounds.x).toBeGreaterThanOrEqual(0);
    expect(landscapeBounds.y).toBeGreaterThanOrEqual(0);
    expect(landscapeBounds.x + landscapeBounds.width).toBeLessThanOrEqual(844);
    expect(landscapeBounds.y + landscapeBounds.height).toBeLessThanOrEqual(390);
});

test('battle UI toggle preserves the live match while switching classic and experimental layouts', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon&layout=experimental`);
    await expect(page.locator('html')).toHaveClass(/battle-experimental/);
    await expect(page.locator('.ingame-layout-toggle')).toHaveText('Classic UI');

    await page.locator('.ingame-layout-toggle').click();
    await expect(page).toHaveURL(/matchId=match-e2e-1/);
    await expect(page).toHaveURL(/arena=pokemon/);
    await expect(page).toHaveURL(/layout=classic/);
    await expect(page.locator('html')).not.toHaveClass(/battle-experimental/);
    await expect(page.locator('.ingame-layout-toggle')).toHaveText('New UI');

    await page.locator('.ingame-layout-toggle').click();
    await expect(page).toHaveURL(/layout=experimental/);
    await expect(page.locator('html')).toHaveClass(/battle-experimental/);
});

test('battle URLs without a layout start in the new UI', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`);
    await expect(page.locator('html')).toHaveClass(/battle-experimental/);
    await expect(page.locator('.ingame-layout-toggle')).toBeVisible();
    await expect(page.locator('.ingame-layout-toggle')).toHaveText('Classic UI');
    await expect(page.locator('.exchange-label')).toBeVisible();

    const firstCardGeometry = await page.locator('.player-characters .character-card').first().evaluate((card) => {
        const face = card.querySelector('.character-face')?.getBoundingClientRect();
        const skillStrip = card.querySelector('.skillscrollingame')?.getBoundingClientRect();
        const selectedMove = card.querySelector('.skillqueue')?.getBoundingClientRect();
        return {
            faceRight: face?.right || 0,
            skillStripLeft: skillStrip?.left || 0,
            selectedMoveLeft: selectedMove?.left || 0,
            selectedMoveWidth: selectedMove?.width || 0,
            selectedMoveRight: selectedMove?.right || 0,
            firstSkillLeft: card.querySelector('.skillimage')?.getBoundingClientRect().left || 0,
        };
    });
    expect(firstCardGeometry.skillStripLeft).toBeGreaterThan(firstCardGeometry.faceRight);
    expect(firstCardGeometry.selectedMoveLeft).toBeGreaterThan(firstCardGeometry.faceRight);
    expect(firstCardGeometry.selectedMoveWidth).toBeGreaterThanOrEqual(50);
    expect(firstCardGeometry.selectedMoveRight).toBeLessThanOrEqual(firstCardGeometry.firstSkillLeft);
});

test('selection URLs without a layout start in the new UI and can opt into classic', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/selection.html?arena=pokemon`);
    await expect(page.locator('html')).toHaveClass(/selection-experimental/);
    await expect(page.locator('.experimental-classic-link')).toBeVisible();

    await page.locator('.experimental-classic-link').click();
    await expect(page).toHaveURL(/arena=pokemon/);
    await expect(page).toHaveURL(/layout=classic/);
    await expect(page.locator('html')).not.toHaveClass(/selection-experimental/);
    await expect(page.locator('.classic-new-ui-button')).toBeVisible();

    await page.locator('.classic-new-ui-button').click();
    await expect(page).toHaveURL(/arena=pokemon/);
    await expect(page).toHaveURL(/layout=experimental/);
    await expect(page.locator('html')).toHaveClass(/selection-experimental/);
    await expect(page.locator('.experimental-classic-link')).toBeVisible();
});

test('mobile experimental battle keeps skills tappable through queue, chakra selection, and turn end', async ({ page }) => {
    const clefairyIndex = characters.findIndex((entry) => entry.id === 'clefairy');
    harness.state.payload.player.team[1] = 'clefairy';
    harness.state.payload.board.ash[1] = {
        slot: 1,
        rosterIndex: clefairyIndex,
        alive: true,
        hp: 100,
        state: { statuses: [], cooldowns: {}, skillUses: {} },
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon&layout=experimental`);
    await expect(page.locator('body')).not.toHaveClass(/app-loading-ingame/);
    await waitForBattleIntroToFinish(page);

    const skillHitTargets = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.player-characters .skillimage'))
            .filter((skill) => {
                const rect = skill.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && getComputedStyle(skill).visibility !== 'hidden';
            })
            .map((skill) => {
                const rect = skill.getBoundingClientRect();
                const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                return hit === skill || skill.contains(hit) || hit?.closest('.skillimage') === skill;
            })
    );
    expect(skillHitTargets.length).toBeGreaterThanOrEqual(12);
    expect(skillHitTargets.every(Boolean)).toBe(true);

    const trainerCard = page.locator('.player-characters .character-card').first();
    await trainerCard.locator('.skillimage').nth(2).click({ force: true });
    await expect.poll(() => harness.state.pokemonSkillTargets).toBe(1);
    await page.locator('.player-characters .character-card').nth(1).click({ force: true });
    await expect.poll(() => harness.state.pokemonSkillQueues).toBe(1);

    await page.locator('.ready-section').click({ force: true });
    await expect(page.locator('.ChakraChooseEndTurn')).toBeVisible();
    await expect(page.locator('.ChakraChooseEndTurn .chakrachoose')).toContainText('1');
    await page.locator('.ChakraChooseEndTurn .chakra-column .chakra-row').first().locator('.plus-button').click();
    await expect.poll(() => harness.state.pokemonRandomAdjusts).toBe(1);
    await expect(page.locator('.ChakraChooseEndTurn .chakrachoose')).toContainText('0');

    await page.locator('.ok-buttonendturn').click();
    await expect.poll(() => harness.state.turnEnds).toBe(1);
    await expect(page.locator('.ready-text')).toHaveText("OPPONENT'S TURN...");
    await expect(page.locator('.match-issue-banner')).toBeHidden();
});

test('selected Pokemon moves show projected damage and effectiveness on portrait hover', async ({ page }) => {
    const clefairyIndex = characters.findIndex((entry) => entry.id === 'clefairy');
    harness.state.payload.player.team[1] = 'clefairy';
    harness.state.payload.board.ash[1] = {
        slot: 1,
        rosterIndex: clefairyIndex,
        alive: true,
        hp: 100,
        state: { statuses: [], cooldowns: {}, skillUses: {} },
    };

    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon&layout=classic`);
    await waitForBattleIntroToFinish(page);
    await page.locator('.player-characters .character-card').first().locator('.skillimage').nth(2).click({ force: true });
    await expect.poll(() => harness.state.pokemonSkillTargets).toBe(1);

    const targetCard = page.locator('.player-characters .character-card').nth(1);
    await targetCard.hover();
    const preview = targetCard.locator('.target-damage-preview');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('25 damage');
    await expect(preview).toContainText('Fire → Grass');
    await expect(preview).toContainText('Super Effective (+5)');
});

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

test('periodic status icons show live damage tooltips in fullscreen', async ({ page }) => {
    harness.state.payload.board.gary[0].state.statuses = [
        {
            id: 'beedrill_poison_sting',
            remainingTurns: 99,
            sourceSkillId: 'beedrill-poison-sting',
            metadata: {
                harmful: true,
                turnStartDamage: 15,
                afflictionDamage: true,
                poisonStingStacks: 3,
            },
        },
    ];
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`);
    await waitForBattleIntroToFinish(page);

    const statusIcon = page
        .locator('.enemy-characters .character-card')
        .first()
        .locator('.skilltooltips .skilltooltipimage')
        .first();
    await expect(statusIcon).toBeVisible();
    await page.locator('.ingame-fullscreen-toggle').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);

    await statusIcon.hover();
    const tooltip = page.locator('.backgroundingame > .global-status-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('This character takes 15 affliction damage each turn.');
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

test('pokemon ingame ignores an older websocket snapshot after a newer revision', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-1&arena=pokemon`);
    await waitForBattleIntroToFinish(page);

    const newer = {
        ...harness.state.payload,
        stateRevision: 9,
        turnNumber: 4,
        currentTurn: 'gary',
        ...buildTurnTimestamps(),
    };
    harness.broadcastMatchState(newer);
    await expect(page.locator('.ready-text')).toHaveText("OPPONENT'S TURN...");

    harness.broadcastMatchState({
        ...harness.state.payload,
        stateRevision: 8,
        turnNumber: 3,
        currentTurn: 'ash',
        ...buildTurnTimestamps(),
    });
    await page.waitForTimeout(250);
    await expect(page.locator('.ready-text')).toHaveText("OPPONENT'S TURN...");
});

test('comic ingame ends turn without reloading the match page', async ({ page }) => {
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-comic-1&arena=comic&layout=classic`);

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
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-comic-1&arena=comic&layout=classic`);

    await expect(page.locator('body')).toHaveClass(/arena-mode-comic/);
    const passiveIcon = page.locator('.player-characters .character-card').nth(1).locator('.skilltooltips .skilltooltipimage').first();
    await expect(passiveIcon).toHaveAttribute('src', spiderSensesIconUrl);
    await waitForBattleIntroToFinish(page);

    await page.locator('.player-characters .character-card').first().locator('.skillimage').first().click({ force: true });
    await expect.poll(() => harness.state.comicSkillTargets).toBeGreaterThanOrEqual(1);
    await page.locator('.enemy-characters .character-card').first().click({ force: true });

    await expect.poll(() => harness.state.comicSkillQueues).toBe(1);
    await expect(page.locator('.match-issue-banner')).toBeHidden();
});

test('comic stale not-your-turn end response is treated as already advanced', async ({ page }) => {
    harness.state.useComicStaleNotYourTurnOnEnd = true;
    await page.goto(`${harness.baseUrl}/ingame.html?matchId=match-e2e-comic-1&arena=comic&layout=classic`);

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
