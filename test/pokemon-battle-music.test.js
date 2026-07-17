const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const scriptSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const musicDirectory = path.join(root, 'assets', 'images', 'PokemonArena', 'music');

test('Pokemon Arena battle playlist includes every MP3 in its music folder', () => {
    const playlistMatch = scriptSource.match(/const pokemonIngameMusicTracks = \[([\s\S]*?)\n\s*\];/);
    assert.ok(playlistMatch, 'Pokemon Arena music playlist should be defined');

    const configuredTracks = Array.from(
        playlistMatch[1].matchAll(/['"]([^'"]+\.mp3)['"]/g),
        (match) => match[1]
    ).sort();
    const folderTracks = fs.readdirSync(musicDirectory)
        .filter((filename) => path.extname(filename).toLowerCase() === '.mp3')
        .map((filename) => `assets/images/PokemonArena/music/${filename}`)
        .sort();

    assert.deepEqual(configuredTracks, folderTracks);
});

test('multi-track battle music uses a reshuffled deck without an immediate repeat', () => {
    assert.match(scriptSource, /const buildShuffledTrackIndices = \(trackCount, previousIndex = -1\)/);
    assert.match(scriptSource, /indices\.length > 1 && indices\[0\] === previousIndex/);
    assert.match(scriptSource, /shuffledTrackIndices = buildShuffledTrackIndices\(/);
    assert.match(scriptSource, /currentMusic\.onended = playNextTrack/);
});
