const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs: parseCharacterArgs } = require('../scripts/character-payload-tool');
const { parseArgs: parseLiveArgs, hashValue } = require('../scripts/live-deploy-verifier');
const { parseArgs: parseMatchArgs, summarizeUnit } = require('../scripts/match-debugger');
const { detectSkillDrift } = require('../scripts/balance-drift-checker');

test('character payload tool parses inspect args', () => {
    const parsed = parseCharacterArgs(['inspect', '--character', 'magikarp', '--json']);
    assert.deepEqual(parsed, {
        command: 'inspect',
        options: {
            characterId: 'magikarp',
            json: true,
        },
    });
});

test('live deploy verifier parses options and hashes stably', () => {
    const parsed = parseLiveArgs(['--character', 'magikarp', '--url', 'https://example.com', '--json']);
    assert.equal(parsed.characterId, 'magikarp');
    assert.equal(parsed.url, 'https://example.com');
    assert.equal(parsed.json, true);
    assert.equal(hashValue({ a: 1 }).length, 12);
});

test('match debugger parses args and summarizes unit state', () => {
    const parsed = parseMatchArgs(['--username', 'ash', '--viewer', 'ash', '--arena', 'pokemon']);
    assert.equal(parsed.username, 'ash');
    assert.equal(parsed.viewer, 'ash');
    assert.equal(parsed.arena, 'pokemon');

    const summary = summarizeUnit(
        {
            alive: true,
            hp: 90,
            maxHp: 100,
            state: {
                cooldowns: { tackle: 1 },
                statuses: [{ id: 'burn', remainingTurns: 2, metadata: { turnEndDamage: 5 } }],
            },
        },
        0
    );
    assert.equal(summary.statusCount, 1);
    assert.equal(summary.cooldowns.tackle, 1);
});

test('balance drift checker catches text-to-effect mismatch', () => {
    const issues = detectSkillDrift({
        skilldescription: 'Deals 20 damage and loses 5 health.',
        effects: [
            { type: 'damage', amount: 25 },
            { type: 'HealthLoss', amount: 4 },
        ],
    });
    assert.equal(issues.length, 2);
});
