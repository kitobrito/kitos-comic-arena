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

test('Ekans evolves into Arbok after Crunch confirms an execution', () => {
    const ekans = byId('ekans');
    const mewtwo = byId('mewtwo');
    const match = createMatch({
        leftTeam: [characters.indexOf(ekans)],
        rightTeam: [characters.indexOf(mewtwo)],
    });
    match.board.Right[0].hp = 25;
    const crunchIndex = ekans.skills.findIndex((entry) => entry.id === 'ekans-crunch');

    queueSkill({
        match,
        username: 'Left',
        actorSlot: 0,
        skillIndex: crunchIndex,
        targetSelection: [{ username: 'Right', slot: 0 }],
    });

    assert.equal(match.board.Right[0].alive, false);
    const evolution = match.board.Left[0].state.statuses.find(
        (status) => status.id === 'ekans_arbok_evolution'
    );
    assert.ok(evolution);
    assert.equal(
        evolution.metadata.skillReplacements['ekans-crunch'],
        'arbok-crunch'
    );
});

test('Ekans does not evolve when Crunch damage is prevented from killing', () => {
    const ekans = byId('ekans');
    const onix = byId('onix');
    const match = createMatch({
        leftTeam: [characters.indexOf(ekans)],
        rightTeam: [characters.indexOf(onix)],
    });
    match.board.Right[0].hp = 25;
    const crunchIndex = ekans.skills.findIndex((entry) => entry.id === 'ekans-crunch');

    queueSkill({
        match,
        username: 'Left',
        actorSlot: 0,
        skillIndex: crunchIndex,
        targetSelection: [{ username: 'Right', slot: 0 }],
    });

    assert.equal(match.board.Right[0].alive, true);
    assert.equal(match.board.Right[0].hp, 1);
    assert.equal(
        match.board.Left[0].state.statuses.some(
            (status) => status.id === 'ekans_arbok_evolution'
        ),
        false
    );
});

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

