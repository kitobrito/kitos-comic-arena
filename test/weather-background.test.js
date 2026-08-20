const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('every referenced weather/default arena background file exists locally', () => {
    const backgroundFiles = [
        'assets/images/PokemonArena/backgrounds and weather/Default Background.jpg',
        'assets/images/PokemonArena/backgrounds and weather/Snowstorm.jpg',
        'assets/images/PokemonArena/backgrounds and weather/Wildfire.jpg',
        'assets/images/PokemonArena/backgrounds and weather/Lightning Storm.jpg',
    ];
    backgroundFiles.forEach((file) => {
        assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`);
    });
});

test('client maps each active weather key to its background image and swaps the arena background', () => {
    const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    assert.match(
        script,
        /POKEMON_INGAME_BACKGROUND_URL\s*=\s*\n?\s*'assets\/images\/PokemonArena\/backgrounds%20and%20weather\/Default%20Background\.jpg'/
    );
    assert.match(script, /POKEMON_WEATHER_BACKGROUND_URLS\s*=\s*\{/);
    assert.match(script, /snowstorm:\s*'assets\/images\/PokemonArena\/backgrounds%20and%20weather\/Snowstorm\.jpg'/);
    assert.match(script, /wildfire:\s*'assets\/images\/PokemonArena\/backgrounds%20and%20weather\/Wildfire\.jpg'/);
    assert.match(
        script,
        /thunderstorm:\s*'assets\/images\/PokemonArena\/backgrounds%20and%20weather\/Lightning%20Storm\.jpg'/
    );
    assert.match(script, /getPokemonWeatherBackgroundUrl\(data\?\.weather\?\.key\)/);
});

test('client shows a big center-screen alert on weather start and on every countdown tick', () => {
    const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    assert.match(script, /const showWeatherChangeAlert = /);
    assert.match(script, /const trackWeatherChangeForAlert = /);
    // Fresh weather (key changed since last seen) always alerts, independent of a prior count.
    assert.match(script, /weather\.key !== lastKnownWeatherKey/);
    // A same-weather countdown tick only alerts when the number actually decreased.
    assert.match(script, /nextRounds < lastKnownWeatherRounds/);
    assert.match(script, /trackWeatherChangeForAlert\(activePokemonWeather\)/);
});

test('style.css gives the weather-change alert a distinct enter animation and an obvious old-to-new number transition', () => {
    const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    assert.match(styles, /\.weather-change-alert\s*\{/);
    assert.match(styles, /@keyframes weather-change-alert-enter/);
    assert.match(styles, /@keyframes weather-change-alert-number-pop/);
    assert.match(styles, /\.weather-change-alert-countdown-old\s*\{[^}]*text-decoration: line-through/);
    assert.match(styles, /\.weather-change-alert-countdown-new\s*\{[^}]*animation: weather-change-alert-number-pop/);
});
