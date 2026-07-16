const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const experimentalStyles = fs.readFileSync(
    path.join(root, 'styles', 'selection-experimental.css'),
    'utf8'
);
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('experimental selection exposes a three-section store in the roster area', () => {
    assert.match(html, /class="experimental-store-toggle"[^>]*>Store</);
    assert.match(html, /class="experimental-missions-toggle"[^>]*>Missions</);
    assert.match(html, /data-store-category-button="characters"/);
    assert.match(html, /data-store-category-button="points"/);
    assert.match(html, /data-store-category-button="skins"/);
    assert.match(experimentalStyles, /body\.experimental-store-open \.slot-list/);
    assert.match(experimentalStyles, /\.selection-character-store-grid/);
    assert.match(
        experimentalStyles,
        /\.selection-missions:not\(\.collapsed\) \{\s*pointer-events: auto;/
    );
});

test('missions reuse the lower store panel and expose goals and requirements', () => {
    assert.match(script, /setSelectionStoreCategory\('missions'\)/);
    assert.match(script, /selectionPanelTitle\.textContent = showingMissions \? 'Missions' : 'Store'/);
    assert.match(script, /`Goals: \$\{getSelectionMissionProgressText\(mission, progress\)\}`/);
    assert.match(script, /requirementsText\.className = 'selection-mission-requirements'/);
    assert.match(experimentalStyles, /body\.experimental-missions-open \.selection-missions-list/);
});

test('the top-right utilities occupy a non-overlapping vertical rail', () => {
    assert.match(experimentalStyles, /\.experimental-toolbar\s*\{[^}]*width: min\(22vw, 340px\)/s);
    assert.match(experimentalStyles, /\.selection-mode-controls\s*\{[^}]*top: 17vh/s);
    assert.match(experimentalStyles, /\.roster-filter-panel\s*\{[^}]*top: 30vh/s);
});

test('character store lists the active roster and reuses the existing purchase endpoint', () => {
    assert.match(
        script,
        /getBaseRosterDisplayIndices\(\)\.forEach\(\(rosterIndex\) => \{/
    );
    assert.match(script, /buyMissionCharacterUnlock\(characterId, action\)/);
    assert.match(script, /\/api\/missions\/unlock-points\/purchase/);
    assert.match(script, /\/api\/unlock-points\/paypal\/create-order/);
    assert.match(script, /\/api\/skins\/unlock/);
});

test('point checkout returns customers to the experimental store layout', () => {
    assert.match(script, /layout: document\.documentElement\.classList\.contains\('selection-experimental'\)/);
    assert.match(server, /req\.body\?\.layout === 'experimental' \? '&layout=experimental' : ''/);
});

test('store category filtering keeps characters, point packages, and skins separate', () => {
    assert.match(script, /section\.dataset\.storeCategory = 'characters'/);
    assert.match(script, /storeCard\.dataset\.storeCategory = 'points'/);
    assert.match(script, /section\.dataset\.storeCategory = 'skins'/);
    assert.match(
        script,
        /section\.hidden = section\.dataset\.storeCategory !== activeSelectionStoreCategory/
    );
});
