const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const {
    estimateBattleBotPersistentDamage,
    exchangeChakra,
} = require('../server');

const root = path.join(__dirname, '..');
const scriptSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const ingameSource = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

test('chakra exchange accepts two matching energy and rejects mixed energy', () => {
    const makeMatch = () => ({
        chakraPools: {
            Ash: { taijutsu: 2, ninjutsu: 1, genjutsu: 1, bloodline: 0 },
        },
    });
    const match = makeMatch();
    exchangeChakra({
        match,
        username: 'Ash',
        chakraType: 'bloodline',
        spendAssignments: { taijutsu: 2 },
    });
    assert.deepEqual(match.chakraPools.Ash, {
        taijutsu: 0,
        ninjutsu: 1,
        genjutsu: 1,
        bloodline: 1,
    });
    assert.throws(
        () => exchangeChakra({
            match: makeMatch(),
            username: 'Ash',
            chakraType: 'bloodline',
            spendAssignments: { ninjutsu: 1, genjutsu: 1 },
        }),
        /one color/
    );
});

test('client exchange chooser enforces a single energy color', () => {
    assert.match(scriptSource, /const EXCHANGE_CHAKRA_COST = 2/);
    assert.match(scriptSource, /const assignedOtherColor = chakraTypes\.some/);
    assert.match(scriptSource, /exchangeSpendAssignments = emptyPool\(\)/);
    assert.match(ingameSource, /CHOOSE <span class="chakrachoosered">0<\/span> OF ONE ENERGY COLOR/);
});

test('Beedrill stacking poison is valued as persistent bot damage', () => {
    const beedrill = characters.find((character) => character.id === 'beedrill');
    const poisonSting = beedrill.skills.find((skill) => skill.id === 'beedrill-poison-sting');
    assert.equal(estimateBattleBotPersistentDamage(poisonSting), 5);
    assert.match(poisonSting.skilldescription, /permanently repeats/);
});

test('Hive Swarm ignores two enemy damage effects in both forms', () => {
    const beedrill = characters.find((character) => character.id === 'beedrill');
    const hiveSwarm = beedrill.skills.find((skill) => skill.id === 'beedrill-hive-swarm');
    assert.equal(hiveSwarm.effects[0].metadata.ignoreNextEnemyDamageEffects, 2);
    assert.equal(hiveSwarm.evolvesTo.effects[0].metadata.ignoreNextEnemyDamageEffects, 2);
    assert.doesNotMatch(hiveSwarm.skilldescription, /next 3 enemy/);
});

test('Trainer capture targeting uses confirmed selections and case-insensitive slots', () => {
    assert.match(scriptSource, /if \(usernamesMatch\(username, currentPlayerUsername\)\)/);
    assert.match(scriptSource, /const getPokemonTrainerBallTargetKey = \(username, slot\)/);
    assert.match(scriptSource, /normalizeTargetSelectionList\(selection\)\.forEach/);
    assert.match(scriptSource, /showPokemonTrainerBallFx\(\{ actorCard, targetCards, selection, variant: 'pokeball' \}\)/);
    assert.match(ingameSource, /pokemon-trainer-capture-audio-v4/);
});

test('same-visual match updates still refresh authoritative chakra and pending turn', () => {
    assert.match(scriptSource, /if \(nextVisualSignature === lastAppliedMatchVisualSignature\) \{[\s\S]*renderChakra\(unchangedVisualPool\)/);
    assert.match(scriptSource, /pendingTurnState = normalizePendingTurn\(data\.pendingTurn\)/);
    assert.match(scriptSource, /getScopedValueForCurrentUsername\(data\?\.chakraPools, playerUsername\)/);
});
