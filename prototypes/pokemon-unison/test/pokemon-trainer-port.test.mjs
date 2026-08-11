import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyAction,
    createGame,
    exportReplay,
    replay,
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

function readyPlayer(state, player = 'A') {
    state.currentPlayer = player;
    state.winner = null;
    state.energy[player] = {
        [Energy.TAIJUTSU]: 10,
        [Energy.NINJUTSU]: 10,
        [Energy.BLOODLINE]: 10,
        [Energy.GENJUTSU]: 10,
    };
    return state;
}

const trainerTeams = {
    A: ['pokemon-trainer', 'charmander', 'squirtle'],
    B: ['pidgey', 'zubat', 'chansey'],
};

test('Pokemon Trainer exposes all eight source skills and a deterministic weighted ball each turn', () => {
    const trainer = ROSTER['pokemon-trainer'];
    assert.equal(trainer.skills.length, 8);
    assert.deepEqual(trainer.forms.base.skillIds, [
        'pokemon-trainer-pokeball',
        'pokemon-trainer-potion',
        'pokemon-trainer-x-stats',
        'pokemon-trainer-rare-candy',
    ]);

    const game = createGame({ seed: 14336, teams: trainerTeams });
    assert.equal(unitPresentation(game.teams.A[0]).skillIds[0], 'pokemon-trainer-master-ball');
    const reproduced = replay(exportReplay(game));
    assert.equal(reproduced.ok, true, reproduced.error);
    assert.deepEqual(reproduced.state, game);
});

test('Pokeball contains a healthy target but captures a disabled target at the boosted threshold', () => {
    let game = createGame({ seed: 0, teams: trainerTeams });
    game.teams.B[0].hp = 50;
    game = enact(game, action('A', 0, 'pokemon-trainer-pokeball', 'B', 0));
    assert.equal(game.teams.B[0].alive, true);
    assert.equal(game.teams.B[0].banished, false);
    assert.equal(game.teams.B[0].statuses.some((status) => status.id === 'stunned'), true);
    assert.match(validateAction(
        game,
        action('B', 0, 'pidgey-gust', 'A', 0)
    ), /cannot use skills/i);

    game = createGame({ seed: 0, teams: trainerTeams });
    game.teams.B[0].hp = 20;
    game.teams.B[0].statuses.push({
        id: 'test-paralysis',
        name: 'Paralyzed',
        durationActions: 3,
        paralyzeCooldowns: true,
    });
    game = enact(game, action('A', 0, 'pokemon-trainer-pokeball', 'B', 0));
    assert.equal(game.teams.B[0].banished, true);
    assert.equal(game.teams.B[0].alive, false);
    assert.equal(game.teams.A[0].effectiveSpeciesId, 'pidgey');
});

test('capture copies the target current form and Master Ball bypasses reflection and invulnerability', () => {
    let game = createGame({ seed: 14336, teams: trainerTeams });
    game.teams.B[0].form = 'pidgeotto';
    game.teams.B[0].statuses.push({
        id: 'test-invulnerable',
        name: 'Invulnerable',
        durationActions: 3,
        invulnerable: true,
    });
    game.teams.A[0].statuses.push({
        id: 'test-reflect',
        name: 'Reflect',
        durationActions: 3,
        reflectNextOwnerUseSkill: true,
        reflectOnlyHarmfulSkills: true,
    });
    game = enact(game, action('A', 0, 'pokemon-trainer-master-ball', 'B', 0));

    const trainer = game.teams.A[0];
    assert.equal(game.teams.B[0].banished, true);
    assert.equal(trainer.effectiveSpeciesId, 'pidgey');
    assert.equal(trainer.effectiveForm, 'pidgeotto');
    assert.equal(unitPresentation(trainer).name, 'Pidgeotto');
    assert.deepEqual(unitPresentation(trainer).skillIds, ROSTER.pidgey.forms.pidgeotto.skillIds);
});

