const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');

test('every weather music track file referenced in the client actually exists on disk', () => {
    const trackFiles = [
        'assets/images/PokemonArena/music/weather/Snowstorm Weather.mp3',
        'assets/images/PokemonArena/music/weather/Wildfire Weather.mp3',
        'assets/images/PokemonArena/music/weather/Thunderstorm Weather.mp3',
    ];
    trackFiles.forEach((file) => {
        assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`);
        assert.ok(fs.statSync(path.join(root, file)).size > 10000, `${file} looks too small to be real audio`);
    });
});

test('the client maps each weather key with a theme to its track file', () => {
    assert.match(script, /const WEATHER_MUSIC_TRACKS = \{/);
    assert.match(
        script,
        /snowstorm: 'assets\/images\/PokemonArena\/music\/weather\/Snowstorm Weather\.mp3',/
    );
    assert.match(
        script,
        /wildfire: 'assets\/images\/PokemonArena\/music\/weather\/Wildfire Weather\.mp3',/
    );
    assert.match(
        script,
        /thunderstorm: 'assets\/images\/PokemonArena\/music\/weather\/Thunderstorm Weather\.mp3',/
    );
});

test('a fresh weather with a theme swaps to a single-track (auto-looping) playlist via soundManager.startMusic', () => {
    assert.match(
        script,
        /const weatherTrack = WEATHER_MUSIC_TRACKS\[weather\.key\];\s*if \(weatherTrack\) \{\s*soundManager\.startMusic\(\[weatherTrack\]\);/
    );
});

test('weather ending resumes the normal battle playlist only if a weather track was actually playing', () => {
    assert.match(
        script,
        /if \(!weather\) \{\s*if \(lastKnownWeatherKey && WEATHER_MUSIC_TRACKS\[lastKnownWeatherKey\]\) \{\s*soundManager\.ensureIngameBattleMusic\(currentMatchArena\);\s*\}\s*lastKnownWeatherKey = null;/
    );
});

test('soundManager.startMusic loops automatically for a single-track playlist, matching the "loop until it subsides" requirement', () => {
    assert.match(script, /if \(musicTracks\.length === 1\) \{\s*currentTrackIndex = 0;/);
    assert.match(script, /if \(musicTracks\.length === 1\) \{\s*currentMusic\.loop = true;\s*\} else \{/);
});
