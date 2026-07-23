const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const styles = fs.readFileSync(path.join(root, 'styles', 'ingame-experimental.css'), 'utf8');
const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

test('battle usernames are contained inside their header panels', () => {
    assert.match(styles, /\.player-left,[\s\S]*?\.player-right \{[\s\S]*?overflow: hidden;/);
    assert.match(styles, /\.player-info,[\s\S]*?\.player-inforight \{[\s\S]*?max-width: 127px;[\s\S]*?overflow: hidden;/);
    assert.match(styles, /\.player-name \{[\s\S]*?width: 100%;[\s\S]*?text-overflow: ellipsis;/);
    assert.match(styles, /\.player-info,[\s\S]*?\.player-inforight \{[\s\S]*?position: static;[\s\S]*?left: auto;/);
});

test('skill costs begin after the move browser instead of underneath it', () => {
    assert.match(styles, /\.energytext \{ left: 170px;/);
    assert.match(styles, /\.ingameclasses \{ left: 300px;/);
    assert.match(ingame, /styles\/ingame-experimental\.css\?v=pokemon-gameplay-fixes-v4/);
});

test('experimental battle chat is a visible standalone control beside surrender', () => {
    assert.match(ingame, /<\/div>\s*<section class="match-chat collapsed" aria-label="Match chat">/);
    assert.match(styles, /html\.battle-experimental \.match-chat \{[\s\S]*?top: 494px;[\s\S]*?left: 147px;[\s\S]*?width: 75px;/);
    assert.match(styles, /html\.battle-experimental \.match-chat-panel \{[\s\S]*?bottom: 46px;[\s\S]*?width: 300px;/);
});

test('experimental battle keeps full skill rows visible and centers the end-turn energy dialog', () => {
    assert.match(styles, /\.skillscrollingame\.not-turn,[\s\S]*?clip-path: none;/);
    assert.match(styles, /\.ChakraChooseEndTurn \{[\s\S]*?top: 50%;[\s\S]*?left: 50%;[\s\S]*?translate\(-50%, -50%\)/);
});
