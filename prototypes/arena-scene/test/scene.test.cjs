const test = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'arena-scene-integration-only';
process.env.ALLOW_INSECURE_HTTP = 'true';
const jwt = require('jsonwebtoken');
const http = require('node:http');
const characters = require('../../../characters.js');
const engine = require('../../../server.js');
const { MemoryCollection, admin, member } = require('./fixture.cjs');
const { isSceneSourcePath } = require('../access.cjs');
const teamFor = ids => ids.map(id => characters.findIndex(c => c.characterId === id));
const teams = { pokemon: teamFor(['charmander', 'bulbasaur', 'pikachu']), comic: teamFor(['iron-man', 'spider-man', 'captain-america']) };
const cookieFor = name => `comic_session=${jwt.sign({ username: name }, process.env.JWT_SECRET)}`;
let base, server, matches, users;
test.before(async () => {
    matches = new MemoryCollection(); users = new MemoryCollection([admin, member]);
    engine.setPersistenceCollectionsForTests({ matches, users });
    server = engine.app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { engine.setPersistenceCollectionsForTests(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
const request = (url, { user = admin.username, body, ...options } = {}) => fetch(base + url, {
    ...options, headers: { ...(user ? { Cookie: cookieFor(user) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
});
test('guests and ordinary accounts cannot open or start either preview; current database role wins', async () => {
    for (const path of ['/arena-scene/', '/arena-scene/selection.html?layout=experimental&arena=comic', '/arena-scene/ingame.html']) {
        assert.equal((await request(path, { user: null })).status, 401, path);
        assert.equal((await request(path, { user: member.username })).status, 403, path);
    }
    // The battlefield's files are public: any player can turn the experimental view on in battle.
    for (const path of ['/arena-scene/scene.js', '/arena-scene/scene.css', '/arena-scene/forest.svg', '/arena-scene/arena.webp']) {
        assert.equal((await request(path, { user: null })).status, 200, path);
        assert.equal((await request(path, { user: member.username })).status, 200, path);
    }
    assert.equal((await request('/api/admin/arena-scene/start', { user: null, body: { team: teams.pokemon, arena: 'pokemon' } })).status, 401);
    assert.equal((await request('/api/admin/arena-scene/start', { user: member.username, body: { team: teams.pokemon, arena: 'pokemon' } })).status, 403);
    const user = users.docs.find(u => u.username === admin.username); user.role = 'player';
    assert.equal((await request('/arena-scene/ingame.html')).status, 403); user.role = 'admin';
});
test('private wrappers retain production scripts with private scene assets and no shared caching', async () => {
    for (const page of ['selection.html?arena=pokemon&layout=experimental', 'ingame.html?arena=comic']) {
        const response = await request('/arena-scene/' + page); assert.equal(response.status, 200);
        assert.match(response.headers.get('cache-control'), /private.*no-store/);
        assert.match(response.headers.get('x-robots-tag'), /noindex/);
        const html = await response.text(); assert.match(html, /<base href="\/">/); assert.match(html, /ARENA_SCENE_PREVIEW=true/);
        assert.match(html, /scripts\/script.js/); assert.match(html, /\/arena-scene\/scene.js/);
    }
});
test('the preview opens on Comic Arena unless Pokémon is asked for', async () => {
    const plain = await request('/arena-scene/', { redirect: 'manual' });
    assert.equal(plain.status, 302); assert.match(plain.headers.get('location'), /selection\.html\?arena=comic$/);
    const pokemon = await request('/arena-scene/?arena=pokemon', { redirect: 'manual' });
    assert.match(pokemon.headers.get('location'), /arena=pokemon$/);
});
test('raw source, encoded aliases and test fixtures cannot bypass the private gate', async () => {
    for (const path of ['/prototypes/arena-scene/access.cjs', '//prototypes//arena-scene//scene.js', '/%70rototypes/arena-scene/scene.css', '/prototypes%2farena-scene/scene.js', '/prototypes/arena-scene/test/serve.cjs']) {
        assert.equal(isSceneSourcePath(path), true, path);
        const status = await new Promise((resolve, reject) => http.get(base + path, res => { res.resume(); resolve(res.statusCode); }).on('error', reject));
        assert.equal(status, 404, path);
    }
    assert.equal((await request('/arena-scene/test/serve.cjs')).status, 404);
});
test('both arenas create real three-versus-three bot boards without entering the live matchmaking map', async () => {
    for (const arena of ['pokemon', 'comic']) {
        const response = await request('/api/admin/arena-scene/start', { body: { arena, team: teams[arena] } });
        const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result));
        const match = await matches.findOne({ matchId: result.matchId });
        assert.match(match.matchId, /^scene-/); assert.equal(match.adminRenderPreview, true); assert.equal(match.mode, 'pve'); assert.equal(match.arena, arena);
        assert.equal(match.currentTurn, admin.username); assert.deepEqual(match.players[0].team, teams[arena]);
        assert.equal(match.players[1].isBot, true); assert.equal(match.players[1].team.length, 3);
        assert.equal(engine.isTeamRosterInArena(match.players[1].team, arena), true);
        assert.equal(match.board[admin.username].length, 3); assert.equal(match.board[admin.username][0].hp, 100);
        assert.equal(engine.getUserMatchForTests(admin.username), null);
        assert.equal(await engine.findMostRecentActiveMatchForUser(admin.username, arena), null);
        assert.equal((await request('/api/match/' + result.matchId, { user: member.username })).status, 403);
    }
});
test('invalid, duplicate and mixed-arena teams are rejected before a match is created', async () => {
    const before = matches.docs.length;
    for (const team of [[teams.pokemon[0]], [teams.pokemon[0], teams.pokemon[0], teams.pokemon[2]], [...teams.pokemon.slice(0, 2), teams.comic[0]]]) {
        assert.equal((await request('/api/admin/arena-scene/start', { body: { team, arena: 'pokemon' } })).status, 400);
    }
    assert.equal(matches.docs.length, before);
});
test('preview completion cannot write rewards, mission progress or recent-game records', async () => {
    const before = structuredClone(users.docs), writes = users.writes;
    for (const match of matches.docs) {
        assert.equal(await engine.applyMatchCompletionRewards(match, admin.username, new Date()), null);
    }
    assert.deepEqual(users.docs, before); assert.equal(users.writes, writes);
});
test('an active ranked match is still recovered when a newer private preview exists', async () => {
    const normal = { matchId: 'ranked-match', arena: 'pokemon', mode: 'ladder', status: 'active', players: [{ username: admin.username }], matchStartsAt: new Date(0), createdAt: new Date(0) };
    await matches.insertOne(normal);
    assert.equal((await engine.findMostRecentActiveMatchForUser(admin.username, 'pokemon')).matchId, normal.matchId);
});
test('a player sees the energy the enemy destroyed or stole from them, and only their own', async () => {
    const battleLogic = require('../../../battleLogic.js');
    const created = await engine.createAdminSceneMatch({ user: admin, team: teams.comic, arena: 'comic' });
    const stored = matches.docs.find(m => m.matchId === created.matchId);
    const bot = stored.players[1].username;
    stored.chakraPools[admin.username] = { taijutsu: 1, bloodline: 0, ninjutsu: 0, genjutsu: 0 };
    battleLogic.removeRandomChakraFromMatch({ match: stored, username: admin.username, amount: 1, sourceUsername: bot });
    battleLogic.recordEnergyLoss(stored, { username: admin.username, type: 'genjutsu', kind: 'stolen', toUsername: bot, sourceSlot: 2 });
    battleLogic.recordEnergyLoss(stored, { username: bot, type: 'ninjutsu', kind: 'destroyed' });
    const payload = await (await request('/api/match/' + stored.matchId)).json();
    assert.deepEqual(payload.energyLosses.map(l => [l.type, l.kind, l.toUsername]), [['taijutsu', 'destroyed', null], ['genjutsu', 'stolen', bot]]);
    assert.ok(Array.isArray(payload.lastChakraGain[admin.username]));
});
test('every player can switch a real battle to the experimental battlefield and back', async () => {
    const page = await (await request('/ingame.html', { user: member.username })).text();
    assert.match(page, /data-scene-view-toggle> Experimental battlefield \(beta\)/);
    assert.match(page, /localStorage\.getItem\('battleExperimentalView'\) === '1'/);
    assert.match(page, /\/arena-scene\/scene\.css\?v=/);
    assert.match(page, /\/arena-scene\/scene\.js\?v=/);
    const script = await (await request('/arena-scene/scene.js', { user: member.username })).text();
    assert.match(script, /scene-classic-view/);
    assert.match(script, /battleExperimentalView', '0'/);
});
test('revoking admin role immediately denies an existing preview match API', async () => {
    const match = matches.docs.find(m => m.adminRenderPreview);
    users.docs.find(u => u.username === admin.username).role = 'player';
    assert.equal((await request('/api/match/' + match.matchId)).status, 403);
    assert.equal((await request('/api/match/' + match.matchId + '/version')).status, 403);
    assert.equal((await request('/api/match/' + match.matchId.replace('scene-', '%73cene-'))).status, 403);
    assert.equal((await request('/API/MATCH/' + match.matchId)).status, 403);
    users.docs.find(u => u.username === admin.username).role = 'admin';
});

test('real skill targeting, turn resolution and bot response work in both arenas', { timeout: 20000 }, async () => {
    for (const arena of ['pokemon', 'comic']) {
        const created = await engine.createAdminSceneMatch({ user: admin, team: teams[arena], arena });
        const stored = matches.docs.find(m => m.matchId === created.matchId);
        stored.matchStartsAt = new Date(Date.now() - 1000);
        for (const player of stored.players) stored.chakraPools[player.username] = { taijutsu: 10, bloodline: 10, ninjutsu: 10, genjutsu: 10 };
        const url = '/api/match/' + stored.matchId;
        const targetResponse = await request(url + '/skill/targets', { body: { actorSlot: 0, skillIndex: 0 } });
        const options = await targetResponse.json();
        assert.equal(targetResponse.status, 200, JSON.stringify(options));
        assert.ok(options.targets.length > 0, JSON.stringify(options));
        const enemy = stored.players[1].username;
        const target = options.targets.find(t => t.username === enemy) || options.targets[0];
        const targetSelection = options.mode === 'all' ? options.targets.map(({ username, slot }) => ({ username, slot })) : { username: target.username, slot: target.slot };
        const queuedResponse = await request(url + '/skill/queue', { body: { actorSlot: 0, skillIndex: 0, targetSelection } });
        const queued = await queuedResponse.json(); assert.equal(queuedResponse.status, 200, JSON.stringify(queued));
        assert.ok(queued.pendingTurn.queuedByActorSlot['0']);
        for (let count = 0; count < (queued.pendingTurn.unresolvedRandom || 0); count++) {
            const response = await request(url + '/turn/random/adjust', { body: { chakraType: 'genjutsu', delta: 1 } }); assert.equal(response.status, 200);
        }
        const endedResponse = await request(url + '/turn/end', { body: {} }); const ended = await endedResponse.json();
        assert.equal(endedResponse.status, 200, JSON.stringify(ended)); assert.equal(ended.currentTurn, enemy);
        assert.ok(ended.board[enemy].some(u => u.hp < 100 || u.state.statuses.length > 0), 'The real skill must affect its target');
        let afterBot;
        for (let count = 0; count < 45; count++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            afterBot = await matches.findOne({ matchId: stored.matchId });
            if (afterBot.currentTurn === admin.username) break;
        }
        assert.equal(afterBot.currentTurn, admin.username, 'The existing bot must finish its turn');
        assert.ok(afterBot.turnNumber >= 2); assert.ok(afterBot.stateRevision > ended.stateRevision);
        // Ending this preview must not change the real active-match mapping.
        const mapping = engine.getUserMatchForTests(admin.username), beforeUsers = structuredClone(users.docs);
        const surrender = await request(url + '/surrender', { method: 'POST' }); assert.equal(surrender.status, 200);
        assert.deepEqual(engine.getUserMatchForTests(admin.username), mapping);
        assert.deepEqual(users.docs, beforeUsers);
    }
});

test('creating and surrendering a preview preserves an already active real PvP battle', async () => {
    const real = engine.buildPairedMatchDocument({ username: admin.username, team: teams.pokemon, opponent: { username: 'OtherRealPlayer', team: teams.pokemon, profile: {} }, mode: 'ladder', arena: 'pokemon', profile: {} });
    await matches.insertOne(real);
    const before = structuredClone(engine.getUserMatchForTests(admin.username));
    assert.equal(before.matchId, real.matchId);
    const preview = await engine.createAdminSceneMatch({ user: admin, team: teams.pokemon, arena: 'pokemon' });
    assert.deepEqual(engine.getUserMatchForTests(admin.username), before);
    assert.equal((await engine.findMostRecentActiveMatchForUser(admin.username, 'pokemon')).matchId, real.matchId);
    const result = await request('/api/match/' + preview.matchId + '/surrender', { method: 'POST' }); assert.equal(result.status, 200);
    assert.deepEqual(engine.getUserMatchForTests(admin.username), before);
    const recovered = await (await request('/api/match/status?arena=pokemon')).json(); assert.equal(recovered.matchId, real.matchId);
    engine.resetMatchmakingStateForTests();
});
