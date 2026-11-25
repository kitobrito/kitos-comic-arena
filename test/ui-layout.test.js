// Settings > User interface: the layout loader (scripts/ui-layout.js), the chooser, and the Scroll layouts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const loader = read('scripts', 'ui-layout.js');

// Run the loader as a page would: a pathname, a query string and saved choices.
const runLoader = ({ page = 'selection', search = '', stored = {} } = {}) => {
    const classes = new Set();
    const attrs = {};
    const storage = { ...stored };
    const window = {
        location: { pathname: page === 'ingame' ? '/ingame.html' : '/selection.html', search },
        localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } },
    };
    const document = { documentElement: { classList: { add: (...c) => c.forEach((x) => classes.add(x)) }, hasAttribute: () => false, setAttribute: (k, v) => { attrs[k] = v; } } };
    vm.runInNewContext(loader, { window, document, localStorage: window.localStorage, URLSearchParams });
    return { classes: [...classes].sort(), layout: attrs['data-ui-layout'], api: window.ArenaUiLayout, storage };
};

test('character select: Arena by default, the saved choice otherwise, and ?layout= still wins', () => {
    assert.deepEqual(runLoader().classes, ['selection-experimental', 'selection-mockup']);
    assert.deepEqual(runLoader({ stored: { 'uiLayout.selection': 'scroll' } }).classes, ['selection-scroll']);
    assert.deepEqual(runLoader({ stored: { 'uiLayout.selection': 'experimental' } }).classes, ['selection-experimental']);
    assert.deepEqual(runLoader({ stored: { 'uiLayout.selection': 'classic' } }).classes, []);
    assert.deepEqual(runLoader({ search: '?layout=classic', stored: { 'uiLayout.selection': 'scroll' } }).classes, []);
    assert.deepEqual(runLoader({ search: '?layout=scroll' }).classes, ['selection-scroll']);
});

test('in-game: Arena by default; Scroll, Classic and the battlefield beta are choices', () => {
    assert.deepEqual(runLoader({ page: 'ingame' }).classes, ['battle-experimental']);
    assert.deepEqual(runLoader({ page: 'ingame', stored: { 'uiLayout.ingame': 'scroll' } }).classes, ['battle-scroll']);
    assert.deepEqual(runLoader({ page: 'ingame', stored: { 'uiLayout.ingame': 'classic' } }).classes, []);
    const battlefield = runLoader({ page: 'ingame', stored: { 'uiLayout.ingame': 'battlefield' } });
    assert.equal(battlefield.layout, 'battlefield');
    // The old Experimental battlefield switch still counts as choosing it.
    assert.equal(runLoader({ page: 'ingame', stored: { battleExperimentalView: '1' } }).layout, 'battlefield');
    assert.deepEqual(runLoader({ page: 'ingame', search: '?layout=classic' }).classes, []);
});

test('saving a choice keeps the old battlefield switch in step and ignores unknown layouts', () => {
    const { api, storage } = runLoader({ page: 'ingame' });
    api.set('ingame', 'battlefield');
    assert.equal(storage['uiLayout.ingame'], 'battlefield');
    assert.equal(storage.battleExperimentalView, '1');
    api.set('ingame', 'scroll');
    assert.equal(storage.battleExperimentalView, '0');
    api.set('selection', 'nonsense');
    assert.equal(storage['uiLayout.selection'], undefined);
    assert.equal(JSON.stringify(api.OPTIONS.selection.map((o) => o.id)), JSON.stringify(['arena', 'scroll', 'experimental', 'classic']));
    assert.equal(JSON.stringify(api.OPTIONS.ingame.map((o) => o.id)), JSON.stringify(['arena', 'scroll', 'battlefield', 'classic']));
});

test('both pages load the loader first, the chooser, and their Scroll layout', () => {
    const selection = read('selection.html');
    const ingame = read('ingame.html');
    for (const html of [selection, ingame]) {
        assert.ok(html.indexOf('scripts/ui-layout.js') < html.indexOf('styles/style.css'), 'the loader runs before the stylesheets');
        assert.match(html, /scripts\/ui-layout-settings\.js/);
        assert.match(html, /styles\/ui-layout-settings\.css/);
    }
    assert.match(selection, /scripts\/selection-scroll\.js/);
    assert.match(selection, /styles\/selection-scroll\.css/);
    assert.match(ingame, /scripts\/ingame-scroll\.js/);
    assert.match(ingame, /styles\/ingame-scroll\.css/);
    // The battlefield beta is now one of the in-game layouts.
    assert.match(ingame, /window\.ArenaUiLayout\.layout === 'battlefield'/);
});

test('the chooser opens from every layout’s settings', () => {
    const chooser = read('scripts', 'ui-layout-settings.js');
    assert.match(chooser, /selection-ui-options/);            // the Options panel of the older layouts
    assert.match(chooser, /\.as-set-grid/);                   // the arena select screen's SETTINGS menu
    assert.match(chooser, /ingame-interface-options/);        // in battle: Settings > User Interface
    assert.match(chooser, /\['selection', 'Character select'\], \['ingame', 'In-game'\]/);
    assert.match(read('scripts', 'selection-scroll.js'), /ArenaUiLayoutSettings\.open\('selection'\)/); // STYLES
});

test('the Scroll layouts use the measured stage sizes and theme both arenas', () => {
    const sel = read('styles', 'selection-scroll.css');
    const bat = read('styles', 'ingame-scroll.css');
    assert.match(sel, /width: 993px !important; height: 729px !important/);
    assert.match(sel, /grid-template-columns: repeat\(7, 64px\)/);
    assert.match(sel, /body\.arena-mode-pokemon/);
    assert.match(bat, /width: 1000px !important; height: 728px !important/);
    assert.match(bat, /body\.bs-pokemon/);
});

test('one User interface news post per arena, published at server startup, no emojis', async () => {
    const { comicPost, pokemonPost, syncUserInterfaceNews } = require('../sync_user_interface_news');
    assert.equal(comicPost.arena, 'comic');
    assert.equal(pokemonPost.arena, 'pokemon');
    for (const post of [comicPost, pokemonPost]) {
        assert.deepEqual(post.blocks.map((b) => b.text), post.paragraphs);
        assert.match(post.paragraphs.join(' '), /User interface setting/);
        assert.match(post.paragraphs.join(' '), /Scroll layout/);
        assert.doesNotMatch(JSON.stringify(post), /\p{Extended_Pictographic}/u);
    }
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); } }) };
    await syncUserInterfaceNews(db); await syncUserInterfaceNews(db);
    assert.equal(docs.size, 2);
    assert.match(read('server.js'), /await syncUserInterfaceNews\(db\)/);
});

test('the Scroll battle keeps the enemy side mirrored so their characters face yours', () => {
    const bat = read('styles', 'ingame-scroll.css');
    assert.match(bat, /\.enemy-characters \{ transform: scaleX\(-1\) !important; transform-origin: 500px 0 !important; \}/);
    assert.doesNotMatch(bat, /\.player-characters, html\.battle-scroll \.enemy-characters \{[^}]*transform: none/);
});
