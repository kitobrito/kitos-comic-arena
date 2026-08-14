import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    legalActions,
    replay,
    resolveQueuedTurn,
    validateAction,
} from '../reference/engine.mjs';
import { Energy, ROSTER, unitPresentation } from '../reference/roster.mjs';

function action(player, actorSlot, skillId, targetPlayer, targetSlot) {
    return { player, actorSlot, skillId, targetPlayer, targetSlot };
}

function enact(state, nextAction) {
    const result = applyAction(state, nextAction);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function pass(state) {
    const result = resolveQueuedTurn(state, []);
    assert.equal(result.ok, true, result.error);
    return result.state;
}

function ready(state, player, pool = 10) {
    state.currentPlayer = player;
    state.winner = null;
    state.energy[player] = {
        [Energy.TAIJUTSU]: pool,
        [Energy.NINJUTSU]: pool,
        [Energy.BLOODLINE]: pool,
        [Energy.GENJUTSU]: pool,
    };
    return state;
}

const teams = {
    A: ['clefairy', 'squirtle', 'bulbasaur'],
    B: ['pidgey', 'chansey', 'koffing'],
};

test('Clefairy and Clefable expose both complete forms, production costs, cooldowns, passive, and artwork', () => {
    const clefairy = ROSTER.clefairy;
    assert.deepEqual(clefairy.types, ['Fairy']);
    assert.equal(clefairy.forcedEvolutionForm, 'clefable');
    assert.deepEqual(clefairy.forms.base.skillIds, [
        'clefairy-metronome',
        'clefairy-double-slap',
        'clefairy-disarming-voice',
        'clefairy-moonlight',
    ]);
    assert.deepEqual(clefairy.forms.clefable.skillIds, [
        'clefable-metronome',
        'clefable-double-slap',
        'clefable-disarming-voice',
        'clefable-moonlight',
    ]);
    assert.deepEqual(
        clefairy.skills.map(({ energy, cooldown }) => ({ energy, cooldown })),
        [
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.BLOODLINE], cooldown: 0 },
            { energy: [Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM, Energy.RANDOM, Energy.RANDOM], cooldown: 2 },
            { energy: [Energy.RANDOM], cooldown: 0 },
        ]
    );
    assert.equal(clefairy.forms.clefable.healOnEnter, 0);
    assert.deepEqual(
        clefairy.startStatuses[0].evolveOnCounter,
        { counter: 'evolution', threshold: 75, form: 'clefable' }
    );
    clefairy.skills.forEach((skill) => assert.match(skill.image, /PokemonArena\/clefairy/i));
});

test('Metronome targets any living character and treats ally and enemy uses by relation', () => {
    let game = createGame({ seed: 1201, teams });
    const targets = legalActions(game)
        .filter((entry) => entry.actorSlot === 0 && entry.skillId === 'clefairy-metronome')
        .map((entry) => `${entry.targetPlayer}:${entry.targetSlot}`)
        .sort();
    assert.deepEqual(targets, ['A:0', 'A:1', 'A:2', 'B:0', 'B:1', 'B:2']);

    game.teams.A[0].statuses.push({
        id: 'helpful-lock', name: 'Helpful Lock', harmful: true,
        durationActions: null, cannotUseHelpfulSkills: true,
    });
    assert.match(
        validateAction(game, action('A', 0, 'clefairy-metronome', 'A', 1)),
        /helpful skills/
    );
    assert.equal(validateAction(game, action('A', 0, 'clefairy-metronome', 'B', 1)), null);

    game.teams.A[0].statuses = [{
        id: 'harmful-lock', name: 'Harmful Lock', harmful: true,
        durationActions: null, stunHarmful: true,
    }];
    assert.match(
        validateAction(game, action('A', 0, 'clefairy-metronome', 'B', 1)),
        /harmful skills/
    );
    assert.equal(validateAction(game, action('A', 0, 'clefairy-metronome', 'A', 1)), null);
});

test('Metronome deterministically copies a damaging enemy effect or an allied heal and counts actual healing', () => {
    let damageGame = createGame({ seed: 1213, teams });
    damageGame = enact(damageGame, action('A', 0, 'clefairy-metronome', 'B', 1));
    const damageCopy = damageGame.events.find((event) => event.kind === 'metronome-copy');
    assert.equal(damageCopy.copiedEffectKind, 'damage');
    assert.equal(typeof damageCopy.copiedSkillId, 'string');
    assert.ok(damageGame.teams.B[1].hp < 100);
    const replayed = replay(exportReplay(damageGame));
    assert.equal(replayed.ok, true, replayed.error);
    assert.deepEqual(replayed.state, damageGame);

    let healGame = createGame({ seed: 1223, teams });
    healGame.teams.A[1].hp = 40;
    healGame = enact(healGame, action('A', 0, 'clefairy-metronome', 'A', 1));
    const healCopy = healGame.events.find((event) => event.kind === 'metronome-copy');
    const actualHealing = healGame.teams.A[1].hp - 40;
    assert.equal(healCopy.copiedEffectKind, 'heal');
    assert.equal(typeof healCopy.copiedSkillId, 'string');
    assert.ok(actualHealing > 0);
    assert.equal(healGame.teams.A[0].counters.evolution, actualHealing);
});

