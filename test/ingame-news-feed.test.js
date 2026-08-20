const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
const experimentalStyles = fs.readFileSync(path.join(root, 'styles', 'selection-experimental.css'), 'utf8');

test('selection.html has a classic-layout news toggle, an experimental-toolbar news toggle, and the panel markup', () => {
    assert.match(selectionHtml, /id="ingame-news-toggle"/);
    assert.match(selectionHtml, /class="experimental-news-toggle"/);
    assert.match(selectionHtml, /id="ingame-news-backdrop"/);
    assert.match(selectionHtml, /id="ingame-news-panel"/);
    assert.match(selectionHtml, /id="ingame-news-content"/);
    assert.match(selectionHtml, /id="ingame-news-prev"/);
    assert.match(selectionHtml, /id="ingame-news-next"/);
    assert.match(selectionHtml, /id="ingame-news-counter"/);
});

test('client fetches from the same /api/news endpoint the public site uses, filtered to the current arena', () => {
    assert.match(script, /fetch\(`\/api\/news\?arena=\$\{encodeURIComponent\(arena\)\}`/);
    assert.match(
        script,
        /const arena = document\.body\.classList\.contains\('arena-mode-pokemon'\) \? 'pokemon' : 'comic';/
    );
});

test('both news toggle buttons open the same panel and it can be closed via the close button, backdrop click, or Escape', () => {
    assert.match(script, /\[ingameNewsToggle, ingameNewsToggleExperimental\]\.forEach/);
    assert.match(script, /ingameNewsClose\?\.addEventListener\('click', \(\) => setIngameNewsPanelOpen\(false\)\)/);
    assert.match(
        script,
        /ingameNewsBackdrop\?\.addEventListener\('click', \(event\) => \{\s*if \(event\.target === ingameNewsBackdrop\) setIngameNewsPanelOpen\(false\);/
    );
    assert.match(script, /event\.key === 'Escape' && ingameNewsBackdrop\?\.classList\.contains\('visible'\)/);
});

test('client renders post title, meta, paragraph/divider blocks, and grouped changes, matching the server news-post shape', () => {
    assert.match(script, /const renderIngameNewsPost = \(post\) => \{/);
    assert.match(script, /block\?\.type === 'divider'/);
    assert.match(script, /Character and Skill Changes/);
});

test('re-opening the panel only re-fetches when the arena actually changed, and caches otherwise', () => {
    assert.match(script, /let ingameNewsLoadedForArena = null;/);
    assert.match(script, /if \(!force && ingameNewsLoadedForArena === arena\) \{/);
});

test('the classic fixed toggle hides in experimental layout, matching the classic-new-ui-button pattern', () => {
    assert.match(styles, /html\.selection-experimental \.ingame-news-toggle\s*\{\s*display: none;\s*\}/);
});

test('the experimental toolbar styles the news toggle alongside its other buttons at every responsive breakpoint', () => {
    const groupedSelectorBlocks = experimentalStyles.match(
        /html\.selection-experimental \.experimental-store-toggle,[\s\S]*?\{/g
    ) || [];
    assert.ok(groupedSelectorBlocks.length >= 3, 'expected the news toggle to be grouped into every toolbar-button breakpoint block');
    groupedSelectorBlocks.forEach((block) => {
        assert.match(block, /\.experimental-news-toggle/);
    });
});
