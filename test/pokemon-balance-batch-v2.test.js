const assert = require('node:assert/strict');
const test = require('node:test');

const characters = require('../characters');
const {
    applyStatus,
    buildInitialBoard,
    computeTargetOptions,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
} = require('../battleLogic');

const byId = (id) => {
    const character = characters.find((entry) => entry.id === id);
    assert.ok(character, `Missing character ${id}`);
    return character;
};

const skill = (character, id) => {
    const entry = character.skills.find((candidate) => candidate.id === id);
    assert.ok(entry, `Missing skill ${id}`);
    return entry;
};

const createMatch = ({ leftTeam, rightTeam }) => {
    const players = [
        { username: 'Left', team: leftTeam },
        { username: 'Right', team: rightTeam },
    ];
    return {
        players,
        board: buildInitialBoard(players, characters),
        chakraPools: {
            Left: { taijutsu: 10, ninjutsu: 10, genjutsu: 10, bloodline: 10 },
            Right: { taijutsu: 10, ninjutsu: 10, genjutsu: 10, bloodline: 10 },
        },
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { Left: 1, Right: 1 } },
    };
};

const queueSkill = ({ match, username, actorSlot, skillIndex, targetSelection = [] }) => {
    match.pendingTurns[username] = {
        queueOrder: [String(actorSlot)],
        queuedByActorSlot: {
            [actorSlot]: { skillIndex, targetSelection },
        },
    };
    resolvePendingTurnSkills({ match, actingUsername: username, characters });
};

test('Pokemon Trainer has the new odds, item limits, and defeated-only Revive', () => {
    const trainer = byId('pokemon-trainer');
    const potion = skill(trainer, 'pokemon-trainer-potion');
    const revive = skill(trainer, 'pokemon-trainer-revive');
    const cycle = trainer.startStatuses[0].metadata.turnStartApplyRandomSkillReplacementToOwner;
    assert.deepEqual(cycle.options.map((option) => option.weight), [8, 6, 5, 1]);
    assert.deepEqual(potion.energy, ['Random']);
    assert.equal(potion.cooldown, 1);
    assert.equal(potion.maxUses, 2);
    assert.equal(revive.target, 'dead-ally-first');
    assert.deepEqual(revive.effects.map((effect) => effect.type), ['revive']);

    const match = createMatch({
        leftTeam: [characters.indexOf(trainer), characters.indexOf(byId('hitmonchan'))],
        rightTeam: [characters.indexOf(byId('mewtwo'))],
    });
    match.board.Left[0].state.statuses.push({
        id: 'test_revive_swap',
        remainingTurns: 99,
        metadata: { skillReplacements: { 'pokemon-trainer-rare-candy': 'pokemon-trainer-revive' } },
    });
    const index = trainer.skills.findIndex((entry) => entry.id === 'pokemon-trainer-rare-candy');
    assert.deepEqual(computeTargetOptions({
        match, actingUsername: 'Left', actorSlot: 0, skillIndex: index, characters,
    }).targets, []);
    match.board.Left[1].alive = false;
    match.board.Left[1].hp = 0;
    assert.deepEqual(computeTargetOptions({
        match, actingUsername: 'Left', actorSlot: 0, skillIndex: index, characters,
    }).targets.map((target) => target.slot), [1]);
});

test('X-Stats alternates Physical, Special, then Physical', () => {
    const trainer = byId('pokemon-trainer');
    const match = createMatch({
        leftTeam: [characters.indexOf(trainer), characters.indexOf(byId('hitmonchan'))],
        rightTeam: [characters.indexOf(byId('mewtwo'))],
    });
    const skillIndex = trainer.skills.findIndex((entry) => entry.id === 'pokemon-trainer-x-stats');
    const use = () => {
        queueSkill({
            match, username: 'Left', actorSlot: 0, skillIndex,
            targetSelection: [{ username: 'Left', slot: 1 }],
        });
        match.board.Left[0].state.cooldowns = {};
        match.chakraPools.Left = { taijutsu: 10, ninjutsu: 10, genjutsu: 10, bloodline: 10 };
        match.economy.turnCounts.Left += 1;
    };
    use();
    assert.equal(match.board.Left[1].state.statuses.find(
        (status) => status.id === 'pokemon_trainer_x_stats_physical_buff'
    ).metadata.damageBonusBySkillClass.Physical, 5);
    use();
    assert.equal(match.board.Left[1].state.statuses.find(
        (status) => status.id === 'pokemon_trainer_x_stats_special_buff'
    ).metadata.damageBonusBySkillClass.Special, 5);
    use();
    assert.equal(match.board.Left[1].state.statuses.find(
        (status) => status.id === 'pokemon_trainer_x_stats_physical_buff'
    ).metadata.damageBonusBySkillClass.Physical, 10);
});

test('Double Team kill rewards add exactly one turn to the existing duration', () => {
    const state = { statuses: [] };
    applyStatus({
        targetState: state,
        statusId: 'scyther_double_team_active',
        duration: 2,
        metadata: { evadeChancePercent: 100 },
    });
    applyStatus({
        targetState: state,
        statusId: 'scyther_double_team_active',
        duration: 1,
        metadata: {
            addToExistingDuration: 1,
            evadeChancePercent: 100,
        },
    });
    assert.equal(state.statuses[0].remainingTurns, 3);
    assert.equal(state.statuses[0].metadata.addToExistingDuration, undefined);
});

