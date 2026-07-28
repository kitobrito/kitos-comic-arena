const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
const experimentalStyles = fs.readFileSync(
    path.join(root, 'styles', 'selection-experimental.css'),
    'utf8'
);
const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');

test('mobile roster taps add characters through the slot instead of depending on the image', () => {
    assert.match(script, /slot\.addEventListener\('pointerdown'/);
    assert.match(script, /upEvent\.pointerType !== 'mouse'/);
    assert.match(script, /addRosterCharacterToSelection\(dragState\.payload\.rosterIndex\)/);
    assert.doesNotMatch(
        script,
        /startSelectionPointerDrag\(event, \{ type: 'roster', rosterIndex: index \}, image\)/
    );
});

test('matchmaking spinner animation is restarted after cancel and a new search', () => {
    assert.match(
        script,
        /searchingSpinner\.style\.animation = 'none';\s*void searchingSpinner\.offsetWidth;\s*searchingSpinner\.style\.animation = '';/
    );
});

test('mobile portrait swipes remain native vertical page scrolling', () => {
    assert.match(script, /const isTouchFirstMobileSelection =\s*event\.pointerType !== 'mouse'/);
    assert.match(script, /if \(isTouchFirstMobileSelection\) return/);
    assert.match(script, /window\.matchMedia\('\(max-width: 700px\) and \(pointer: coarse\)'\)\.matches/);
    assert.match(experimentalStyles, /\.slot-list[^}]*touch-action:\s*pan-y pinch-zoom/s);
    assert.match(experimentalStyles, /background-attachment:\s*scroll/);
    assert.match(experimentalStyles, /-webkit-overflow-scrolling:\s*touch/);
    assert.match(experimentalStyles, /scroll-behavior:\s*smooth/);
    assert.match(selectionHtml, /selection-experimental\.css\?v=mobile-scroll-v3/);
    assert.match(selectionHtml, /scripts\/script\.js\?v=mobile-scroll-v3/);
});

test('classic mobile selection centers skill icons without the desktop offset', () => {
    assert.match(
        styles,
        /@media \(max-width: 700px\) \{\s*\.skill-images \{[^}]*width:\s*min\(332px, calc\(100vw - 42px\)\);[^}]*margin-left:\s*0;[^}]*justify-content:\s*center;/s
    );
    assert.match(selectionHtml, /styles\/style\.css\?v=selection-skill-scroll-v16/);
});

test('black Random energy costs have a visible white outline', () => {
    assert.match(
        styles,
        /\.energy-pip\.filled\.energy-random\s*\{[^}]*background-color:\s*#000000;[^}]*border-color:\s*#ffffff;/s
    );
    assert.match(selectionHtml, /random-energy-border-v1/);
});

