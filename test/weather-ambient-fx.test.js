const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

test('ingame.html has the ambient weather fx layer markup', () => {
    assert.match(ingame, /id="weather-ambient-fx"/);
    assert.match(ingame, /id="weather-fx-snow"/);
    assert.match(ingame, /id="weather-fx-lightning-static"/);
    assert.match(ingame, /id="weather-fx-lightning-flash"/);
});

test('client spawns snowflakes lazily once per match and only while snowstorm is active', () => {
    assert.match(script, /const initWeatherFxSnow = /);
    assert.match(script, /if \(weatherFxSnowInitialized\) return;/);
    assert.match(script, /flake\.className = 'weather-fx-snowflake';/);
    assert.match(script, /if \(normalizedKey === 'snowstorm'\) initWeatherFxSnow\(\);/);
});

test('setAmbientWeatherFx toggles exactly one body class per weather key and is a no-op on repeat calls', () => {
    assert.match(script, /const setAmbientWeatherFx = \(weatherKey\) => \{/);
    assert.match(script, /if \(normalizedKey === activeWeatherFxKey\) return;/);
    assert.match(
        script,
        /document\.body\.classList\.toggle\('weather-fx-snow-active', normalizedKey === 'snowstorm'\)/
    );
    assert.match(
        script,
        /document\.body\.classList\.toggle\('weather-fx-wildfire-active', normalizedKey === 'wildfire'\)/
    );
    assert.match(
        script,
        /document\.body\.classList\.toggle\('weather-fx-lightning-active', lightningActive\)/
    );
    assert.match(script, /setAmbientWeatherFx\(activePokemonWeather\?\.key \|\| null\)/);
});

test('lightning flashes on a random interval, only reschedules while thunderstorm is still active, and is stoppable', () => {
    assert.match(script, /const stopWeatherFxLightning = /);
    assert.match(script, /const scheduleNextLightningFlash = /);
    assert.match(script, /2200 \+ Math\.random\(\) \* 5000/);
    assert.match(
        script,
        /if \(!document\.body\.classList\.contains\('weather-fx-lightning-active'\)\) return;/
    );
    assert.match(script, /stopWeatherFxLightning\(\);/);
    assert.match(script, /if \(lightningActive\) scheduleNextLightningFlash\(\);/);
});

test('style.css defines fall, flicker, static-jitter and flash-pulse animations for the three ambient effects', () => {
    assert.match(styles, /@keyframes weather-fx-snow-fall/);
    assert.match(styles, /\.weather-fx-snowflake\s*\{[^}]*snowflake\.png/s);
    assert.match(styles, /@keyframes weather-fx-fire-flicker/);
    assert.match(styles, /weather-fx-wildfire-active[^{]*\.character-face/s);
    assert.match(styles, /weather-fx-wildfire-active[^{]*\.skillholder/s);
    assert.match(styles, /@keyframes weather-fx-static-jitter/);
    assert.match(styles, /@keyframes weather-fx-lightning-flash-pulse/);
});

test('client flies an elemental sprite from caster to target, looping frames mid-flight, then bursts on arrival', () => {
    assert.match(script, /const playPokemonSpriteProjectile = async \(\{ fromX, fromY, toX, toY, key, flightMs = 520 \}\) => \{/);
    assert.match(script, /cycleSpriteFrames\(el, resolved, \{ loop: true \}\)/);
    assert.match(script, /el\.style\.transition = `left \$\{flightMs\}ms linear, top \$\{flightMs\}ms linear`;/);
    assert.match(script, /playPokemonSpriteBurst\(\{ x: toX, y: toY, key \}\);/);
});

test('style.css positions the projectile sprite above the board and mutes it with the same toggles as the burst', () => {
    assert.match(styles, /\.pokemon-sprite-projectile\s*\{/);
    assert.match(styles, /body\.ui-disable-skill-cast-animations \.pokemon-sprite-projectile/);
    assert.match(styles, /body\.skill-effects-muted \.pokemon-sprite-projectile/);
});
