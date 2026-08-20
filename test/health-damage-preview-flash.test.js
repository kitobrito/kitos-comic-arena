const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');

test('hp/hpCap/displayMaxHp and the "X/Y" text/pixel-width math are shared between renderUnitHealth and the hover flash', () => {
    assert.match(script, /const computeUnitHealthMetrics = \(unit\) => \{/);
    assert.match(script, /const formatHealthText = \(hp, hpCap, displayMaxHp\) =>/);
    assert.match(script, /const healthPxWidth = \(hp, displayMaxHp\) =>/);
    assert.match(script, /const \{ hp, hpCap, displayMaxHp \} = computeUnitHealthMetrics\(unit\);/);
});

test('showHealthDamageFlash flashes the known slice, and blinks the health text to the resulting value, only when the amount is known', () => {
    assert.match(script, /const showHealthDamageFlash = \(card, unit, damageAmount, \{ uncertain = false \} = \{\}\) => \{/);
    assert.match(script, /const predictedHp = known \? Math\.max\(0, hp - Number\(damageAmount\)\) : hp;/);
    assert.match(script, /const flashWidth = currentWidth - predictedWidth;/);
    assert.match(script, /healthText\.textContent = formatHealthText\(predictedHp, hpCap, displayMaxHp\);/);
    assert.match(script, /healthText\.classList\.add\('health-text-preview-blink'\);/);
});

test('hideHealthDamageFlash restores the real HP text by recomputing from latestBoardState, not a cached string', () => {
    assert.match(script, /const hideHealthDamageFlash = \(card\) => \{/);
    assert.match(script, /healthText\.classList\.remove\('health-text-preview-blink'\);/);
    assert.match(script, /const unit = Number\.isInteger\(slot\) \? latestBoardState\?\.\[username\]\?\.\[slot\] : null;/);
    assert.match(script, /healthText\.textContent = formatHealthText\(hp, hpCap, displayMaxHp\);/);
});

test('a variable preview flashes only the certain portion and appends "+???"; a fully-uncertain preview shows a standalone "+???" marker', () => {
    assert.match(
        script,
        /if \(preview\.available && Number\(preview\.totalDamage\) > 0 && !preview\.variable\) \{\s*showHealthDamageFlash\(card, unit, preview\.totalDamage\);\s*\} else if \(preview\.variable\) \{\s*showHealthDamageFlash\(card, unit, Number\(preview\.certainDamage\) \|\| 0, \{ uncertain: true \}\);/
    );
    assert.match(
        script,
        /label\.textContent = known\s*\?\s*`-\$\{Math\.round\(Number\(damageAmount\)\)\}\$\{uncertain \? ' \+ \?\?\?' : ''\}`\s*:\s*'\+ \?\?\?';/
    );
    assert.match(script, /marker\.className = 'health-bar-damage-flash health-bar-damage-flash-uncertain-only';/);
});

test('pointerenter/pointerleave are wired on every card alongside the existing pointerdown targeting handler', () => {
    assert.match(script, /card\.addEventListener\('pointerenter', handleCardTargetHover\);/);
    assert.match(script, /card\.addEventListener\('pointerleave', handleCardTargetHoverEnd\);/);
    assert.match(script, /const handleCardTargetHoverEnd = \(event\) => \{\s*hideHealthDamageFlash\(event\.currentTarget\);/);
});

test('clearing target highlights (cancelling a cast) also removes any lingering health flash', () => {
    assert.match(
        script,
        /'\.target-overlay, \.target-lock-marker, \.blind-potential-skill-icon, \.target-damage-preview, \.health-bar-damage-flash'/
    );
});

test('style.css positions the flash and its label, blinks the HP text, and mutes the box/animation for the uncertain-only marker', () => {
    assert.match(styles, /\.health-bar-damage-flash\s*\{/);
    assert.match(styles, /@keyframes health-bar-damage-flash-pulse/);
    assert.match(styles, /\.health-bar-damage-flash-label\s*\{[^}]*width: fit-content;[^}]*margin: 0 auto;/s);
    assert.match(
        styles,
        /\.enemy-characters \.health-bar-damage-flash-label\s*\{\s*transform: scaleX\(-1\);\s*\}/
    );
    assert.match(styles, /\.health-text\.health-text-preview-blink\s*\{/);
    assert.match(styles, /@keyframes health-text-preview-blink-pulse/);
    assert.match(
        styles,
        /\.health-bar-damage-flash\.health-bar-damage-flash-uncertain-only\s*\{\s*background: transparent;\s*box-shadow: none;\s*animation: none;\s*\}/
    );
});