test('Potion enforces its two-use match limit', () => {
    let game = createGame({ seed: 0, teams: trainerTeams });
    game.teams.A[1].hp = 10;
    for (let use = 0; use < 2; use += 1) {
        readyPlayer(game);
        delete game.teams.A[0].cooldowns['pokemon-trainer-potion'];
        game = enact(game, action('A', 0, 'pokemon-trainer-potion', 'A', 1));
    }
    readyPlayer(game);
    delete game.teams.A[0].cooldowns['pokemon-trainer-potion'];
    assert.equal(game.teams.A[1].hp, 70);
    assert.equal(
        validateAction(game, action('A', 0, 'pokemon-trainer-potion', 'A', 1)),
        'That skill has no uses remaining.'
    );
});

test('X-Stats alternates Physical and Special stacks and grants flat damage reduction', () => {
    let game = createGame({ seed: 0, teams: trainerTeams });
    readyPlayer(game);
    game = enact(game, action('A', 0, 'pokemon-trainer-x-stats', 'A', 1));
    let physical = game.teams.A[1].statuses.find(
        (status) => status.id === 'pokemon_trainer_x_stats_physical_buff'
    );
    assert.equal(physical.nonAfflictionDamageBonusFlat, 5);
    assert.equal(physical.damageReductionFlat, 5);
    assert.equal(physical.damageBonusBySkillClass.Physical, 5);

    game = enact(game, action('B', 1, 'zubat-bite', 'A', 1));
    assert.equal(game.teams.A[1].hp, 85);

    readyPlayer(game);
    delete game.teams.A[0].cooldowns['pokemon-trainer-x-stats'];
    game = enact(game, action('A', 0, 'pokemon-trainer-x-stats', 'A', 1));
    assert.equal(
        game.teams.A[1].statuses.find(
            (status) => status.id === 'pokemon_trainer_x_stats_special_buff'
        ).damageBonusBySkillClass.Special,
        5
    );

    readyPlayer(game);
    delete game.teams.A[0].cooldowns['pokemon-trainer-x-stats'];
    game = enact(game, action('A', 0, 'pokemon-trainer-x-stats', 'A', 1));
    physical = game.teams.A[1].statuses.find(
        (status) => status.id === 'pokemon_trainer_x_stats_physical_buff'
    );
    assert.equal(physical.nonAfflictionDamageBonusFlat, 10);
    assert.equal(physical.damageReductionFlat, 10);
    assert.equal(physical.damageBonusBySkillClass.Physical, 10);
});

test('Rare Candy force-evolves and empowers an ally, then permanently becomes Revive', () => {
    let game = createGame({ seed: 0, teams: trainerTeams });
    game.teams.A[1].hp = 50;
    readyPlayer(game);
    game = enact(game, action('A', 0, 'pokemon-trainer-rare-candy', 'A', 1));

    assert.equal(game.teams.A[1].form, 'charmeleon');
    assert.equal(game.teams.A[1].hp, 60);
    assert.equal(game.teams.A[1].shield, 25);
    assert.equal(
        unitPresentation(game.teams.A[0]).skillIds.includes('pokemon-trainer-revive'),
        true
    );

    game.teams.A[2].hp = 0;
    game.teams.A[2].alive = false;
    readyPlayer(game);
    game = enact(game, action('A', 0, 'pokemon-trainer-revive', 'A', 2));
    assert.equal(game.teams.A[2].alive, true);
    assert.equal(game.teams.A[2].hp, 30);
});

test('Revive rejects captured allies while still allowing ordinary defeated allies', () => {
    const game = createGame({ seed: 0, teams: trainerTeams });
    game.teams.A[0].statuses.push({
        id: 'pokemon-trainer-rare-candy-swap',
        name: 'Revive Ready',
        durationActions: null,
        skillReplacements: { 'pokemon-trainer-rare-candy': 'pokemon-trainer-revive' },
    });
    game.teams.A[2].hp = 0;
    game.teams.A[2].alive = false;
    game.teams.A[2].banished = true;
    assert.equal(
        validateAction(game, action('A', 0, 'pokemon-trainer-revive', 'A', 2)),
        'A captured Pokemon is no longer a legal target.'
    );
});
