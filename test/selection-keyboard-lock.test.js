const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'selection-experimental.css'), 'utf8');

test('clicking outside the open store restores the roster', () => {
    assert.match(
        script,
        /selectionMissionsEl\.contains\(event\.target\)[\s\S]*?setSelectionStoreOpen\(false\)/
    );
    assert.match(styles, /body\.experimental-store-open \.slot-list/);
});

test('arrow keys highlight roster characters and Enter adds the highlighted character', () => {
    assert.match(script, /const movementKeys = \['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'\]/);
    assert.match(script, /setRosterKeyboardHighlight\(targetEntry\.rosterIndex\)/);
    assert.match(script, /activateHighlightedRosterCharacter\(\)/);
    assert.match(script, /addRosterCharacterToSelection\(previousIndex\)/);
    assert.match(styles, /\.slot-item\.keyboard-highlighted/);
});

test('keyboard navigation reaches team slots and Enter removes a selected teammate', () => {
    assert.match(script, /setTeamKeyboardHighlight\(teamIndex, \{ rosterRow: current\.row \}\)/);
    assert.match(script, /keyboardSelectionZone === 'team'/);
    assert.match(
        script,
        /keyboardSelectionZone === 'team'\) \{\s*setTeamKeyboardHighlight\(highlightedTeamSlotIndex, \{ focus: false \}\)/
    );
    assert.match(script, /handleSelectedSlotDoubleClick\(highlightedTeamSlotIndex\)/);
    assert.match(styles, /\.selected-character-slot\.keyboard-highlighted/);
});

test('crossing through team slots preserves the originating roster row', () => {
    assert.match(script, /let highlightedTeamRosterRow = 1/);
    assert.match(script, /setTeamKeyboardHighlight\(0, \{ rosterRow: current\.row \}\)/);
    assert.match(
        script,
        /focusRosterBankRow\('right', highlightedTeamRosterRow, 5\)/
    );
    assert.match(
        script,
        /focusRosterBankRow\('left', highlightedTeamRosterRow, 4\)/
    );
});

test('left and right arrows route through the center controls between roster banks', () => {
    assert.match(
        script,
        /event\.key === 'ArrowRight' && current\.column <= 4[\s\S]*?current\.row === 0[\s\S]*?setMatchKeyboardHighlight\(0\)[\s\S]*?setTeamKeyboardHighlight\(0, \{ rosterRow: current\.row \}\)/
    );
    assert.match(
        script,
        /event\.key === 'ArrowLeft' && current\.column >= 5[\s\S]*?current\.row === 0[\s\S]*?setMatchKeyboardHighlight\(1\)[\s\S]*?setTeamKeyboardHighlight\(selectedSlots\.length - 1, \{ rosterRow: current\.row \}\)/
    );
    assert.match(script, /focusRosterBankRow\('right', 0, targetColumn\)/);
    assert.match(script, /focusRosterBankRow\('right', highlightedTeamRosterRow, 5\)/);
});

test('outer roster navigation highlights page arrows and Enter changes pages', () => {
    assert.match(script, /setPageKeyboardHighlight\('next'\)/);
    assert.match(script, /setPageKeyboardHighlight\('previous'\)/);
    assert.match(script, /keyboardSelectionZone === 'pagination'/);
    assert.match(script, /if \(canChangePage\) pageButton\?\.click\(\)/);
    assert.match(styles, /\.nextpage\.keyboard-highlighted/);
    assert.match(styles, /\.lastpage\.keyboard-highlighted/);
});

test('private match search is centered in the experimental viewport', () => {
    assert.match(styles, /\.private-match-backdrop\s*\{[^}]*width: 100vw;[^}]*height: 100vh;/s);
    assert.match(styles, /\.private-match-modal\s*\{[^}]*top: 0;[^}]*left: 0;/s);
    assert.match(
        styles,
        /\.private-match-title,\s*html\.selection-experimental \.private-match-input,[^}]*position: static;/s
    );
});

test('battle matchmaking search is centered and has mobile sizing', () => {
    assert.match(styles, /\.searching-backdrop\s*\{[^}]*position: fixed;[^}]*width: 100vw;[^}]*height: 100vh;/s);
    assert.match(styles, /\.searchingscroll\s*\{[^}]*top: 0;[^}]*left: 0;[^}]*min-height: 245px;/s);
    assert.match(styles, /\.cancel-button,[\s\S]*?position: static;[\s\S]*?min-height: 44px;/);
    assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.searching-backdrop[\s\S]*?min-height: 230px/);
    assert.match(styles, /orientation: landscape[\s\S]*?\.searchingscroll[\s\S]*?min-height: 160px/);
});

test('keyboard navigation reaches match buttons and Enter starts or cancels matchmaking', () => {
    assert.match(script, /setMatchKeyboardHighlight\(2\)/);
    assert.match(script, /setMatchKeyboardHighlight\(current\.column <= 4 \? 0 : 1\)/);
    assert.match(script, /keyboardSelectionZone === 'matches'/);
    assert.match(
        script,
        /keyboardSelectionZone === 'matches'\) \{\s*setMatchKeyboardHighlight\(highlightedMatchButtonIndex, \{ focus: false \}\)/
    );
    assert.match(script, /if \(matchButton && !matchButton\.disabled\) matchButton\.click\(\)/);
    assert.match(script, /activeMatchmakingMode === 'quick'\) cancelMatchmaking\(\)/);
    assert.match(script, /activeMatchmakingMode === 'ladder'\) cancelMatchmaking\(\)/);
    assert.match(styles, /\.game-button\.keyboard-highlighted/);
    assert.match(styles, /\.matchmaking-searching::after/);
});

test('locked characters are darkened, badged, and routed through a purchase confirmation', () => {
    assert.match(html, /class="selection-unlock-confirm-backdrop hidden"/);
    assert.match(script, /lockBadge\.className = 'selection-roster-lock'/);
    assert.match(script, /openSelectionUnlockConfirm\(character\)/);
    assert.match(script, /Unlock them for \$\{cost\.toLocaleString\(\)\} points\?/);
    assert.match(script, /buyMissionCharacterUnlock\(characterId, selectionUnlockConfirmYes\)/);
    assert.match(styles, /\.slot-item\.slot-locked \.slot-image\s*\{[^}]*brightness\(0\.28\)/s);
});

test('the locked confirmation closes through No, Escape, or an outside click', () => {
    assert.match(script, /selectionUnlockConfirmNo\?\.addEventListener\('click', closeSelectionUnlockConfirm\)/);
    assert.match(script, /event\.target === selectionUnlockConfirmBackdrop/);
    assert.match(script, /event\.key === 'Escape' && modalOpen/);
});
