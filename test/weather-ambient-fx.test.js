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

test('the battle FX engine flies a skill\'s effect from caster to target, looping frames mid-flight, then plays the impact', () => {
    const engine = fs.readFileSync(path.join(root, 'scripts', 'battle-fx.js'), 'utf8');
    assert.match(engine, /await playSprite\(\{ key: profile\.travel, from, to, size: from\.h \* 0\.7, duration: flight, loop: true/);
    assert.match(engine, /if \(loop\) frame %= frameCount;/);
    assert.match(engine, /if \(profile\.impact\) playSprite\(\{ key: profile\.impact, x: to\.x, y: to\.y/);
});

test('battle-fx.css keeps sprites above the board and mutes them with the same toggles as other cast effects', () => {
    const css = fs.readFileSync(path.join(root, 'styles', 'battle-fx.css'), 'utf8');
    assert.match(css, /\.bfx-layer \{[\s\S]*?position: fixed;[\s\S]*?z-index: 9000;/);
    assert.match(css, /body\.ui-disable-skill-cast-animations \.bfx-sprite/);
    assert.match(css, /body\.skill-effects-muted \.bfx-sprite/);
});