test('evolution thresholds and Koffing, Scyther, Hitmonchan values are updated', () => {
    const pidgey = byId('pidgey').startStatuses.find(
        (status) => status.statusId === 'pidgey_evolution_tracker'
    ).metadata;
    const gastly = byId('gastly').startStatuses.find(
        (status) => status.statusId === 'gastly_evolution_tracker'
    ).metadata;
    assert.equal(pidgey.applyStatusAtStack.value, 50);
    assert.equal(gastly.applyStatusAtStack.value, 35);

    const koffing = byId('koffing');
    assert.deepEqual(skill(koffing, 'koffing-smokescreen').energy, ['Random']);
    assert.deepEqual(skill(koffing, 'koffing-weezing-smokescreen').energy, ['Random', 'Random']);

    const scyther = byId('scyther');
    const fury = skill(scyther, 'scyther-fury-cutter').effects.find(
        (effect) => effect.condition?.statusId === 'scyther_swords_dance_active'
    );
    assert.equal(fury.metadata.onSuccessfulDamageApplyStatusToOwner.metadata.stackDelta, 2);
    const xCutter = skill(scyther, 'scyther-x-cutter').effects.find(
        (effect) => effect.metadata?.repeatCastOnSuccessfulChance
    );
    assert.equal(xCutter.metadata.repeatCastOnSuccessfulChance.targetCurrentHpAtMost, 50);
    const doubleTeam = skill(scyther, 'scyther-double-team');
    assert.equal(doubleTeam.cooldown, 5);
    assert.equal(doubleTeam.effects[0].duration, 2);
    assert.equal(doubleTeam.effects[0].metadata.onOwnerKillApplyStatusToSelf.duration, 1);
    assert.equal(
        doubleTeam.effects[0].metadata.onOwnerKillApplyStatusToSelf.metadata.addToExistingDuration,
        1
    );

    const hitmonchan = byId('hitmonchan');
    assert.ok(skill(hitmonchan, 'hitmonchan-thunder-punch').effects.some(
        (effect) => effect.scope === 'other-enemies' && effect.amount === 5
    ));
    assert.equal(skill(hitmonchan, 'hitmonchan-fire-punch').effects.find(
        (effect) => effect.statusId === 'hitmonchan_fire_punch_burn'
    ).metadata.turnEndDamage, 5);
    assert.equal(skill(hitmonchan, 'hitmonchan-ice-punch').effects.find(
        (effect) => effect.statusId === 'hitmonchan_ice_punch_cooldown_increase'
    ).metadata.newSkillCooldownIncrease, 2);
    assert.equal(skill(hitmonchan, 'hitmonchan-mega-punch').effects[0].amount, 15);
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

test('Machop evolves on the second Bulk Up and Machoke has reworked skills', () => {
    const machop = byId('machop');
    const match = createMatch({
        leftTeam: [characters.indexOf(machop)],
        rightTeam: [characters.indexOf(byId('mewtwo'))],
    });
    const bulkIndex = machop.skills.findIndex((entry) => entry.id === 'machop-bulk-up');
    queueSkill({ match, username: 'Left', actorSlot: 0, skillIndex: bulkIndex });
    assert.equal(match.board.Left[0].state.statuses.some(
        (status) => status.id === 'machop_machoke_evolution'
    ), false);
    match.board.Left[0].state.cooldowns = {};
    match.chakraPools.Left = { taijutsu: 10, ninjutsu: 10, genjutsu: 10, bloodline: 10 };
    match.economy.turnCounts.Left += 1;
    queueSkill({ match, username: 'Left', actorSlot: 0, skillIndex: bulkIndex });
    assert.ok(match.board.Left[0].state.statuses.some(
        (status) => status.id === 'machop_machoke_evolution'
    ));
    assert.equal(resolveEffectiveSkill({
        characters,
        rosterIndex: characters.indexOf(machop),
        skillIndex: bulkIndex,
        actorState: match.board.Left[0].state,
    }).id, 'machoke-bulk-up');

    const brick = skill(machop, 'machoke-brick-break');
    const counter = skill(machop, 'machoke-counter');
    const bulk = skill(machop, 'machoke-bulk-up');
    assert.deepEqual(brick.energy, ['Ninjutsu', 'Random']);
    assert.equal(brick.effects.find((effect) => effect.type === 'damage').amount, 35);
    assert.deepEqual(counter.energy, ['Ninjutsu']);
    assert.equal(counter.cooldown, 3);
    assert.equal(counter.effects[0].metadata.counterDamageMultiplier, 2);
    assert.deepEqual(bulk.energy, ['Random']);
    assert.equal(bulk.cooldown, 2);
    assert.equal(bulk.effects[0].metadata.destructibleDefensePoints, 15);
    assert.equal(
        brick.effects.some((effect) => effect.type === 'apply_status' && effect.statusId.includes('stun')),
        false,
        'Machoke Brick Break should not carry a dead/unreachable stun effect'
    );
});

test('Machoke Brick Break does not stun its target even with Bulk Up active', () => {
    const machop = byId('machop');
    const match = createMatch({
        leftTeam: [characters.indexOf(machop)],
        rightTeam: [characters.indexOf(byId('hitmonchan'))],
    });
    const bulkIndex = machop.skills.findIndex((entry) => entry.id === 'machop-bulk-up');
    queueSkill({ match, username: 'Left', actorSlot: 0, skillIndex: bulkIndex });
    match.board.Left[0].state.cooldowns = {};
    match.chakraPools.Left = { taijutsu: 10, ninjutsu: 10, genjutsu: 10, bloodline: 10 };
    match.economy.turnCounts.Left += 1;
    queueSkill({ match, username: 'Left', actorSlot: 0, skillIndex: bulkIndex });
    assert.ok(match.board.Left[0].state.statuses.some(
        (status) => status.id === 'machop_machoke_evolution'
    ));

    match.board.Left[0].state.cooldowns = {};
    match.chakraPools.Left = { taijutsu: 10, ninjutsu: 10, genjutsu: 10, bloodline: 10 };
    match.economy.turnCounts.Left += 1;
    const brickIndex = machop.skills.findIndex((entry) => entry.id === 'machop-brick-break');
    queueSkill({
        match, username: 'Left', actorSlot: 0, skillIndex: brickIndex,
        targetSelection: [{ username: 'Right', slot: 0 }],
    });

    assert.equal(
        match.board.Right[0].state.statuses.some((status) => Boolean(status?.metadata?.cannotUseSkillClasses)),
        false,
        'Brick Break should not apply a stun status to its target'
    );
    assert.equal(match.board.Right[0].hp, 100 - 35 - 20);
});

test('Brick Break gets its break bonus and Counter cancels damaging skills', () => {
    const machop = byId('machop');
    const hitmonchan = byId('hitmonchan');
    const machopIndex = characters.indexOf(machop);
    const enemyIndex = characters.indexOf(hitmonchan);
    const brickIndex = machop.skills.findIndex((entry) => entry.id === 'machop-brick-break');
    const counterIndex = machop.skills.findIndex((entry) => entry.id === 'machop-counter');
    const punchIndex = hitmonchan.skills.findIndex((entry) => entry.id === 'hitmonchan-mega-punch');

    const shielded = createMatch({ leftTeam: [machopIndex], rightTeam: [enemyIndex] });
    applyStatus({
        targetState: shielded.board.Right[0].state,
        targetUnit: shielded.board.Right[0],
        statusId: 'test_destructible_defense',
        duration: 99,
        metadata: { destructibleDefensePoints: 20, infiniteDuration: true },
    });
    queueSkill({
        match: shielded, username: 'Left', actorSlot: 0, skillIndex: brickIndex,
        targetSelection: [{ username: 'Right', slot: 0 }],
    });
    assert.equal(shielded.board.Right[0].hp, 70);

    const countered = createMatch({ leftTeam: [machopIndex], rightTeam: [enemyIndex] });
    queueSkill({
        match: countered, username: 'Left', actorSlot: 0, skillIndex: counterIndex,
        targetSelection: [{ username: 'Right', slot: 0 }],
    });
    queueSkill({
        match: countered, username: 'Right', actorSlot: 0, skillIndex: punchIndex,
        targetSelection: [{ username: 'Left', slot: 0 }],
    });
    assert.equal(countered.board.Left[0].hp, 100);
    assert.equal(countered.board.Right[0].hp, 85);
});