test('mobile character selection waits for a second tap without a timing race', () => {
    assert.match(script, /const isConfirmedSecondTap = mobileRosterTapIndex === rosterIndex;/);
    assert.match(script, /Tap \$\{character\?\.name \|\| 'this character'\} again to add them\./);
    assert.match(script, /if \(isConfirmedSecondTap\) \{\s*addRosterCharacterToSelection\(rosterIndex\);/s);
    assert.doesNotMatch(script, /mobileRosterTapAt|now - mobileRosterTapAt/);
});

test('every mobile character face passes drag gestures to the page scroller', () => {
    assert.match(experimentalStyles, /html\.selection-experimental \{\s*overflow-y:\s*scroll;/s);
    assert.match(experimentalStyles, /html\.selection-experimental body \{[^}]*min-height:\s*1513px;[^}]*overflow:\s*visible;/s);
    assert.match(
        experimentalStyles,
        /\.slot-item,[\s\S]*?\.selected-slot-image,[\s\S]*?\.character-portrait,[\s\S]*?touch-action:\s*manipulation !important;/
    );
});

test('failed roster portraits leave a visible and tappable character fallback', () => {
    assert.match(script, /slot\.dataset\.characterInitial/);
    assert.match(script, /image\.classList\.add\('load-failed'\)/);
    assert.match(styles, /\.slot-item::before/);
    assert.match(styles, /\.slot-image\.load-failed\s*\{[^}]*visibility:\s*hidden/s);
    assert.match(script, /delete slot\.dataset\.characterInitial/);
});

test('selection identity uses the ladder profile for the active arena', () => {
    const hydrateIdentityBlock = script.match(
        /const hydratePlayerIdentity = async[\s\S]*?\r?\n    };\r?\n\r?\n    document\.addEventListener\('visibilitychange'/
    )?.[0] || '';

    assert.match(
        hydrateIdentityBlock,
        /getArenaProfileView\(cachedUser\.profile, resolvedArenaMode\)/
    );
    assert.match(
        hydrateIdentityBlock,
        /getArenaProfileView\(apiUser\.profile, resolvedArenaMode\)/
    );
    assert.doesNotMatch(hydrateIdentityBlock, /ladder: apiUser\.profile\?\.ladder/);
});

test('experimental player card shows rank, experience, record, streak, clan, and ladder position', () => {
    for (const stat of ['rank', 'experience', 'record', 'streak', 'clan', 'ladder']) {
        assert.match(selectionHtml, new RegExp(`data-player-stat="${stat}"`));
    }
    assert.match(script, /valueElement\.textContent = `\$\{ladder\.wins\} W · \$\{ladder\.losses\} L`/);
    assert.match(script, /valueElement\.textContent = formatSignedNumber\(ladder\.streak\)/);
    assert.match(experimentalStyles, /html\.selection-experimental \.player-stat\s*\{[^}]*display:\s*flex/s);
    assert.doesNotMatch(experimentalStyles, /html\.selection-experimental \.player-stat\s*\{[^}]*display:\s*none/s);
});

test('selection drags snap near team slots and otherwise return selected characters to roster', () => {
    assert.match(script, /const snapPadding = 12/);
    assert.match(script, /getSelectedSlotDropIndex\(clientX, clientY, dragState\)/);
    assert.match(
        script,
        /if \(payload\?\.type === 'selected'\) \{\s*return returnSelectedPayloadToRoster\(payload\);/s
    );
    assert.match(
        script,
        /finishSelectionPointerDrop\(\s*dragState\.payload,\s*upEvent\.clientX,\s*upEvent\.clientY,\s*dragState/s
    );
    assert.match(
        script,
        /const cleanupSelectionPointerDrag = \(dragState\)[\s\S]*?sourceElement\.classList\.remove\('drag-hidden'\)/
    );
});

test('the skill scroll stays above a full team so the third portrait cannot intercept it', () => {
    const viewerRule = styles.match(/\.skillviewer\s*\{[^}]*\}/s)?.[0] || '';
    const selectedListRule = styles.match(/\.selected-character-slot-list\s*\{[^}]*\}/s)?.[0] || '';

    assert.match(viewerRule, /z-index:\s*4/);
    assert.match(selectedListRule, /z-index:\s*3/);
});

test('experimental selection has dedicated portrait and landscape phone layouts', () => {
    assert.match(experimentalStyles, /@media \(max-width: 700px\)/);
    assert.match(experimentalStyles, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
    assert.match(experimentalStyles, /grid-template-rows: repeat\(6, 1fr\)/);
    assert.match(experimentalStyles, /@media \(max-width: 950px\) and \(orientation: landscape\)/);
    assert.match(experimentalStyles, /minmax\(200px, 2\.6fr\)/);
    assert.match(experimentalStyles, /body\.custom-game-cursor \*/);
});

test('portrait arena controls reserve their own row above the character panel', () => {
    const portraitLayout = experimentalStyles.match(
        /@media \(max-width: 700px\) \{[\s\S]*?\n\}/
    )?.[0] || '';

    assert.match(
        portraitLayout,
        /\.selection-mode-controls\s*\{[^}]*top:\s*164px;[^}]*min-height:\s*48px;/s
    );
    assert.match(
        portraitLayout,
        /\.skillviewer,[\s\S]*?\.skillviewer\.raveling\s*\{[^}]*top:\s*222px;[^}]*height:\s*330px;/s
    );
    assert.match(portraitLayout, /\.slot-list\s*\{[^}]*top:\s*564px;/s);
    assert.match(selectionHtml, /mobile-arena-bar-layout-v1/);
});