test('Double Slap deals its immediate packet and its source-turn-start follow-up in both forms', () => {
    let base = createGame({ seed: 1231, teams });
    base = enact(base, action('A', 0, 'clefairy-double-slap', 'B', 1));
    assert.equal(base.teams.B[1].hp, 85);
    assert.equal(
        base.teams.B[1].statuses.some((status) => status.id === 'clefairy-double-slap-followup'),
        true
    );
    base = pass(base);
    assert.equal(base.teams.B[1].hp, 70);
    assert.equal(
        base.teams.B[1].statuses.some((status) => status.id === 'clefairy-double-slap-followup'),
        false
    );

    let evolved = createGame({ seed: 1237, teams });
    evolved.teams.A[0].form = 'clefable';
    evolved = enact(evolved, action('A', 0, 'clefable-double-slap', 'B', 1));
    assert.equal(evolved.teams.B[1].hp, 80);
    evolved = pass(evolved);
    assert.equal(evolved.teams.B[1].hp, 60);
});

test('Moonlight follows 60/40/20/0 current-HP steps, counts actual healing, and cleanses affliction at zero', () => {
    let game = createGame({ seed: 1249, teams });
    game.teams.A[1].hp = 20;
    const expectedHp = [32, 44, 52, 52];
    for (let index = 0; index < expectedHp.length; index += 1) {
        ready(game, 'A');
        if (index === 3) {
            game.teams.A[1].statuses.push({
                id: 'test-affliction', name: 'Test Affliction', harmful: true,
                affliction: true, durationActions: null,
            });
        }
        game = enact(game, action('A', 0, 'clefairy-moonlight', 'A', 1));
        assert.equal(game.teams.A[1].hp, expectedHp[index]);
        if (index < expectedHp.length - 1) game = pass(game);
    }
    assert.equal(game.teams.A[0].counters.evolution, 32);
    assert.equal(
        game.teams.A[1].statuses.some((status) => status.id === 'test-affliction'),
        false
    );
    assert.deepEqual(
        game.events.filter((event) => event.kind === 'heal-sequence').map((event) => event.percent),
        [60, 40, 20, 0]
    );
});

test('the seventy-fifth actual healing point evolves Clefairy without an evolution heal', () => {
    let game = createGame({ seed: 1259, teams });
    game.teams.A[0].hp = 40;
    game.teams.A[0].counters.evolution = 74;
    game.teams.A[1].hp = 99;
    game = enact(game, action('A', 0, 'clefairy-moonlight', 'A', 1));
    const clefable = game.teams.A[0];
    assert.equal(clefable.form, 'clefable');
    assert.equal(clefable.hp, 40);
    assert.equal(clefable.counters.evolution, 75);
    assert.equal(unitPresentation(clefable).name, 'Clefable');
    assert.deepEqual(unitPresentation(clefable).skillIds, ROSTER.clefairy.forms.clefable.skillIds);
});

test('Clefable Disarming Voice cleanses and prevents allied accuracy loss and enemy evasion for two source turns', () => {
    let game = createGame({ seed: 1277, teams });
    game.teams.A[0].form = 'clefable';
    game.teams.A[1].statuses.push({
        id: 'existing-blind', name: 'Existing Blind', harmful: true,
        durationActions: null, fullBlind: true,
    });
    game.teams.B[0].statuses.push({
        id: 'existing-evasion', name: 'Existing Evasion', harmful: false,
        durationActions: null, evadeChancePercent: 50,
    });
    game = enact(game, action('A', 0, 'clefable-disarming-voice', 'B', 0));
    assert.equal(game.teams.A[1].statuses.some((status) => status.fullBlind), false);
    assert.equal(game.teams.B[0].statuses.some((status) => status.evadeChancePercent), false);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'clefable-disarming-voice-field'),
        true
    );

    ready(game, 'B');
    game = enact(game, action('B', 0, 'pidgey-whirlwind', 'B', 0));
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'pidgey-whirlwind'), false);
    game = pass(game);

    ready(game, 'B');
    game = enact(game, action('B', 0, 'pidgey-sand-attack', 'A', 1));
    assert.equal(game.teams.A[1].statuses.some((status) => status.id === 'pidgey-sand-attack'), false);
    game = pass(game);
    assert.equal(
        game.teams.A[0].statuses.some((status) => status.id === 'clefable-disarming-voice-field'),
        false
    );

    ready(game, 'B');
    game.teams.B[0].cooldowns = {};
    game = enact(game, action('B', 0, 'pidgey-whirlwind', 'B', 0));
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'pidgey-whirlwind'), true);
});

test('Rare Candy evolves Clefairy, grants tracked defense, and preserves its HP', () => {
    const rareCandyTeams = {
        A: ['pokemon-trainer', 'clefairy', 'bulbasaur'],
        B: ['pidgey', 'chansey', 'koffing'],
    };
    let game = createGame({ seed: 1289, teams: rareCandyTeams });
    game.teams.A[1].hp = 40;
    game = enact(game, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));
    assert.equal(game.teams.A[1].form, 'clefable');
    assert.equal(game.teams.A[1].hp, 40);
    assert.equal(game.teams.A[1].shield, 25);
    assert.deepEqual(unitPresentation(game.teams.A[1]).skillIds, ROSTER.clefairy.forms.clefable.skillIds);
});
