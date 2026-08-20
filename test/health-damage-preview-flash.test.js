const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');

test('hovering a card while a skill is selected computes and shows the lost-HP slice using the same width math as renderUnitHealth', () => {
    assert.match(script, /const showHealthDamageFlash = \(card, unit, damageAmount\) => \{/);
    assert.match(script, /const currentWidth = Math\.max\(0, Math\.round\(HEALTH_BAR_MAX_WIDTH \* \(hp \/ displayMaxHp\)\)\);/);
    assert.match(script, /const predictedHp = Math\.max\(0, hp - Number\(damageAmount\)\);/);
    assert.match(script, /const predictedWidth = Math\.max\(0, Math\.round\(HEALTH_BAR_MAX_WIDTH \* \(predictedHp \/ displayMaxHp\)\)\);/);
    assert.match(script, /const flashWidth = currentWidth - predictedWidth;/);
    assert.match(script, /flash\.style\.left = `\$\{predictedWidth\}px`;/);
    assert.match(script, /flash\.style\.width = `\$\{flashWidth\}px`;/);
});

test('the flash only shows for valid targets with an available, positive damage preview', () => {
    assert.match(script, /const handleCardTargetHover = \(event\) => \{/);
    assert.match(script, /if \(!activeCastingSkill\) return;/);
    assert.match(
        script,
        /if \(!target \|\| target\.valid === false \|\| !preview\?\.available \|\| !\(Number\(preview\.totalDamage\) > 0\)\) \{/
    );
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

test('style.css positions the flash absolutely inside the health bar container, above the fill, with a pulsing animation', () => {
    assert.match(styles, /\.health-bar-damage-flash\s*\{/);
    assert.match(styles, /@keyframes health-bar-damage-flash-pulse/);
});

test('the flash carries an exact "-N" number label, centered via layout so the enemy-side mirror only needs a plain scaleX(-1)', () => {
    assert.match(script, /label\.textContent = `-\$\{Math\.round\(Number\(damageAmount\)\)\}`;/);
    assert.match(script, /flash\.appendChild\(label\);/);
    assert.match(styles, /\.health-bar-damage-flash-label\s*\{[^}]*width: fit-content;[^}]*margin: 0 auto;/s);
    assert.match(
        styles,
        /\.enemy-characters \.health-bar-damage-flash-label\s*\{\s*transform: scaleX\(-1\);\s*\}/
    );
});
