const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

test('a skill icon glows once when its cooldown transitions from >0 to 0 during an animated tick, not on initial render', () => {
    assert.match(
        script,
        /if \(options\.animateTicks && previousCooldown !== undefined && previousCooldown > 0\) \{\s*meta\.imgEl\.classList\.remove\('skill-ready-glow'\);\s*void meta\.imgEl\.offsetWidth;\s*meta\.imgEl\.classList\.add\('skill-ready-glow'\);\s*\}/
    );
});

test('style.css defines a one-time glow-pulse animation for the skill icon and includes it in the reduced-motion list', () => {
    assert.match(styles, /\.skillimage\.skill-ready-glow\s*\{/);
    assert.match(styles, /@keyframes skill-ready-glow-pulse/);
    assert.match(styles, /\.skillimage\.skill-ready-glow,\s*\n\s*\.weather-fx-start-burst\.weather-fx-start-burst-active,/);
});

test('ingame.html has the weather-start-burst layer with its name label inside the existing ambient fx container', () => {
    assert.match(ingame, /<div id="weather-ambient-fx" class="weather-ambient-fx" aria-hidden="true">/);
    assert.match(
        ingame,
        /<div id="weather-fx-start-burst" class="weather-fx-layer weather-fx-start-burst"><span id="weather-fx-start-burst-label" class="weather-fx-start-burst-label"><\/span><\/div>/
    );
});

test('the fly-in label uses a pixel-font gradient fill keyed to the burst color, glowing instead of black-outlined', () => {
    assert.match(styles, /@font-face \{\s*font-family: 'LowresPixel';\s*src: url\('\.\.\/assets\/fonts\/LowresPixel-Regular\.otf'\) format\('opentype'\);\s*\}/);
    assert.match(
        styles,
        /\.weather-fx-start-burst-label\s*\{[^}]*font-family: 'LowresPixel', 'Libre Franklin', Arial, sans-serif;[^}]*background: linear-gradient\(180deg, #ffffff 0%, #ffffff 38%, var\(--weather-fx-start-burst-color, #ffffff\) 100%\);[^}]*background-clip: text;[^}]*-webkit-text-fill-color: transparent;[^}]*filter:\s*drop-shadow/s
    );
    assert.doesNotMatch(styles.slice(styles.indexOf('.weather-fx-start-burst-label {'), styles.indexOf('.weather-fx-start-burst-label {') + 700), /text-stroke|2px 2px 0 #000/);
    assert.match(styles, /@keyframes weather-fx-start-burst-label-fly-in/);
    assert.match(
        script,
        /const playWeatherStartBurst = \(weatherKey, weatherName\) => \{\s*const layer = document\.getElementById\('weather-fx-start-burst'\);\s*const label = document\.getElementById\('weather-fx-start-burst-label'\);\s*if \(!layer \|\| !weatherKey\) return;\s*if \(label\) label\.textContent = weatherName \|\| weatherKey;/
    );
    assert.match(script, /playWeatherStartBurst\(weather\.key, weather\.name\);/);
});

test('playWeatherStartBurst fires once per fresh weather key (not on same-weather tick-only updates) and is not gated by skillCastAnimations', () => {
    assert.match(script, /const playWeatherStartBurst = \(weatherKey, weatherName\) => \{/);
    assert.match(
        script,
        /if \(weather\.key !== lastKnownWeatherKey\) \{\s*showWeatherChangeAlert\(\{ name: weather\.name \|\| weather\.key, newRounds: nextRounds \}\);\s*playWeatherStartBurst\(weather\.key, weather\.name\);/
    );
    assert.doesNotMatch(
        script.slice(script.indexOf('const playWeatherStartBurst'), script.indexOf('const trackWeatherChangeForAlert')),
        /uiSettings\.skillCastAnimations/
    );
});

test('style.css keys the burst color per weather via a CSS custom property for snowstorm/wildfire/thunderstorm', () => {
    assert.match(styles, /\.weather-fx-start-burst\.snowstorm \{ --weather-fx-start-burst-color: [^}]+ \}/);
    assert.match(styles, /\.weather-fx-start-burst\.wildfire \{ --weather-fx-start-burst-color: [^}]+ \}/);
    assert.match(styles, /\.weather-fx-start-burst\.thunderstorm \{ --weather-fx-start-burst-color: [^}]+ \}/);
});
