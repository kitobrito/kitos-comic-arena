'use strict';

// The tri-game portal (Comic-Arena, Pokemon-Arena, Shattered Realms): every page loads the shared
// theme engine, the new routes and short links resolve, and the new browser scripts are public.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { app, isPrivateStaticSourcePath } = require('../server');

const root = path.join(__dirname, '..');
const GAME_SCREENS = new Set(['ingame.html', 'selection.html', 'selection-login.html']);

test('every portal page loads the theme engine; the battle and launch screens do not', () => {
    for (const file of fs.readdirSync(root).filter((f) => f.endsWith('.html'))) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        const loads = html.includes('/scripts/tri-portal.js') && html.includes('/styles/tri-portal.css');
        assert.equal(loads, !GAME_SCREENS.has(file), file);
        if (loads) {
            assert.ok(html.indexOf('/scripts/tri-portal.js') < html.indexOf('</head>'), `${file}: theme engine runs before first paint`);
        }
    }
});

test('the portal scripts are public, server sources stay private', () => {
    for (const p of ['/scripts/tri-portal.js', '/scripts/shattered-portal.js', '/scripts/split-hub.js']) {
        assert.equal(isPrivateStaticSourcePath(p), false, p);
    }
    assert.equal(isPrivateStaticSourcePath('/scripts/copy-mongo-data.js'), true);
});

test('portal routes, the Pokemon front page and universe-aware short links', async (t) => {
    const listener = await new Promise((resolve, reject) => {
        const candidate = app.listen(0, '127.0.0.1', () => resolve(candidate));
        candidate.once('error', reject);
    });
    t.after(() => new Promise((resolve) => listener.close(resolve)));
    const base = `http://127.0.0.1:${listener.address().port}`;

    for (const route of ['/', '/comic', '/split', '/shattered', '/shattered-news', '/shattered-factions', '/shattered-manual',
        '/shattered-ladder', '/shattered-account', '/shattered-play', '/scripts/tri-portal.js', '/styles/tri-portal.css']) {
        const res = await fetch(base + route);
        assert.equal(res.status, 200, route);
    }
    const js = await fetch(base + '/scripts/tri-portal.js');
    assert.match(js.headers.get('content-type'), /javascript/);

    const pokemon = await (await fetch(base + '/pokemon')).text();
    assert.match(pokemon, /<body class="home-classic-page" data-page-arena="pokemon">/, '/pokemon is the portal layout in Pokemon mode');
    assert.match(pokemon, /id="auth-form"/);

    const go = async (route, cookie) => {
        const res = await fetch(base + route, { redirect: 'manual', headers: cookie ? { cookie } : {} });
        assert.equal(res.status, 302, route);
        return res.headers.get('location');
    };
    assert.equal(await go('/characters'), '/charactersandskills.html');
    assert.equal(await go('/characters', 'tri_universe=pokemon'), '/pokemon-charactersandskills.html');
    assert.equal(await go('/characters', 'tri_universe=shattered'), '/shattered-factions');
    assert.equal(await go('/missions?universe=pokemon', 'tri_universe=shattered'), '/pokemon-missions');
    assert.equal(await go('/ladder', 'tri_universe=shattered'), '/shattered-ladder');
    assert.equal(await go('/news', 'tri_universe=comic'), '/comic#news-feed');
    assert.equal(await go('/login', 'tri_universe=bogus'), '/comic#auth-panel');

    const csp = (await fetch(base + '/shattered')).headers.get('content-security-policy');
    assert.match(csp, /connect-src[^;]*https:\/\/shattered-realms\.onrender\.com/, 'the site may call the Shattered Realms API');
});
