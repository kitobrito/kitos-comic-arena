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

test('character select: Classic by default, with saved layouts and URL overrides', () => {
    assert.deepEqual(runLoader().classes, ['selection-experimental', 'selection-mockup']);
    assert.deepEqual(runLoader({ stored: { 'uiLayout.selection': 'scroll' } }).classes, ['selection-scroll']);
    assert.deepEqual(runLoader({ stored: { 'uiLayout.selection': 'experimental' } }).classes, ['selection-experimental']);
    const retired = runLoader({ stored: { 'uiLayout.selection': 'classic' } });
    assert.deepEqual(retired.classes, ['selection-experimental', 'selection-mockup']);
    assert.equal(retired.storage['uiLayout.selection'], 'arena');
    assert.deepEqual(runLoader({ search: '?layout=classic', stored: { 'uiLayout.selection': 'scroll' } }).classes, ['selection-experimental', 'selection-mockup']);
    assert.deepEqual(runLoader({ search: '?layout=Naruto-Arena' }).classes, ['selection-scroll']);
});

test('in-game: Classic by default, with Naruto-Arena and the battlefield beta', () => {
    assert.deepEqual(runLoader({ page: 'ingame' }).classes, ['battle-experimental']);
    assert.deepEqual(runLoader({ page: 'ingame', stored: { 'uiLayout.ingame': 'scroll' } }).classes, ['battle-scroll']);
    const retired = runLoader({ page: 'ingame', stored: { 'uiLayout.ingame': 'classic', battleExperimentalView: '1' } });
    assert.deepEqual(retired.classes, ['battle-experimental']);
    assert.equal(retired.storage['uiLayout.ingame'], 'arena');
    assert.equal(retired.storage.battleExperimentalView, '0');
    const battlefield = runLoader({ page: 'ingame', stored: { 'uiLayout.ingame': 'battlefield' } });
    assert.equal(battlefield.layout, 'battlefield');
    // The old Experimental battlefield switch still counts as choosing it.
    assert.equal(runLoader({ page: 'ingame', stored: { battleExperimentalView: '1' } }).layout, 'battlefield');
    assert.deepEqual(runLoader({ page: 'ingame', search: '?layout=classic' }).classes, ['battle-experimental']);
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
    assert.equal(JSON.stringify(api.OPTIONS.selection.map((o) => o.id)), JSON.stringify(['arena', 'scroll', 'experimental']));
    assert.equal(JSON.stringify(api.OPTIONS.ingame.map((o) => o.id)), JSON.stringify(['arena', 'scroll', 'battlefield']));
    assert.equal(JSON.stringify(api.OPTIONS.selection.map((o) => o.name)), JSON.stringify(['Classic', 'Naruto-Arena', 'Cheshy']));
    assert.equal(JSON.stringify(api.OPTIONS.ingame.map((o) => o.name)), JSON.stringify(['Classic', 'Naruto-Arena', 'Experimental battlefield']));
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

test('the server serves every script a page loads from scripts/ (its allow-list keeps the rest private)', () => {
    const server = read('server.js');
    const list = server.slice(server.indexOf('const PUBLIC_SCRIPTS_FILES'), server.indexOf('const isPrivateStaticSourcePath'));
    const allowed = new Set([...list.matchAll(/'(\/scripts\/[^']+)'/g)].map((m) => m[1]));
    const missing = [];
    for (const file of fs.readdirSync(root).filter((f) => f.endsWith('.html'))) {
        for (const m of read(file).matchAll(/<script[^>]+src="(?:\.?\/)?(scripts\/[^"?#]+)/g)) {
            if (!allowed.has('/' + m[1])) missing.push(`${file}: ${m[1]}`);
        }
    }
    assert.deepEqual(missing, []);
});

test('Pokemon Arena uses its own ten rank hats, one per ladder tier', () => {
    const script = read('scripts', 'script.js');
    for (const tier of ['academy', 'genin', 'chunin', 'missingnin', 'anbu', 'jounin', 'sannin', 'jinch', 'akatsuki', 'kage', 'hokage']) {
        assert.match(script, new RegExp(`${tier}: \\d+`));
    }
    for (let n = 1; n <= 10; n += 1) {
        assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'hats', 'pokemon', `rank-${String(n).padStart(2, '0')}.png`)));
    }
    assert.match(read('styles', 'style.css'), /\.rank-hat\.rank-hat-pokemon \{[^}]*width: 127px;/);
    const { pokemonPost } = require('../sync_pokemon_rank_hats_news');
    assert.equal(pokemonPost.arena, 'pokemon');
    assert.match(pokemonPost.paragraphs.join(' '), /Onix, Starmie, Raichu, Vileplume, Weezing, Alakazam, Arcanine, Rhydon, Zapdos and, at the very top, Mew/);
    const pic = pokemonPost.blocks.find((b) => b.type === 'image');
    assert.ok(pic && fs.existsSync(path.join(root, pic.src)));
    assert.match(read('scripts', 'index.js'), /block\.type === "image"/);
    assert.doesNotMatch(JSON.stringify(pokemonPost), /\p{Extended_Pictographic}/u);
    assert.match(read('server.js'), /await syncPokemonRankHatsNews\(db\)/);
});

test('the server keeps site-image blocks in news posts (and drops other images)', () => {
    const src = read('server.js');
    const fn = new Function(`${src.slice(src.indexOf('// Pictures in news posts'), src.indexOf('const normalizeNewsArena'))}; return normalizeNewsBlocks;`)();
    const { pokemonPost } = require('../sync_pokemon_rank_hats_news');
    const kept = fn(pokemonPost.blocks).filter((b) => b.type === 'image');
    assert.equal(kept.length, 1);
    assert.equal(kept[0].src, '/assets/images/news/pokemon-rank-hats.png');
    assert.equal(fn([{ type: 'image', src: 'https://example.com/x.png' }, { type: 'image', src: '/assets/../server.js' }]).length, 0);
});
