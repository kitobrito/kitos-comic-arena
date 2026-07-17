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
});

test('skill costs begin after the move browser instead of underneath it', () => {
    assert.match(styles, /\.energytext \{ left: 170px;/);
    assert.match(styles, /\.ingameclasses \{ left: 300px;/);
    assert.match(ingame, /styles\/ingame-experimental\.css\?v=pokemon-gameplay-fixes-v1/);
});
